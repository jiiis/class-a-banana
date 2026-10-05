import { W, H, ROWS, COLS, CELL, ROAD_WIDTH } from "./config.js";
import { rng, dist, closestPointOnPath } from "./util.js";

// The generated world. Filled in by generateMap() before anything else runs.
export const map = {
  seed: 0,
  path: [],        // the main road's corner points, from off-screen left to off-screen right
  paths: [],       // every route monsters can take (1 or 2); the main road is paths[0]
  entries: [],     // where each route enters the map (one signpost each)
  spots: [],       // where towers can be built
  rivers: [],      // each: { points, width } - winding streams across the grass
  ponds: [],       // small still pools on the grass: { x, y, rx, ry, wobble[] }
  bridges: [],     // where the road crosses a river: { x, y, angle, span }
  deco: [],        // trees, rocks, bushes, flowers
  critters: [],    // animal home spots
  entry: null,     // where the signpost goes
  castle: null,    // the main road's castle (castles[0])
  castles: [],     // one castle per exit: { x, y, scale, style } - style 0 is grey stone, 1 is a sandstone palace
  exit: null,      // last point of the road
};

export function generateMap(seed) {
  const rand = rng(seed);
  map.seed = seed;

  const cells = generatePathCells(rand);
  map.path = cellsToWaypoints(cells);
  map.exit = map.path[map.path.length - 1];
  map.paths = [map.path];

  // Usually a second route. It can fork off the main road and rejoin it, come in from its own
  // entrance and merge, fork off and leave by its own exit, or be a completely separate road.
  let allCells = cells;
  if (rand() < 0.85) {
    // Try the route kinds in a random order until one fits around the main road
    const kinds = [forkAndRejoin, separateEntry, forkToExit, separateRoute];
    shuffle(kinds, rand);
    for (const make of kinds) {
      const second = make(cells, rand);
      if (second) { map.paths.push(cellsToWaypoints(second)); allCells = [...cells, ...second]; break; }
    }
  }

  // One signpost per distinct entrance, standing on the near side of the road so monsters pass behind it
  const starts = [...new Set(map.paths.map((p) => p[0].y))];
  map.entries = starts.map((y) => ({ x: 40, y: y + 62 }));
  map.entry = map.entries[0];
  // A castle guards every exit. With one exit it sits above the road if there is room, otherwise below.
  // With two exits each gets its own (smaller) castle in a distinct style, placed on whichever side is free.
  const exitYs = [...new Set(map.paths.map((p) => p[p.length - 1].y))];
  if (exitYs.length === 1) {
    const endY = exitYs[0];
    map.castles = [{ x: 915, y: endY > 300 ? endY - 45 : endY + 130, scale: 1, style: 0 }];
  } else {
    const lo = Math.min(...exitYs), hi = Math.max(...exitYs), gap = hi - lo;
    map.castles = exitYs.map((ye, i) => {
      let above;
      if (ye === lo) above = ye >= 200 || gap < 170;          // upper exit: above unless there is room below before the other road
      else above = ye > 430 && gap >= 150;                     // lower exit: below unless that runs off the map
      return { x: 915, y: above ? ye - 40 : ye + 110, scale: 0.8, style: i };
    });
  }
  map.castle = map.castles[0];

  makeRivers(rand);
  makePonds(rand);
  map.spots = pickSpots(allCells, rand);
  map.deco = scatterDeco(rand);
  map.critters = placeCritters(rand);
  return map;
}

