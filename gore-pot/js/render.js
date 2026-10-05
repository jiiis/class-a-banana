import { state } from "./state.js";
import { W, H, GROUND, LEVEL_W, WEAPONS } from "./config.js";
import { platforms, buildings, lamps } from "./level.js";

export const canvas = document.getElementById("c");
export const ctx = canvas.getContext("2d");

const rect = (x, y, w, h, fill, stroke) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h); } };
const circle = (x, y, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const line = (x1, y1, x2, y2, color, lw = 2) => { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

export function draw() {
  const T = state.time;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Night sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0d1020"); sky.addColorStop(0.7, "#2a1f33"); sky.addColorStop(1, "#4a2a2a");
  rect(0, 0, W, H, sky);
  circle(W - 160 - state.camX * 0.02, 80, 34, "#fff3c4"); circle(W - 172 - state.camX * 0.02, 72, 30, "#0d1020");   // crescent moon
  for (let i = 0; i < 40; i++) { const sx = (i * 137.5 + 20) % W, sy = (i * 71.3) % 220; ctx.globalAlpha = 0.5 + Math.sin(T * 2 + i) * 0.4; circle(sx, sy, 1, "#fff"); }
  ctx.globalAlpha = 1;
  // Far buildings (parallax)
  const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0, shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
  ctx.save(); ctx.translate(-state.camX * 0.4 + shakeX * 0.3, 0);
  for (const b of buildings) {
    rect(b.x, GROUND - b.h, b.w, b.h, b.shade);
    for (let wy = GROUND - b.h + 18; wy < GROUND - 30; wy += 28) for (let wx = b.x + 12; wx < b.x + b.w - 14; wx += 22) {
      const lit = ((wx * 7 + wy * 13 + b.windows * 31) % 11) < 4;
      rect(wx, wy, 10, 14, lit ? (((wx + wy) % 3) ? "#ffe082" : "#ffcc80") : "#15161d");
    }
    if (b.sign) { rect(b.x + 10, GROUND - b.h + 40, b.w - 20, 22, "#5d1a1a", "#8d2a2a"); ctx.fillStyle = Math.sin(T * 3 + b.x) > -0.6 ? "#ff8a80" : "#8d2a2a"; ctx.font = "bold 13px Impact, sans-serif"; ctx.textAlign = "center"; ctx.fillText(["SAL'S", "PASTA", "BAR", "HOTEL", "CIGARS"][Math.floor(b.x / 97) % 5], b.x + b.w / 2, GROUND - b.h + 56); }
  }
  ctx.restore();
  // World
  ctx.save(); ctx.translate(-state.camX + shakeX, shakeY);
  // Pavement and road
  rect(-100, GROUND, LEVEL_W + 200, 26, "#5a5a60"); rect(-100, GROUND, LEVEL_W + 200, 3, "#8a8a90");
  rect(-100, GROUND + 26, LEVEL_W + 200, H - GROUND, "#2b2b30");
  for (let x = -100; x < LEVEL_W + 200; x += 70) rect(x, GROUND + 50, 36, 4, "#8a8450");
  for (let x = 0; x < LEVEL_W; x += 46) line(x, GROUND, x, GROUND + 26, "#4a4a50", 1);
  // Blood stains on the pavement
  for (const d of state.decals) { ctx.globalAlpha = Math.min(0.75, d.life / 5); ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.45, 0, 0, Math.PI * 2); ctx.fillStyle = d.color; ctx.fill(); }
  ctx.globalAlpha = 1;
  // Lamps
  for (const lx of lamps) {
    line(lx, GROUND, lx, GROUND - 150, "#3a3a40", 5); line(lx, GROUND - 150, lx + 22, GROUND - 158, "#3a3a40", 4);
    const g = ctx.createRadialGradient(lx + 24, GROUND - 156, 2, lx + 24, GROUND - 156, 90);
    g.addColorStop(0, "rgba(255,230,150,0.55)"); g.addColorStop(1, "rgba(255,230,150,0)");
    circle(lx + 24, GROUND - 156, 90, g); circle(lx + 24, GROUND - 158, 5, "#fff3c4");
  }
  // Platforms
  for (const pl of platforms) {
    if (pl.kind === "crates") {
      for (let x = pl.x; x < pl.x + pl.w; x += 50) { const w = Math.min(50, pl.x + pl.w - x); rect(x, pl.y, w, GROUND - pl.y, "#8d6e63", "#4e342e"); line(x + 4, pl.y + 4, x + w - 4, GROUND - 4, "#6d4c41", 2); line(x + w - 4, pl.y + 4, x + 4, GROUND - 4, "#6d4c41", 2); }
    } else {
      rect(pl.x, pl.y, pl.w, 10, "#3e3e46", "#1f1f24");
      for (let x = pl.x + 6; x < pl.x + pl.w; x += 12) line(x, pl.y, x, pl.y - 22, "#2a2a30", 2);
      line(pl.x, pl.y - 22, pl.x + pl.w, pl.y - 22, "#2a2a30", 3);
      for (const bx of [pl.x + 10, pl.x + pl.w - 10]) line(bx, pl.y + 10, bx + (bx < pl.x + pl.w / 2 ? 14 : -14), pl.y + 30, "#2a2a30", 3);
    }
  }
  // Pickups
  for (const k of state.pickups) {
    const y = k.y - 12 + Math.sin(k.bob) * 3;
    ctx.globalAlpha = k.life < 4 ? 0.4 + Math.sin(k.life * 12) * 0.4 : 1;
    circle(k.x, k.y - 1, 10, "rgba(0,0,0,0.3)");
    if (k.kind === "cannoli") { ctx.save(); ctx.translate(k.x, y); ctx.rotate(-0.4); rect(-11, -4, 22, 8, "#e0a96d", "#a9743a"); circle(-11, 0, 4, "#fff8e1"); circle(11, 0, 4, "#fff8e1"); circle(-11, 0, 1.2, "#6d4c41"); ctx.restore(); }
    else if (k.kind === "tommy") { rect(k.x - 9, y - 6, 18, 12, "#424242", "#212121"); circle(k.x, y, 4, "#ffd54f"); }
    else { rect(k.x - 10, y - 5, 20, 10, "#b71c1c", "#7f0000"); rect(k.x - 10, y - 5, 5, 10, "#ffab40"); }
    ctx.globalAlpha = 1;
  }
  // Gibs
  for (const g of state.gibs) { ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.globalAlpha = Math.min(1, g.life); rect(-g.w / 2, -g.h / 2, g.w, g.h, g.color); if (g.hat) rect(-g.w / 2 + 3, -g.h / 2 - 5, g.w - 6, 5, g.color); ctx.restore(); }
  ctx.globalAlpha = 1;
  // Zombies
  for (const z of state.zombies) drawZombie(z);
  // Player
  if (state.player) drawPlayer(state.player);
  // Bullets
  for (const b of state.bullets) { if (b.trail.length) line(b.trail[0].x, b.trail[0].y, b.x, b.y, b.color, 2.5); circle(b.x, b.y, 2, "#fff"); }
  // Particles
  for (const p of state.particles) {
    if (p.kind === "flash") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.globalAlpha = 0.9; circle(0, 0, p.r * 0.6, "#fff"); ctx.fillStyle = "#ffeb3b"; ctx.beginPath(); ctx.moveTo(0, -p.r * 0.4); ctx.lineTo(p.r * 1.8, 0); ctx.lineTo(0, p.r * 0.4); ctx.fill(); ctx.restore(); continue; }
    ctx.globalAlpha = Math.min(1, p.life / p.maxLife * 2);
    if (p.kind === "shell") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); rect(-2, -1, 4, 2, p.color); ctx.restore(); }
    else circle(p.x, p.y, p.r, p.color);
  }
  ctx.globalAlpha = 1;
  // Floating text
  for (const f of state.floaters) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.fillStyle = f.color; ctx.font = `bold ${f.size}px Impact, "Arial Black", sans-serif`; ctx.textAlign = "center"; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 3; ctx.strokeText(f.text, f.x, f.y); ctx.fillText(f.text, f.x, f.y); }
  ctx.globalAlpha = 1;
  ctx.restore();
  // Wave countdown
  if (state.countdown !== null && state.running && !state.over) {
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "bold 20px Impact, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(state.wave === 0 ? `Get ready... ${Math.ceil(state.countdown)}` : `Next wave in ${Math.ceil(state.countdown)}`, W / 2, 70);
  }
  // Hurt vignette
  if (state.player && state.player.flash > 0) { ctx.fillStyle = `rgba(200,0,0,${state.player.flash * 2})`; ctx.fillRect(0, 0, W, H); }
}

