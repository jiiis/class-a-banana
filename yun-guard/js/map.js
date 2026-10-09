import { W, H, ROWS, COLS, CELL, ROAD_WIDTH } from "./config.js";
import { rng, dist, closestPointOnPath, clamp } from "./util.js";

// The generated world. Filled in by generateMap() before anything else runs.
export const map = {
  seed: 0,
  path: [],        // the main road's corner points, from off-screen at its entry edge to off-screen at its exit edge
  paths: [],       // every route monsters can take (1 or 2); the main road is paths[0]
  routes: [],      // each route as grid cells plus its entry/exit edge
  entries: [],     // where each route enters the map (one signpost each)
  spots: [],       // where towers can be built
  rivers: [],      // each: { points, width } - winding streams across the grass
  ponds: [],       // small still pools on the grass: { x, y, rx, ry, wobble[] }
  bridges: [],     // where the road crosses a river: { x, y, angle, span }
  deco: [],        // trees, rocks, bushes, flowers
  critters: [],    // animal home spots
  entry: null,     // where the signpost goes
  castle: null,    // the main road's castle (castles[0])
  exits: [],       // gates where the roads leave the map: { x, y, out }
  castles: [],     // one castle per exit: { x, y, scale, style } - style 0 is grey stone, 1 is a sandstone palace
  exit: null,      // last point of the road
};

// Roads keep to the middle rows, leaving the same two-cell margin at the top and the bottom. The margins are
// drawn exactly like the rest of the map (grass, rivers, ponds, scenery, weather) and give tall towers room.
const ROAD_MIN_ROW = 2, ROAD_MAX_ROW = ROWS - 3;
// The same margin on the left and right: roads only bend in the middle columns, and cross the margins as
// straight entries and exits that run to the edge of the map.
const ROAD_MIN_COL = 2, ROAD_MAX_COL = COLS - 3;