// ---------- Rivers ----------
// Zero, one or two streams wander across the map. Where the road crosses one, a bridge is built.
function makeRivers(rand) {
  map.rivers = [];
  map.bridges = [];
  const roll = rand();
  const count = roll < 0.3 ? 0 : roll < 0.8 ? 1 : 2;
  for (let n = 0; n < count; n++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const vertical = rand() < 0.5;
      const pts = [];
      // Meandering course: a slow S-curve plus random wander, sampled closely so bends are smooth
      const meanderAmp = 40 + rand() * 50, meanderFreq = 0.08 + rand() * 0.1, meanderPhase = rand() * 6;
      if (vertical) {
        let x = 120 + rand() * (W - 240);
        for (let y = -30; y <= H + 30; y += 30) { x = Math.max(60, Math.min(W - 60, x + (rand() - 0.5) * 36)); pts.push({ x: x + Math.sin(y * meanderFreq + meanderPhase) * meanderAmp * 0.3, y }); }
      } else {
        let y = 80 + rand() * (H - 160);
        for (let x = -30; x <= W + 30; x += 30) { y = Math.max(60, Math.min(H - 60, y + (rand() - 0.5) * 36)); pts.push({ x, y: y + Math.sin(x * meanderFreq + meanderPhase) * meanderAmp * 0.3 }); }
      }
      for (let pass = 0; pass < 3; pass++)                         // smooth the bends
        for (let i = 1; i < pts.length - 1; i++) pts[i] = { x: (pts[i - 1].x + pts[i].x + pts[i + 1].x) / 3, y: (pts[i - 1].y + pts[i].y + pts[i + 1].y) / 3 };
      const tooClose = pts.some((p) => map.castles.some((k) => dist(p, k) < 95) || map.entries.some((e) => dist(p, e) < 60))
        || map.rivers.some((r) => pts.some((p) => closestPointOnPath(r.points, p).d < 80));
      if (tooClose) continue;
      // Width changes a lot along the course: narrow rapids, broad slow stretches, and one or two pond-like pools
      const base = 16 + rand() * 8, p1 = rand() * 6, p2 = rand() * 6, f1 = 0.35 + rand() * 0.3, f2 = 0.9 + rand() * 0.6;
      pts.forEach((p, i) => {
        const wave = 0.5 + 0.5 * Math.sin(i * f1 + p1);
        const ripple = 0.5 + 0.5 * Math.sin(i * f2 + p2);
        p.w = base * (0.45 + 1.0 * wave * 0.75 + ripple * 0.35) + (rand() - 0.5) * 5;
      });
      const pools = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < pools; k++) {                            // a pool: the river balloons out over a few points
        const at = 3 + Math.floor(rand() * (pts.length - 6)), bulge = 14 + rand() * 14;
        for (let i = -3; i <= 3; i++) if (pts[at + i]) pts[at + i].w += bulge * Math.exp(-i * i / 2.2);
      }
      for (let pass = 0; pass < 2; pass++) for (let i = 1; i < pts.length - 1; i++) pts[i].w = (pts[i - 1].w + pts[i].w + pts[i + 1].w) / 3;
      pts.forEach((p) => { p.w = Math.max(8, Math.min(52, p.w)); });
      const river = { points: pts, width: Math.max(...pts.map((p) => p.w)) };   // width = the widest point (used for clearances)
      // Wherever the water so much as touches the road there must be a bridge. Walk along the river,
      // note every stretch that comes within reach of the road, and reject rivers that run alongside
      // the road at a shallow angle (they would need an endless bridge).
      const bridges = [];
      let shallow = false;
      for (let i = 0; i < pts.length - 1 && !shallow; i++) {
        const a = pts[i], b = pts[i + 1], len = dist(a, b);
        const tx = (b.x - a.x) / len, ty = (b.y - a.y) / len;
        for (let d = 0; d < len; d += 6) {
          const p = { x: a.x + tx * d, y: a.y + ty * d }, w = a.w + (b.w - a.w) * (d / len);
          const q = nearestRoadPoint(p);
          if (q.d > ROAD_WIDTH / 2 + w / 2 + 6) continue;
          const cross = Math.abs(tx * q.ny - ty * q.nx);              // sin of the angle between river and road
          if (cross < 0.5) { shallow = true; break; }
          const near = bridges.find((bg) => dist(bg, q) < 50);
          if (near) { near.n++; near.span = Math.max(near.span, w + 24); }
          else bridges.push({ x: q.x, y: q.y, angle: Math.atan2(q.ny, q.nx), span: w + 24, n: 1 });
        }
      }
      if (shallow) continue;
      map.rivers.push(river);
      map.bridges.push(...bridges);
      break;
    }
  }
}

// Closest point on any road to p, plus the direction (nx, ny) of the road there
function nearestRoadPoint(p) {
  let best = null;
  for (const path of map.paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
      const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
      const q = { x: a.x + dx * u, y: a.y + dy * u };
      const d = dist(p, q);
      if (!best || d < best.d) { const l = Math.sqrt(l2); best = { ...q, d, nx: dx / l, ny: dy / l }; }
    }
  }
  return best;
}

const nearRiver = (p, extra) => map.rivers.some((r) => closestPointOnPath(r.points, p).d < r.width / 2 + extra);
// Inside (or within `extra` of) a pond: measured as a stretched distance from its centre
const inPond = (p, pond, extra) => Math.hypot((p.x - pond.x), (p.y - pond.y) * (pond.rx / pond.ry)) < pond.rx + extra;
const nearWater = (p, extra) => nearRiver(p, extra) || map.ponds.some((q) => inPond(p, q, extra));