// Vinnie: pinstripe suit, fedora, cigar, and a gun that follows the mouse
function drawPlayer(p) {
  const T = state.time, run = p.vx !== 0 && p.onGround, sw = run ? Math.sin(p.phase) * 9 : 0;
  const bob = run ? Math.abs(Math.sin(p.phase)) * 2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y - bob);
  if (p.hurt > 0 && Math.floor(T * 20) % 2) ctx.globalAlpha = 0.4;
  ctx.scale(p.dir, 1);
  circle(0, bob + 1, 14, "rgba(0,0,0,0.35)");
  // Legs: black trousers, shiny shoes
  line(-4, -24, -4 + sw, -2, "#1b1b1b", 7); line(4, -24, 4 - sw, -2, "#1b1b1b", 7);
  ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(-3 + sw, -1, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(5 - sw, -1, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (!p.onGround) { line(-4, -24, -8, -8, "#1b1b1b", 7); line(4, -24, 9, -12, "#1b1b1b", 7); }
  // Jacket with pinstripes, white shirt, red tie
  rect(-11, -50, 22, 28, "#263238", "#111");
  for (let x = -8; x <= 8; x += 4) line(x, -49, x, -23, "rgba(255,255,255,0.18)", 1);
  ctx.fillStyle = "#f5f5f5"; ctx.beginPath(); ctx.moveTo(-4, -50); ctx.lineTo(4, -50); ctx.lineTo(0, -34); ctx.fill();
  line(0, -48, 0, -36, "#c62828", 3);
  circle(-5, -46, 1.2, "#f5f5f5");                                   // boutonniere
  // Head: square jaw, five o'clock shadow, cigar, fedora
  rect(-8, -66, 16, 17, "#f1c27d", "#b0855b");
  rect(-8, -55, 16, 6, "rgba(60,40,30,0.25)");                      // stubble
  circle(3, -60, 1.5, "#222"); line(0, -62, 6, -62, "#5d4037", 1.5);   // eye + brow
  line(6, -53, 14, -55, "#5d4037", 3); circle(14.5, -55, 1.6, Math.sin(T * 6) > 0 ? "#ff7043" : "#bf360c");   // cigar
  for (let i = 0; i < 2; i++) { ctx.globalAlpha = 0.25; circle(16 + i * 3, -60 - i * 5 - (T * 10 % 6), 2 + i, "#bdbdbd"); }
  ctx.globalAlpha = p.hurt > 0 && Math.floor(T * 20) % 2 ? 0.4 : 1;
  if (p.fedora) { rect(-13, -67, 26, 3, "#212121"); rect(-9, -76, 18, 10, "#212121"); rect(-9, -70, 18, 2.5, "#7f0000"); }
  else { rect(-8, -69, 16, 4, "#3e2723"); }
  ctx.restore();
  // Arms and gun aim at the mouse (drawn unflipped)
  ctx.save();
  ctx.translate(p.x, p.y - bob - 44);
  ctx.rotate(p.aim);
  if (p.dir < 0) ctx.scale(1, -1);
  const w = WEAPONS[p.weapon];
  const rec = p.recoil > 0 ? p.recoil * 4 : 0; p.recoil = Math.max(0, (p.recoil || 0) - 0.15);
  line(0, 0, 14 - rec, 3, "#263238", 6); circle(15 - rec, 3, 3.5, "#f1c27d");  // arm + hand
  ctx.translate(-rec, 0);
  if (p.weapon === 1) { rect(10, -3, 18, 5, "#37474f"); rect(8, -1, 6, 10, "#5d4037"); }
  else if (p.weapon === 2) { rect(6, -4, 34, 6, "#424242"); rect(14, 2, 10, 9, "#5d4037"); circle(20, 6, 5, "#333"); rect(0, -1, 8, 8, "#5d4037"); rect(38, -3, 8, 4, "#212121"); }
  else { rect(4, -3, 40, 5, "#b71c1c"); rect(10, 1, 22, 4, "#5d4037"); rect(-2, -2, 10, 9, "#5d4037"); rect(40, -4, 8, 7, "#212121"); }
  ctx.restore();
}

function drawZombie(z) {
  const T = state.time, d = z.def, sw = z.vx ? Math.sin(z.phase) * 7 : Math.sin(z.phase) * 2;
  ctx.save();
  ctx.translate(z.x, z.y);
  ctx.scale(z.dir, 1);
  ctx.rotate(z.lean);
  if (z.flash > 0) ctx.filter = "brightness(1.6)";
  circle(0, 1, d.w * 0.5, "rgba(0,0,0,0.35)");
  const s = d.h / 54;                                                 // scale against the shambler
  // Legs, torn trousers
  line(-4 * s, -24 * s, -4 * s + sw, -2, "#4e342e", 6 * s); line(4 * s, -24 * s, 4 * s - sw * 0.6, -2, "#4e342e", 6 * s);
  // Body
  rect(-10 * s, -50 * s, 20 * s, 28 * s, d.color, "#1b1b1b");
  if (z.type === "cop") { rect(-10 * s, -50 * s, 20 * s, 28 * s, "#283593", "#111"); circle(-5 * s, -44 * s, 2, "#ffd54f"); rect(-10 * s, -36 * s, 20 * s, 3, "#111"); }
  for (let i = 0; i < 3; i++) line(-8 * s + i * 7 * s, -30 * s, -6 * s + i * 7 * s, -22 * s, "#1b1b1b", 1.2);   // rips
  // Arms held out zombie-style, one reaching further; bite lunge
  const reach = z.bite > 0 ? 8 : 0;
  line(6 * s, -46 * s, 20 * s + reach, -44 * s + Math.sin(T * 5 + z.phase) * 3, d.skin, 5 * s);
  line(4 * s, -44 * s, 18 * s + reach, -38 * s + Math.sin(T * 4 + z.phase) * 3, d.skin, 5 * s);
  // Head: green skin, dangling eye, jaw
  rect(-8 * s, -66 * s, 16 * s, 17 * s, d.skin, "#33691e");
  circle(3 * s, -60 * s, 2.2 * s, "#fff"); circle(3.5 * s, -60 * s, 1.1 * s, "#b71c1c");
  circle(-3 * s, -57 * s + Math.sin(T * 3) * 1.5, 1.8 * s, "#fff"); line(-3 * s, -60 * s, -3 * s, -57 * s + Math.sin(T * 3) * 1.5, "#b71c1c", 1);   // dangling eye
  rect(-5 * s, -52 * s, 12 * s, 3 * s, "#4a148c");
  for (let i = 0; i < 3; i++) rect(-4 * s + i * 4 * s, -52 * s, 2 * s, 2.5 * s, "#fff");
  if (z.type === "cop") { rect(-9 * s, -70 * s, 18 * s, 5 * s, "#1a237e"); rect(-6 * s, -76 * s, 12 * s, 7 * s, "#1a237e"); circle(0, -72 * s, 1.5, "#ffd54f"); }
  if (z.type === "brute") { rect(-12 * s, -70 * s, 24 * s, 5 * s, "#5d4037"); line(-10 * s, -40 * s, 10 * s, -40 * s, "#3e2723", 3); }   // belt and heavy brow
  if (z.type === "runner") { for (let i = 0; i < 3; i++) line(-6 * s + i * 4, -66 * s, -8 * s + i * 4, -72 * s, "#3e2723", 1.5); }   // wild hair
  ctx.restore();
  // Health bar for the tough ones
  if (z.hp < z.maxHp && z.maxHp >= 6) { rect(z.x - 16, z.y - z.h - 10, 32, 4, "#222"); rect(z.x - 16, z.y - z.h - 10, 32 * (z.hp / z.maxHp), 4, "#8bc34a"); }
}
