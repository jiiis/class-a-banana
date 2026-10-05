// de_banana: a small two-site map. Each character is one cell.
//  . floor   # sandstone   = concrete   c crates   d doorway (open)   m metal   A/B bomb site floor   T terrorist spawn   C counter-terrorist spawn
const ROWS = [
  "########################",
  "#TTT..c.......#....=...#",
  "#TTT..c...#...#....=.c.#",
  "#.....c...#...d....=...#",
  "####d####.#...#....=BBB#",
  "#.......#.#...#####=BBB#",
  "#..cc...#.....#....=BBB#",
  "#..cc...####d##......=.#",
  "#.......#..........=...#",
  "#...#...#..mm......=...#",
  "#...#...#..mm..#########",
  "#...####.......#.......#",
  "#......d.......d...c...#",
  "#...#..#..#....#...c...#",
  "#...#..#..#....####d####",
  "#...####..#............#",
  "#.........#..###..#....#",
  "#..c......#..#....#.c..#",
  "#..c..##..#..#....#....#",
  "#.....##.....d....#AAA.#",
  "#.CCC.........#...#AAA.#",
  "#.CCC....mm...#...#AAA.#",
  "#.CCC....mm...#........#",
  "########################",
];
export const MAP_W = ROWS[0].length, MAP_H = ROWS.length;
export const WALLS = { "#": 1, "=": 2, "c": 3, "m": 5 };   // "d" doorways are open floor
export const grid = ROWS.map((r) => [...r].map((ch) => WALLS[ch] || 0));
export const siteA = [], siteB = [], tSpawn = [], ctSpawn = [];
ROWS.forEach((r, y) => [...r].forEach((ch, x) => {
  const p = { x: x + 0.5, y: y + 0.5 };
  if (ch === "A") siteA.push(p); if (ch === "B") siteB.push(p); if (ch === "T") tSpawn.push(p); if (ch === "C") ctSpawn.push(p);
}));
export const isWall = (x, y) => { const gx = Math.floor(x), gy = Math.floor(y); return gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H || grid[gy][gx] > 0; };
export const siteCenter = (site) => ({ x: site.reduce((a, p) => a + p.x, 0) / site.length, y: site.reduce((a, p) => a + p.y, 0) / site.length });

// Can you see from a to b without a wall in the way? (simple ray march)
export function lineOfSight(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), steps = Math.ceil(d * 8);
  for (let i = 1; i < steps; i++) { const t = i / steps; if (isWall(a.x + dx * t, a.y + dy * t)) return false; }
  return true;
}

// Breadth-first path over open cells from one cell to another. Returns the next cell centre to walk to.
export function nextStep(from, to) {
  const sx = Math.floor(from.x), sy = Math.floor(from.y), tx = Math.floor(to.x), ty = Math.floor(to.y);
  if (sx === tx && sy === ty) return to;
  const prev = new Map(), key = (x, y) => y * MAP_W + x, q = [[sx, sy]];
  prev.set(key(sx, sy), null);
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H || grid[ny][nx] || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), key(x, y)); q.push([nx, ny]);
    }
  }
  if (!prev.has(key(tx, ty))) return null;
  let cur = key(tx, ty), p = prev.get(cur);
  while (p !== null && p !== key(sx, sy)) { cur = p; p = prev.get(cur); }
  return { x: (cur % MAP_W) + 0.5, y: Math.floor(cur / MAP_W) + 0.5 };
}