// ---------- Ponds ----------
// Up to three small ponds on open grass, well away from roads, rivers, castles and signposts.
function makePonds(rand) {
  map.ponds = [];
  const want = rand() < 0.25 ? 0 : 1 + Math.floor(rand() * 3);
  for (let attempt = 0; attempt < 120 && map.ponds.length < want; attempt++) {
    const rx = 18 + rand() * 16, ry = rx * (0.55 + rand() * 0.2);
    const p = { x: 60 + rand() * (W - 120), y: 60 + rand() * (H - 120), rx, ry, seed: Math.floor(rand() * 1e6) };
    if (roadDistance(p) < rx + 44) continue;
    if (nearRiver(p, rx + 24)) continue;
    if (map.castles.some((k) => dist(p, k) < 120 * k.scale) || map.entries.some((e) => dist(p, e) < rx + 60)) continue;
    if (map.ponds.some((q) => dist(p, q) < p.rx + q.rx + 40)) continue;
    // A gently irregular outline: a radius factor for each of 12 directions
    p.wobble = Array.from({ length: 12 }, () => 0.82 + rand() * 0.36);
    map.ponds.push(p);
  }
}

// ---------- Road ----------
// A random walk on a grid from the left edge to the right edge. The road may
// never touch itself, which keeps a strip of grass between every bend.
function generatePathCells(rand) {
  const key = (c, r) => c * 100 + r;
  for (let attempt = 0; attempt < 300; attempt++) {
    const start = { c: 0, r: 1 + Math.floor(rand() * (ROWS - 3)) };
    const cells = [start];
    const used = new Set([key(start.c, start.r)]);
    let cur = start, lastMove = null, straight = 0, ok = false;

    while (cells.length < 70) {
      if (cur.c === COLS - 1) { ok = true; break; }
      const moves = [[1, 0, 2.6], [0, -1, 2.4], [0, 1, 2.4], [-1, 0, 0.8]].filter(([dc, dr]) => {
        const c = cur.c + dc, r = cur.r + dr;
        if (c < 0 || c >= COLS || r < 1 || r > ROWS - 2) return false;
        if (cur.c >= COLS - 2 && dc !== 1) return false;                   // the last stretch runs straight out, leaving room for the castle
        if (used.has(key(c, r))) return false;
        for (const [ac, ar] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {         // no touching other road cells
          const nc = c + ac, nr = r + ar;
          if (nc === cur.c && nr === cur.r) continue;
          if (used.has(key(nc, nr))) return false;
        }
        return true;
      });
      if (!moves.length) break;
      // Long straight stretches are boring: after 2 cells, prefer to turn
      const weighted = moves.map(([dc, dr, w]) => [dc, dr, lastMove && dc === lastMove[0] && dr === lastMove[1] && straight >= 2 ? w * 0.2 : w]);
      const total = weighted.reduce((s, m) => s + m[2], 0);
      let pick = rand() * total, move = weighted[0];
      for (const m of weighted) { pick -= m[2]; if (pick <= 0) { move = m; break; } }
      straight = lastMove && move[0] === lastMove[0] && move[1] === lastMove[1] ? straight + 1 : 1;
      lastMove = move;
      cur = { c: cur.c + move[0], r: cur.r + move[1] };
      cells.push(cur);
      used.add(key(cur.c, cur.r));
    }
    if (ok && cells.length >= 28) return cells;
  }
  // Fallback: a simple zigzag (practically never needed)
  return [...Array(COLS)].map((_, c) => ({ c, r: 4 + (c % 4 < 2 ? 0 : 2) }));
}

const center = (cell) => ({ x: cell.c * CELL + CELL / 2, y: cell.r * CELL + CELL / 2 });
const key = (c, r) => c * 100 + r;
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Is the cell at index i a straight stretch of the road (not a corner)?
const isStraight = (cells, i) => i > 0 && i < cells.length - 1 && ((cells[i - 1].c === cells[i + 1].c) || (cells[i - 1].r === cells[i + 1].r));

// A goal-seeking random walk that never touches the main road (except where allowed) or itself.
// Returns the cells walked (excluding the start), ending on a cell next to the goal, or null.
function walkTowards(rand, start, goal, mainCells, allowedNear, includeGoal = false) {
  const main = new Set(mainCells.map((c) => key(c.c, c.r)));
  const allowed = new Set(allowedNear.map((c) => key(c.c, c.r)));
  for (let attempt = 0; attempt < 150; attempt++) {
    const used = new Set([key(start.c, start.r)]);
    const walked = [];
    let cur = start;
    for (let step = 0; step < 50; step++) {
      // Done when we stand right next to the goal cell (and have gone somewhere first). An exit goal must be entered straight from the left.
      if (walked.length >= 3 && NEIGHBOURS.some(([dc, dr]) => cur.c + dc === goal.c && cur.r + dr === goal.r)) {
        if (!includeGoal) return walked;
        if (cur.c + 1 === goal.c && cur.r === goal.r) return [...walked, goal];
      }
      const moves = NEIGHBOURS.filter(([dc, dr]) => {
        const c = cur.c + dc, r = cur.r + dr;
        if (c < 0 || c >= COLS || r < 1 || r > ROWS - 2) return false;
        if (cur.c >= COLS - 2 && dc !== 1) return false;                   // keep the castle's ground clear
        if (used.has(key(c, r)) || main.has(key(c, r))) return false;
        for (const [ac, ar] of NEIGHBOURS) {                           // no touching the main road or ourselves
          const nc = c + ac, nr = r + ar, k = key(nc, nr);
          if (nc === cur.c && nr === cur.r) continue;
          if (main.has(k) && !allowed.has(k)) return false;
          if (used.has(k)) return false;
        }
        return true;
      }).map(([dc, dr]) => {
        const c = cur.c + dc, r = cur.r + dr;
        const closer = Math.abs(goal.c - c) + Math.abs(goal.r - r) < Math.abs(goal.c - cur.c) + Math.abs(goal.r - cur.r);
        return [dc, dr, (closer ? 3 : 1) * (dc < 0 ? 0.5 : 1)];
      });
      if (!moves.length) break;
      const total = moves.reduce((s, m) => s + m[2], 0);
      let pick = rand() * total, move = moves[0];
      for (const m of moves) { pick -= m[2]; if (pick <= 0) { move = m; break; } }
      cur = { c: cur.c + move[0], r: cur.r + move[1] };
      used.add(key(cur.c, cur.r));
      walked.push(cur);
    }
  }
  return null;
}

// Second route A: leaves the main road at a straight stretch and rejoins it further on
function forkAndRejoin(cells, rand) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const i = 2 + Math.floor(rand() * Math.floor(cells.length * 0.4));
    const j = i + 6 + Math.floor(rand() * Math.max(1, cells.length - i - 9));
    if (j >= cells.length - 2 || !isStraight(cells, i) || !isStraight(cells, j)) continue;
    const walked = walkTowards(rand, cells[i], cells[j], cells, [cells[i], cells[j]]);
    if (!walked) continue;
    return [...cells.slice(0, i + 1), ...walked, ...cells.slice(j)];
  }
  return null;
}