export function generateMap(seed) {
  const rand = rng(seed);
  map.seed = seed;

  const main = generateMainRoute(rand);
  map.routes = [main];
  map.path = cellsToWaypoints(main.cells);
  map.exit = map.path[map.path.length - 1];
  map.paths = [map.path];

  // Usually a second route. It can fork off the main road and rejoin it, come in from its own
  // entrance and merge, fork off and leave by its own exit, or be a completely separate road.
  let allCells = main.cells;
  if (rand() < 0.85) {
    const kinds = [forkAndRejoin, separateEntry, forkToExit, separateRoute];
    shuffle(kinds, rand);
    for (const make of kinds) {
      const second = make(main, rand);
      if (second) { map.routes.push(second); map.paths.push(cellsToWaypoints(second.cells)); allCells = [...main.cells, ...second.cells]; break; }
    }
  }

  // One signpost per distinct entrance, standing beside the road where it enters the map
  map.entries = [];
  for (const r of map.routes) {
    if (!r.entry || map.entries.some((e) => e.edge === r.entry.edge && e.pos === r.entry.pos)) continue;
    const c0 = center(r.cells[0]), inn = INWARD[r.entry.edge];
    const road = { rx: c0.x + inn.dc * 44, ry: c0.y + inn.dr * 44, inn: { x: inn.dc, y: inn.dr } };            // where the road crosses the edge (for the lair decoration)
    map.entries.push(inn.dr === 0
      ? { x: c0.x + inn.dc * 46, y: c0.y + 62, face: inn, edge: r.entry.edge, pos: r.entry.pos, ...road }                // side entry: sign below the road
      : { x: c0.x + (c0.x < W / 2 ? 62 : -62), y: c0.y + inn.dr * 50 + 10, face: inn, edge: r.entry.edge, pos: r.entry.pos, ...road });   // top/bottom entry: sign beside it
  }
  map.entry = map.entries[0];

  // A castle guards every exit, standing in the margin beside the road where it leaves the map
  const exits = [];
  for (const r of map.routes) if (r.exit && !exits.some((e) => e.edge === r.exit.edge && e.pos === r.exit.pos)) exits.push(r.exit);
  // Gates mark the exits: where the road leaves the map, facing outward
  map.exits = exits.map((ex) => { const c = center(edgeCell(ex.edge, ex.pos)), inn = INWARD[ex.edge]; return { edge: ex.edge, pos: ex.pos, x: c.x + inn.dc * 108, y: c.y + inn.dr * 108, out: { x: -inn.dc, y: -inn.dr } }; });   // the gate stands where the margin begins
  const two = exits.length > 1, fullScale = two ? 0.9 : 1.05;
  // How much grass is around a castle of size sc at (x, y)? The least distance from its walls to any road.
  const roomAround = (x, y, sc) => {
    const hw = 52 * sc, top = y - 96 * sc, bot = y + 12 * sc;
    let best = Infinity;
    for (let i = 0; i <= 6; i++) for (const [px, py] of [[x - hw + (2 * hw * i) / 6, top], [x - hw + (2 * hw * i) / 6, bot], [x - hw, top + ((bot - top) * i) / 6], [x + hw, top + ((bot - top) * i) / 6]]) best = Math.min(best, roadDistance({ x: px, y: py }));
    return best;
  };
  const gatePillarPoints = (g) => { const px = -g.out.y, py = g.out.x, span = ROAD_WIDTH / 2 + 14; return [{ x: g.x + px * span, y: g.y + py * span }, { x: g.x - px * span, y: g.y - py * span }]; };
  const gateClear = (x, y, sc) => map.exits.every((g) => gatePillarPoints(g).every((pp) => Math.abs(pp.x - x) > 52 * sc + 14 || pp.y < y - 96 * sc - 10 || pp.y > y + 12 * sc + 60));
  // Enough room around it first (a road's width of grass), then as close to its own road as possible, full size preferred
  const score = (o) => (gateClear(o.x, o.y, o.sc) ? 0 : -1000) + Math.min(roomAround(o.x, o.y, o.sc), 70) + (o.pref ? 10 : 0) - o.d * 0.08 + o.sc * 45;   // bigger is better when the room is similar
  // Each castle picks, from spots along its edge on both sides of the road (and a smaller size if it must),
  // the one with the most open grass, leaning away from a sister castle on the same edge when both are fine
  map.castles = exits.map((ex, i) => {
    const c = center(edgeCell(ex.edge, ex.pos));
    const other = exits.find((o) => o !== ex && o.edge === ex.edge);
    const options = [];
    for (const sc of [fullScale, 0.82, 0.68, 0.58]) {
      const yLo = 118 * sc + 12, yHi = H - 14 * sc - 12, xLo = 52 * sc + 12, xHi = W - 52 * sc - 12;   // banner and drawbridge stay off the edges
      if (ex.edge === "right" || ex.edge === "left") {
        const x = ex.edge === "right" ? xHi : xLo;
        const oy = other ? center(edgeCell(other.edge, other.pos)).y : null;
        for (const d of [66, 126, 186, 246, 306]) {
          options.push({ x, y: clamp(c.y - d, yLo, yHi), pref: oy === null || c.y < oy, d, sc });
          options.push({ x, y: clamp(c.y + d + 80, yLo, yHi), pref: oy === null || c.y > oy, d, sc });
        }
      } else {
        const y = ex.edge === "top" ? yLo : yHi;
        const ox = other ? center(edgeCell(other.edge, other.pos)).x : null;
        for (const d of [124, 184, 244, 304, 364]) {
          options.push({ x: clamp(c.x - d, xLo, xHi), y, pref: ox === null || c.x < ox, d, sc });
          options.push({ x: clamp(c.x + d, xLo, xHi), y, pref: ox === null || c.x > ox, d, sc });
        }
      }
    }
    const best = options.sort((p, q) => score(q) - score(p))[0];
    return { x: best.x, y: best.y, scale: best.sc, style: i };
  });
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
  const count = roll < 0.1 ? 0 : roll < 0.45 ? 1 : roll < 0.8 ? 2 : 3;      // a big world usually has a river or two
  for (let n = 0; n < count; n++) {
    for (let attempt = 0; attempt < 240; attempt++) {
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
      const base = 26 + rand() * 20, p1 = rand() * 6, p2 = rand() * 6, f1 = 0.35 + rand() * 0.3, f2 = 0.9 + rand() * 0.6;
      pts.forEach((p, i) => {
        const wave = 0.5 + 0.5 * Math.sin(i * f1 + p1);
        const ripple = 0.5 + 0.5 * Math.sin(i * f2 + p2);
        p.w = base * (0.45 + 1.0 * wave * 0.75 + ripple * 0.35) + (rand() - 0.5) * 5;
      });
      const pools = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < pools; k++) {                            // a pool: the river balloons out over a few points
        const at = 3 + Math.floor(rand() * (pts.length - 6)), bulge = 22 + rand() * 26;
        for (let i = -3; i <= 3; i++) if (pts[at + i]) pts[at + i].w += bulge * Math.exp(-i * i / 2.2);
      }
      for (let pass = 0; pass < 2; pass++) for (let i = 1; i < pts.length - 1; i++) pts[i].w = (pts[i - 1].w + pts[i].w + pts[i + 1].w) / 3;
      pts.forEach((p) => { p.w = Math.max(10, Math.min(96, p.w)); });
      const river = { points: pts, width: Math.max(...pts.map((p) => p.w)) };   // width = the widest point (used for clearances)
      // Wherever the water so much as touches the road there must be a bridge. Walk along the river,
      // note every stretch that comes within reach of the road, and reject rivers that run alongside
      // the road at a shallow angle (they would need an endless bridge).
      const bridges = [], nearMisses = [];
      let shallow = false;
      for (let i = 0; i < pts.length - 1 && !shallow; i++) {
        const a = pts[i], b = pts[i + 1], len = dist(a, b);
        const tx = (b.x - a.x) / len, ty = (b.y - a.y) / len;
        for (let d = 0; d < len; d += 6) {
          const p = { x: a.x + tx * d, y: a.y + ty * d }, w = a.w + (b.w - a.w) * (d / len);
          const q = nearestRoadPoint(p);
          if (q.d > ROAD_WIDTH / 2 + w / 2 + 6) {
            if (q.d < ROAD_WIDTH / 2 + w / 2 + 36) nearMisses.push(q);   // brushing past the road without crossing it
            continue;
          }
          const cross = Math.abs(tx * q.ny - ty * q.nx);              // sin of the angle between river and road
          if (cross < 0.5) { shallow = true; break; }
          const near = bridges.find((bg) => dist(bg, q) < 50);
          if (near) { near.n++; near.span = Math.max(near.span, w + 24); }
          else bridges.push({ x: q.x, y: q.y, angle: Math.atan2(q.ny, q.nx), span: w + 24, n: 1 });
        }
      }
      if (shallow) continue;
      // A river may hug the road only right where it crosses (the bridge approaches); anywhere else it must keep its distance
      if (nearMisses.some((q) => !bridges.some((bg) => dist(bg, q) < 80))) continue;
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
  const want = rand() < 0.15 ? 0 : 1 + Math.floor(rand() * 4);
  for (let attempt = 0; attempt < 160 && map.ponds.length < want; attempt++) {
    const p = { x: 60 + rand() * (W - 120), y: 60 + rand() * (H - 120), seed: Math.floor(rand() * 1e6) };
    // The pond grows to fit the open ground around it: a small pool squeezed between roads, a lake in a wide meadow
    const riverRoom = map.rivers.length ? Math.min(...map.rivers.map((r) => closestPointOnPath(r.points, p).d - r.width / 2)) : Infinity;
    const room = Math.min(roadDistance(p), riverRoom, ...map.castles.map((k) => dist(p, k) - 60 * k.scale), ...map.entries.map((e) => dist(p, e) - 40), ...map.ponds.map((q) => dist(p, q) - q.rx - 30));
    const rx = Math.min(170, (room - 72) * 1.0);                            // keeps a clear bank of grass between the water and the road
    if (rx < 30) continue;                                                   // no puddles: too cramped here, try elsewhere
    p.rx = rx * (0.85 + rand() * 0.15); p.ry = p.rx * (0.55 + rand() * 0.2);
    // A gently irregular outline: a radius factor for each of 12 directions
    p.wobble = Array.from({ length: 12 }, () => 0.82 + rand() * 0.36);
    map.ponds.push(p);
  }
}

// ---------- Roads ----------
// Roads enter and leave through any of the four edges. Each route is a chain of grid cells: two straight
// margin cells at the entry, a winding walk through the middle, and two straight margin cells at the exit.
const center = (cell) => ({ x: cell.c * CELL + CELL / 2, y: cell.r * CELL + CELL / 2 });
const key = (c, r) => c * 100 + r;
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const EDGES = ["left", "right", "top", "bottom"];
const INWARD = { left: { dc: 1, dr: 0 }, right: { dc: -1, dr: 0 }, top: { dc: 0, dr: 1 }, bottom: { dc: 0, dr: -1 } };
// A position along an edge runs over the interior rows (side edges) or interior columns (top and bottom)
const edgePositions = (edge) => (edge === "left" || edge === "right" ? [ROAD_MIN_ROW, ROAD_MAX_ROW] : [ROAD_MIN_COL, ROAD_MAX_COL]);
const edgeCell = (edge, pos) => edge === "left" ? { c: 0, r: pos } : edge === "right" ? { c: COLS - 1, r: pos } : edge === "top" ? { c: pos, r: 0 } : { c: pos, r: ROWS - 1 };
const stepCell = (cell, d, n = 1) => ({ c: cell.c + d.dc * n, r: cell.r + d.dr * n });
// The straight run through the margin: edge cell and the one after it; the walk starts two cells in
const marginCells = (edge, pos) => { const e = edgeCell(edge, pos), inn = INWARD[edge]; return [e, stepCell(e, inn)]; };
const interiorCell = (edge, pos) => stepCell(edgeCell(edge, pos), INWARD[edge], 2);
const inInterior = (c, r) => c >= ROAD_MIN_COL && c <= ROAD_MAX_COL && r >= ROAD_MIN_ROW && r <= ROAD_MAX_ROW;
const isStraight = (cells, i) => i > 0 && i < cells.length - 1 && ((cells[i - 1].c === cells[i + 1].c) || (cells[i - 1].r === cells[i + 1].r));
const randomEdgePos = (rand, edge) => { const [lo, hi] = edgePositions(edge); return lo + Math.floor(rand() * (hi - lo + 1)); };
const touches = (cell, set) => NEIGHBOURS.some(([dc, dr]) => set.has(key(cell.c + dc, cell.r + dr)));

// A random walk through the interior from `start` toward `goal` that never touches itself, other roads
// (except where allowed) or reserved cells. Weak bias wanders; strong bias heads straight there.
//   avoid: cells of other roads   allowedNear: cells it may touch   reserved: cells it must stay clear of
//   includeGoal: finish on the goal cell itself (otherwise next to it)
function walk(rand, start, goal, { avoid = [], allowedNear = [], reserved = [], includeGoal = false, bias = 3, minLen = 3, attempts = 300 }) {
  const avoidSet = new Set(avoid.map((c) => key(c.c, c.r)));
  const allowed = new Set(allowedNear.map((c) => key(c.c, c.r)));
  const reservedSet = new Set(reserved.map((c) => key(c.c, c.r)));
  const goalKey = key(goal.c, goal.r);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const used = new Set([key(start.c, start.r), ...reserved.map((c) => key(c.c, c.r))]);
    const walked = [];
    let cur = start, lastMove = null, straight = 0;
    for (let step = 0; step < 90; step++) {
      const nextToGoal = NEIGHBOURS.some(([dc, dr]) => cur.c + dc === goal.c && cur.r + dr === goal.r);
      if (nextToGoal) {                                                        // arrived (too early counts as a failed attempt)
        if (walked.length < minLen) break;
        if (includeGoal) walked.push(goal);
        return walked;
      }
      const moves = NEIGHBOURS.filter(([dc, dr]) => {
        const c = cur.c + dc, r = cur.r + dr, k = key(c, r);
        if (!inInterior(c, r) || used.has(k) || avoidSet.has(k)) return false;
        if (k === goalKey) return false;                                       // only finish via the check above
        for (const [ac, ar] of NEIGHBOURS) {                                   // never touch a road sideways
          const nc = c + ac, nr = r + ar, nk = key(nc, nr);
          if (nc === cur.c && nr === cur.r) continue;
          if (nk === goalKey) continue;
          if (used.has(nk) || reservedSet.has(nk)) return false;
          if (avoidSet.has(nk) && !(allowed.has(nk) && walked.length === 0)) return false;   // may touch the fork cell only on the first step
        }
        return true;
      }).map(([dc, dr]) => {
        const c = cur.c + dc, r = cur.r + dr;
        const closer = Math.abs(goal.c - c) + Math.abs(goal.r - r) < Math.abs(goal.c - cur.c) + Math.abs(goal.r - cur.r);
        let w = closer ? bias : 1;
        if (lastMove && dc === lastMove[0] && dr === lastMove[1] && straight >= 2) w *= 0.3;   // long straights are boring
        return [dc, dr, w];
      });
      if (!moves.length) break;
      const total = moves.reduce((s, m) => s + m[2], 0);
      let pick = rand() * total, move = moves[0];
      for (const m of moves) { pick -= m[2]; if (pick <= 0) { move = m; break; } }
      straight = lastMove && move[0] === lastMove[0] && move[1] === lastMove[1] ? straight + 1 : 1;
      lastMove = move;
      cur = { c: cur.c + move[0], r: cur.r + move[1] };
      used.add(key(cur.c, cur.r));
      walked.push(cur);
    }
  }
  return null;
}

