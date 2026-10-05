export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Seeded random number generator so the scenery looks the same every time.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Closest point on the road to point p.
export function closestPointOnPath(path, p) {
  let best = null;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
    const q = { x: a.x + dx * u, y: a.y + dy * u };
    const d = dist(p, q);
    if (!best || d < best.d) best = { ...q, d };
  }
  return best;
}

// Evenly spaced points along the road, each with its sideways normal (nx, ny).
export function pointsAlongPath(path, step) {
  const pts = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    for (let d = 0; d < len; d += step) pts.push({ x: a.x + ux * d, y: a.y + uy * d, nx: -uy, ny: ux });
  }
  return pts;
}