// Second route B: starts from its own place on the left edge and merges into the main road
function separateEntry(cells, rand) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const r0 = 1 + Math.floor(rand() * (ROWS - 3));
    if (Math.abs(r0 - cells[0].r) < 3) continue;
    const j = 4 + Math.floor(rand() * Math.max(1, cells.length - 8));
    if (!isStraight(cells, j)) continue;
    const start = { c: 0, r: r0 };
    const walked = walkTowards(rand, start, cells[j], cells, [cells[j]]);
    if (!walked) continue;
    return [start, ...walked, ...cells.slice(j)];
  }
  return null;
}

// A free cell on the right edge, well away from the main road's exit and not touching the main road
function pickExit(cells, rand) {
  const main = new Set(cells.map((c) => key(c.c, c.r)));
  const endR = cells[cells.length - 1].r;
  for (let attempt = 0; attempt < 20; attempt++) {
    const r1 = 1 + Math.floor(rand() * (ROWS - 3));
    if (Math.abs(r1 - endR) < 3) continue;
    const goal = { c: COLS - 1, r: r1 };
    if (main.has(key(goal.c, goal.r)) || NEIGHBOURS.some(([dc, dr]) => main.has(key(goal.c + dc, goal.r + dr)))) continue;
    return goal;
  }
  return null;
}

// Second route C: leaves the main road at a straight stretch and heads for its own exit on the right edge
function forkToExit(cells, rand) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const goal = pickExit(cells, rand);
    if (!goal) continue;
    const i = 2 + Math.floor(rand() * Math.floor(cells.length * 0.6));
    if (!isStraight(cells, i)) continue;
    const walked = walkTowards(rand, cells[i], goal, cells, [cells[i]], true);
    if (!walked) continue;
    return [...cells.slice(0, i + 1), ...walked];
  }
  return null;
}

