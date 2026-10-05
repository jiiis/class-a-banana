import { GROUND, LEVEL_W } from "./config.js";

// Solid platforms you can stand on (and drop through with S). x,y = top-left, one-way from below.
export const platforms = [
  { x: 380, y: 360, w: 150, h: 14, kind: "crates" },
  { x: 900, y: 320, w: 180, h: 14, kind: "balcony" },
  { x: 1500, y: 370, w: 130, h: 14, kind: "crates" },
  { x: 1760, y: 290, w: 200, h: 14, kind: "balcony" },
  { x: 2350, y: 350, w: 160, h: 14, kind: "crates" },
  { x: 2800, y: 310, w: 190, h: 14, kind: "balcony" },
];

// Background buildings, generated once with a seeded pattern so they look the same every frame
export const buildings = [];
let x = -200;
let seed = 7;
const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
while (x < LEVEL_W + 400) {
  const w = 120 + r() * 160, h = 180 + r() * 220;
  buildings.push({ x, w, h, shade: ["#2a2d3a", "#343848", "#1f222c", "#3b3246"][Math.floor(r() * 4)], windows: Math.floor(r() * 3), sign: r() < 0.3, awning: r() < 0.4 });
  x += w + 10 + r() * 30;
}
export const lamps = [150, 650, 1200, 1700, 2200, 2700, 3100];
export const groundY = GROUND;