// The main road: in through one edge, a long wander, out through a different edge. To spread the road over
// the whole map it first heads for a detour point well away from the straight line between entry and exit,
// and a map is only accepted when the road visits every quarter of the middle block.
function generateMainRoute(rand) {
  const midC = (ROAD_MIN_COL + ROAD_MAX_COL) / 2, midR = (ROAD_MIN_ROW + ROAD_MAX_ROW) / 2;
  for (let attempt = 0; attempt < 300; attempt++) {
    const entryEdge = EDGES[Math.floor(rand() * 4)];
    const others = EDGES.filter((e) => e !== entryEdge);
    const exitEdge = others[Math.floor(rand() * others.length)];
    const entry = { edge: entryEdge, pos: randomEdgePos(rand, entryEdge) }, exit = { edge: exitEdge, pos: randomEdgePos(rand, exitEdge) };
    const start = interiorCell(entry.edge, entry.pos), goal = interiorCell(exit.edge, exit.pos);
    if (start.c === goal.c && start.r === goal.r) continue;
    // A detour point on the far side of the map from the start-to-goal line
    const dx = goal.c - start.c, dy = goal.r - start.r, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const side = (midC - start.c) * nx + (midR - start.r) * ny >= 0 ? 1 : -1;      // toward the centre
    const detour = {
      c: Math.round(Math.min(ROAD_MAX_COL - 1, Math.max(ROAD_MIN_COL + 1, (start.c + goal.c) / 2 + nx * side * 4 + (rand() - 0.5) * 4))),
      r: Math.round(Math.min(ROAD_MAX_ROW - 1, Math.max(ROAD_MIN_ROW + 1, (start.r + goal.r) / 2 + ny * side * 3 + (rand() - 0.5) * 2))),
    };
    const reserved = [...marginCells(entry.edge, entry.pos), ...marginCells(exit.edge, exit.pos)];
    const first = walk(rand, start, detour, { reserved, includeGoal: true, bias: 1.6, minLen: 6, attempts: 20 });
    if (!first) continue;
    const sofar = [start, ...first];
    const second = walk(rand, detour, goal, { avoid: sofar.slice(0, -1), reserved, includeGoal: true, bias: 1.6, minLen: 6, attempts: 20 });
    if (!second) continue;
    const cells = [...marginCells(entry.edge, entry.pos), ...sofar, ...second, ...marginCells(exit.edge, exit.pos).reverse()];
    if (cells.length < 34) continue;
    // The road must visit every one of six blocks (3 across, 2 down) of the middle, so no big area is left empty
    const bw = (ROAD_MAX_COL - ROAD_MIN_COL + 1) / 3, bh = (ROAD_MAX_ROW - ROAD_MIN_ROW + 1) / 2;
    const blocks = new Set(cells.filter((c) => inInterior(c.c, c.r)).map((c) => Math.floor((c.c - ROAD_MIN_COL) / bw) + 3 * Math.floor((c.r - ROAD_MIN_ROW) / bh)));
    if (blocks.size < 6) continue;
    return { cells, entry, exit };
  }
  // Fallback: a plain left-to-right zigzag (practically never needed)
  const cells = [...Array(COLS)].map((_, c) => ({ c, r: 4 + (c >= 2 && c <= 13 && c % 4 < 2 ? 0 : 1) }));
  return { cells, entry: { edge: "left", pos: cells[0].r }, exit: { edge: "right", pos: cells[COLS - 1].r } };
}