// Second route D: a completely separate road with its own entrance and its own exit
function separateRoute(cells, rand) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const r0 = 1 + Math.floor(rand() * (ROWS - 3));
    if (Math.abs(r0 - cells[0].r) < 3) continue;
    const start = { c: 0, r: r0 };
    const main = new Set(cells.map((c) => key(c.c, c.r)));
    if (NEIGHBOURS.some(([dc, dr]) => main.has(key(start.c + dc, start.r + dr)))) continue;
    const goal = pickExit(cells, rand);
    if (!goal) continue;
    const walked = walkTowards(rand, start, goal, cells, [], true);
    if (!walked) continue;
    return [start, ...walked];
  }
  return null;
}

// Distance from p to the nearest road, counting every route
export function roadDistance(p) {
  return Math.min(...map.paths.map((path) => closestPointOnPath(path, p).d));
}

function cellsToWaypoints(cells) {
  const pts = cells.map(center);
  // Off-screen start, first cell, every corner, last cell, off-screen end
  const out = [{ x: -40, y: pts[0].y }, pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const straightOn = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
    if (!straightOn) out.push(b);                                            // keep corners only
  }
  out.push(pts[pts.length - 1], { x: W + 40, y: pts[pts.length - 1].y });
  return out;
}

// ---------- Build spots ----------
// Grass cells right next to the road, spread out so towers don't crowd.
function pickSpots(cells, rand) {
  const road = new Set(cells.map((c) => key(c.c, c.r)));
  const candidates = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (road.has(key(c, r))) continue;
      const nextToRoad = NEIGHBOURS.some(([dc, dr]) => road.has(key(c + dc, r + dr)));
      if (!nextToRoad) continue;
      const p = center({ c, r });
      // Keep clear of the castle's whole footprint (it is tall) and the signposts
      if (map.castles.some((k) => { const cdx = p.x - k.x, cdy = p.y - k.y; return Math.abs(cdx) < 92 * k.scale && cdy > -135 * k.scale && cdy < 42 * k.scale; })) continue;
      if (map.entries.some((e) => dist(p, e) < 55)) continue;
      if (nearWater(p, 30)) continue;                                        // no building in the water
      candidates.push(p);
    }
  }
  shuffle(candidates, rand);
  const spots = [];
  for (const p of candidates) {
    if (spots.length >= 12) break;
    if (spots.every((s) => dist(s, p) >= 100)) spots.push(p);
  }
  return spots;
}

// ---------- Scenery and animals ----------
function clear(p, { road = 50, spots = 48, castle = 85, entry = 50, deco = 0, critters = 0, river = 14 }) {
  return roadDistance(p) > road
    && !nearWater(p, river)
    && map.spots.every((s) => dist(s, p) > spots)
    && map.castles.every((k) => dist(p, k) > castle * k.scale) && map.entries.every((e) => dist(p, e) > entry)
    && map.deco.every((d) => dist(d, p) > deco)
    && map.critters.every((c) => dist(c, p) > critters);
}

function scatterDeco(rand) {
  const out = [];
  map.deco = out;
  for (let i = 0; i < 400 && out.length < 24; i++) {
    const p = { x: 20 + rand() * (W - 40), y: 20 + rand() * (H - 40) };
    if (!clear(p, { deco: 40 })) continue;
    const roll = rand();
    const type = roll < 0.32 ? "tree" : roll < 0.5 ? "bush" : roll < 0.63 ? "rock" : roll < 0.85 ? "flower" : roll < 0.93 ? "mushroom" : "stump";
    // Every piece of scenery gets its own look: a variant, a size and a seed for its small random details
    out.push({ type, x: p.x, y: p.y, s: 0.8 + rand() * 0.5, variant: Math.floor(rand() * 3), seed: Math.floor(rand() * 1e6) });
  }
  return out;
}

// A random handful of animals: how many and which kinds changes every map.
const ANIMAL_ODDS = [["bunny", 0.28], ["sheep", 0.24], ["chicken", 0.18], ["deer", 0.15], ["fox", 0.15]];

function placeCritters(rand) {
  const out = [];
  map.critters = out;
  const count = 3 + Math.floor(rand() * 5);                        // 3 to 7 animals
  for (let i = 0; i < 400 && out.length < count; i++) {
    const p = { x: 40 + rand() * (W - 80), y: 40 + rand() * (H - 80) };
    if (!clear(p, { road: 70, spots: 55, deco: 32, critters: 60, river: 50 })) continue;
    let roll = rand(), type = ANIMAL_ODDS[0][0];
    for (const [name, odds] of ANIMAL_ODDS) { roll -= odds; if (roll <= 0) { type = name; break; } }
    out.push({ type, x: p.x, y: p.y });
  }
  return out;
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
