import { state } from "./state.js";
import { GROUND, GRAVITY } from "./config.js";
import { rnd, pick } from "./util.js";

export function blood(x, y, n, power = 1) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(60, 260) * power;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, r: rnd(1.5, 4), life: rnd(0.5, 1), maxLife: 1, color: pick(["#b71c1c", "#d32f2f", "#7f0000"]), kind: "blood" });
  }
}
export function gibs(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = rnd(-Math.PI, 0), s = rnd(120, 360);
    state.gibs.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, w: rnd(5, 12), h: rnd(4, 9), rot: rnd(0, 6), vr: rnd(-12, 12), life: rnd(2, 3.5), color: Math.random() < 0.5 ? color : "#b71c1c" });
  }
}
export function shell(x, y, dir) {
  state.particles.push({ x, y, vx: -dir * rnd(60, 140), vy: rnd(-220, -140), r: 1.6, life: 1.2, maxLife: 1.2, color: "#ffd54f", kind: "shell", rot: 0 });
}
export function flash(x, y, angle, size) {
  state.particles.push({ x, y, vx: 0, vy: 0, r: size, life: 0.06, maxLife: 0.06, color: "#fff59d", kind: "flash", angle });
}
export function puff(x, y, n = 3, color = "#9e9e9e") {
  for (let i = 0; i < n; i++) state.particles.push({ x: x + rnd(-6, 6), y, vx: rnd(-30, 30), vy: rnd(-40, -10), r: rnd(3, 6), life: 0.5, maxLife: 0.5, color, kind: "smoke" });
}
export function floater(x, y, text, color = "#fff", size = 16) { state.floaters.push({ x, y, text, color, size, life: 1 }); }

export function updateParticles(dt) {
  for (const p of state.particles) {
    p.life -= dt;
    if (p.kind === "flash") continue;
    if (p.kind !== "smoke") p.vy += GRAVITY * 0.6 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === "shell") p.rot += 14 * dt;
    if (p.y >= GROUND && p.kind === "blood") {                 // blood that lands leaves a stain on the pavement
      state.decals.push({ x: p.x, y: GROUND + rnd(0, 6), r: p.r * rnd(1.5, 3), color: p.color, life: 25 });
      p.life = 0;
    }
    if (p.y >= GROUND && p.kind === "shell") { p.y = GROUND; p.vy *= -0.4; p.vx *= 0.6; }
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const g of state.gibs) {
    g.life -= dt; g.vy += GRAVITY * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vr * dt;
    if (g.y >= GROUND) { g.y = GROUND; g.vy *= -0.35; g.vx *= 0.7; g.vr *= 0.5; if (Math.abs(g.vy) > 60) blood(g.x, g.y, 2, 0.4); }
  }
  state.gibs = state.gibs.filter((g) => g.life > 0);
  for (const f of state.floaters) { f.life -= dt; f.y -= 40 * dt; }
  state.floaters = state.floaters.filter((f) => f.life > 0);
  for (const d of state.decals) d.life -= dt;
  state.decals = state.decals.filter((d) => d.life > 0);
  if (state.decals.length > 400) state.decals.splice(0, state.decals.length - 400);
}