// A fresh entrance or exit for a second route: a different spot on any edge, clear of the main road
function freeEdgeSpot(rand, main, avoid) {
  const mainSet = new Set(main.cells.map((c) => key(c.c, c.r)));
  for (let attempt = 0; attempt < 30; attempt++) {
    const edge = EDGES[Math.floor(rand() * 4)], pos = randomEdgePos(rand, edge);
    if (avoid.some((a) => a.edge === edge && Math.abs(a.pos - pos) < 3)) continue;
    const cells = [...marginCells(edge, pos), interiorCell(edge, pos)];
    if (cells.some((c) => mainSet.has(key(c.c, c.r)) || touches(c, mainSet))) continue;
    return { edge, pos };
  }
  return null;
}
// Interior indices of the main road (skipping the margin cells at both ends)
const interiorRange = (cells) => [2, cells.length - 3];

// Second route A: leaves the main road at a straight stretch and rejoins it further on
function forkAndRejoin(main, rand) {
  const { cells } = main, [lo, hi] = interiorRange(cells);
  for (let attempt = 0; attempt < 80; attempt++) {
    const i = lo + Math.floor(rand() * Math.floor((hi - lo) * 0.5));
    const j = i + 6 + Math.floor(rand() * Math.max(1, hi - i - 6));
    if (j > hi || !isStraight(cells, i) || !isStraight(cells, j)) continue;
    const walked = walk(rand, cells[i], cells[j], { avoid: cells, allowedNear: [cells[i], cells[j]], attempts: 60 });
    if (!walked) continue;
    return { cells: [...cells.slice(0, i + 1), ...walked, ...cells.slice(j)], entry: main.entry, exit: main.exit };
  }
  return null;
}

// Second route B: comes in through its own entrance and merges into the main road
function separateEntry(main, rand) {
  const { cells } = main, [lo, hi] = interiorRange(cells);
  for (let attempt = 0; attempt < 40; attempt++) {
    const entry = freeEdgeSpot(rand, main, [main.entry, main.exit]);
    if (!entry) continue;
    const j = lo + 2 + Math.floor(rand() * Math.max(1, hi - lo - 4));
    if (!isStraight(cells, j)) continue;
    const start = interiorCell(entry.edge, entry.pos);
    const walked = walk(rand, start, cells[j], { avoid: cells, allowedNear: [cells[j]], reserved: marginCells(entry.edge, entry.pos), attempts: 60 });
    if (!walked) continue;
    return { cells: [...marginCells(entry.edge, entry.pos), start, ...walked, ...cells.slice(j)], entry, exit: main.exit };
  }
  return null;
}

// Second route C: leaves the main road and heads for its own exit
function forkToExit(main, rand) {
  const { cells } = main, [lo, hi] = interiorRange(cells);
  for (let attempt = 0; attempt < 40; attempt++) {
    const exit = freeEdgeSpot(rand, main, [main.entry, main.exit]);
    if (!exit) continue;
    const i = lo + Math.floor(rand() * Math.floor((hi - lo) * 0.7));
    if (!isStraight(cells, i)) continue;
    const goal = interiorCell(exit.edge, exit.pos);
    const walked = walk(rand, cells[i], goal, { avoid: cells, allowedNear: [cells[i]], reserved: marginCells(exit.edge, exit.pos), includeGoal: true, attempts: 60 });
    if (!walked) continue;
    return { cells: [...cells.slice(0, i + 1), ...walked, ...marginCells(exit.edge, exit.pos).reverse()], entry: main.entry, exit };
  }
  return null;
}

// Second route D: a completely separate road with its own entrance and exit
function separateRoute(main, rand) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const entry = freeEdgeSpot(rand, main, [main.entry, main.exit]);
    const exit = entry && freeEdgeSpot(rand, main, [main.entry, main.exit, entry]);
    if (!entry || !exit) continue;
    const start = interiorCell(entry.edge, entry.pos), goal = interiorCell(exit.edge, exit.pos);
    if (start.c === goal.c && start.r === goal.r) continue;
    const walked = walk(rand, start, goal, { avoid: main.cells, reserved: [...marginCells(entry.edge, entry.pos), ...marginCells(exit.edge, exit.pos)], includeGoal: true, attempts: 60 });
    if (!walked) continue;
    return { cells: [...marginCells(entry.edge, entry.pos), start, ...walked, ...marginCells(exit.edge, exit.pos).reverse()], entry, exit };
  }
  return null;
}

// Distance from p to the nearest road, counting every route
export function roadDistance(p) {
  return Math.min(...map.paths.map((path) => closestPointOnPath(path, p).d));
}

function cellsToWaypoints(cells) {
  const pts = cells.map(center);
  const first = pts[0], second = pts[1], last = pts[pts.length - 1], before = pts[pts.length - 2];
  // Off-screen start, first cell, every corner, last cell, off-screen end
  const out = [{ x: first.x + Math.sign(first.x - second.x) * 70, y: first.y + Math.sign(first.y - second.y) * 70 }, first];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const straightOn = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
    if (!straightOn) out.push(b);                                            // keep corners only
  }
  out.push(last, { x: last.x + Math.sign(last.x - before.x) * 70, y: last.y + Math.sign(last.y - before.y) * 70 });
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
      if (!inInterior(c, r)) continue;                                     // no building in any margin
      const nextToRoad = NEIGHBOURS.some(([dc, dr]) => road.has(key(c + dc, r + dr)));
      if (!nextToRoad) continue;
      const p = center({ c, r });
      // Keep clear of the castle's whole footprint (it is tall) and the signposts
      if (map.castles.some((k) => { const cdx = p.x - k.x, cdy = p.y - k.y; return Math.abs(cdx) < 92 * k.scale && cdy > -135 * k.scale && cdy < 42 * k.scale; })) continue;
      if (map.entries.some((e) => dist(p, e) < 55 || dist(p, { x: e.rx, y: e.ry }) < 78)) continue;   // not on the signpost or the lair stakes
      if (map.exits.some((g) => dist(p, g) < 78)) continue;                                        // not on the exit gate
      if (nearWater(p, 30)) continue;                                        // no building in the water
      candidates.push(p);
    }
  }
  shuffle(candidates, rand);
  const spots = [];
  for (const p of candidates) {
    if (spots.length >= 20) break;
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
  let placed = 0;                                                        // scenery pieces placed on their own (woods add extra trees)
  for (let i = 0; i < 700 && placed < 48; i++) {
    const p = { x: 20 + rand() * (W - 40), y: 20 + rand() * (H - 40) };
    if (!clear(p, { deco: 40 })) continue;
    placed++;
    const roll = rand();
    const type = roll < 0.32 ? "tree" : roll < 0.5 ? "bush" : roll < 0.63 ? "rock" : roll < 0.85 ? "flower" : roll < 0.93 ? "mushroom" : "stump";
    // Every piece of scenery gets its own look: a variant, a size and a seed for its small random details
    const size = type === "flower" ? 0.5 + rand() * 0.25 : type === "mushroom" ? 0.55 + rand() * 0.25 : type === "stump" ? 0.6 + rand() * 0.2 : 0.8 + rand() * 0.5;   // small things stay small
    out.push({ type, x: p.x, y: p.y, s: size, variant: Math.floor(rand() * 3), seed: Math.floor(rand() * 1e6) });
    // Company: trees often come as a small wood of 2 to 4, flowers as a patch of 3 to 7
    const group = type === "tree" && rand() < 0.55 ? { n: 2 + Math.floor(rand() * 3), near: 28, far: 62, gap: 22, s: () => 0.75 + rand() * 0.5 }
      : type === "flower" && rand() < 0.75 ? { n: 3 + Math.floor(rand() * 5), near: 10, far: 34, gap: 8, s: () => 0.45 + rand() * 0.3 } : null;
    if (group) {
      for (let k = 0, tries = 0; k < group.n && tries < 24; tries++) {
        const a = rand() * Math.PI * 2, d = group.near + rand() * (group.far - group.near);
        const q = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.7 };
        if (q.x < 20 || q.x > W - 20 || q.y < 20 || q.y > H - 20 || !clear(q, { deco: group.gap })) continue;
        out.push({ type, x: q.x, y: q.y, s: group.s(), variant: Math.floor(rand() * 3), seed: Math.floor(rand() * 1e6) });
        k++;
      }
    }
  }
  return out;
}

// A random handful of animals: how many and which kinds changes every map.
const ANIMAL_ODDS = [["bunny", 0.28], ["sheep", 0.24], ["chicken", 0.18], ["deer", 0.15], ["fox", 0.15]];

function placeCritters(rand) {
  const out = [];
  map.critters = out;
  const count = 5 + Math.floor(rand() * 6);                        // 5 to 10 animals
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
