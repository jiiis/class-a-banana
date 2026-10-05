import { state } from "./state.js";
import { W, H, WEAPONS } from "./config.js";
import { grid, MAP_W, MAP_H } from "./map.js";
import { renderWorld, canvas, ctx } from "./raycast.js";
import { newGame, updateGame, buy } from "./game.js";
import { updateHud } from "./hud.js";
import { unlockAudio, sfx } from "./audio.js";

const $ = (id) => document.getElementById(id);

// ---------- Input ----------
window.addEventListener("keydown", (e) => {
  state.keys[e.code] = true;
  if (!state.player) return;
  if (e.code === "Digit1") state.player.weapon = "knife";
  if (e.code === "Digit2") state.player.weapon = "usp";
  if (e.code === "Digit3" && state.player.hasRifle) state.player.weapon = "ak";
  if (e.code === "KeyB" && state.running) state.buyOpen = !state.buyOpen;
  if (["Space", "KeyE"].includes(e.code)) e.preventDefault();
});
window.addEventListener("keyup", (e) => { state.keys[e.code] = false; });
canvas.addEventListener("mousedown", (e) => { unlockAudio(); if (!state.locked && state.running) canvas.requestPointerLock(); else if (e.button === 0) state.mouse.down = true; });
window.addEventListener("mouseup", () => { state.mouse.down = false; });
document.addEventListener("mousemove", (e) => { if (state.locked) { state.mouse.dx += e.movementX; state.mouse.dy += e.movementY; } });
document.addEventListener("pointerlockchange", () => { state.locked = document.pointerLockElement === canvas; if (!state.locked) state.mouse.down = false; });
canvas.addEventListener("wheel", (e) => { if (!state.player) return; const order = ["knife", "usp", ...(state.player.hasRifle ? ["ak"] : [])]; const i = order.indexOf(state.player.weapon); state.player.weapon = order[(i + (e.deltaY > 0 ? 1 : order.length - 1)) % order.length]; e.preventDefault(); }, { passive: false });
$("start").addEventListener("click", () => { unlockAudio(); newGame(); canvas.requestPointerLock(); });
$("buy").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) buy(b.dataset.item); });

function fit() { const k = Math.min(window.innerWidth / W, window.innerHeight / H); $("wrap").style.transform = `translate(-50%, -50%) scale(${k})`; }
window.addEventListener("resize", fit); fit();

// ---------- Drawing on top of the world ----------
function drawViewmodel() {
  const p = state.player, w = WEAPONS[p.weapon];
  const bobX = Math.sin(p.bob) * 6, bobY = Math.abs(Math.cos(p.bob)) * 5, kick = p.kick * 22, rel = p.reloading > 0 ? Math.sin((p.reloading / w.reload) * Math.PI) * 60 : 0;
  ctx.save();
  ctx.translate(W * 0.62 + bobX, H + bobY + kick + rel);
  if (p.weapon === "knife") {
    ctx.rotate(-0.4 + p.kick * 0.8);
    ctx.fillStyle = "#2b2b2b"; ctx.fillRect(40, -90, 26, 70); ctx.fillStyle = "#cfd8dc"; ctx.beginPath(); ctx.moveTo(44, -90); ctx.lineTo(62, -90); ctx.lineTo(56, -210); ctx.lineTo(42, -150); ctx.fill(); ctx.fillStyle = "#e0b48a"; ctx.fillRect(20, -70, 60, 70);
  } else if (p.weapon === "usp") {
    ctx.fillStyle = "#e0b48a"; ctx.fillRect(10, -110, 70, 110);                                   // hands
    ctx.fillStyle = "#2a2a2a"; ctx.fillRect(-10, -170, 90, 55); ctx.fillStyle = "#3a3a3a"; ctx.fillRect(-10, -185, 110, 20); ctx.fillStyle = "#555"; ctx.fillRect(100, -182, 40, 14);   // slide + suppressor
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(20, -120, 40, 50);
    if (p.kick > 0.5) { ctx.fillStyle = `rgba(255,230,120,${p.kick})`; ctx.beginPath(); ctx.arc(150, -176, 14 + p.kick * 10, 0, 7); ctx.fill(); }
  } else {
    ctx.fillStyle = "#e0b48a"; ctx.fillRect(0, -110, 70, 110); ctx.fillRect(120, -150, 50, 50);  // hands
    ctx.fillStyle = "#6d4c41"; ctx.fillRect(-60, -140, 110, 50); ctx.fillRect(110, -160, 70, 36);   // stock + handguard
    ctx.fillStyle = "#2a2a2a"; ctx.fillRect(40, -160, 90, 50); ctx.fillRect(180, -150, 90, 14); ctx.fillStyle = "#3a3a3a"; ctx.fillRect(60, -175, 60, 16);   // receiver + barrel
    ctx.fillStyle = "#1a1a1a"; ctx.save(); ctx.translate(90, -110); ctx.rotate(0.35); ctx.fillRect(-12, 0, 24, 70); ctx.restore();   // curved mag
    if (p.kick > 0.5) { ctx.fillStyle = `rgba(255,230,120,${p.kick})`; ctx.beginPath(); ctx.arc(280, -143, 16 + p.kick * 12, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}
function drawCrosshair() {
  const p = state.player, gap = 6 + p.recoil * 120 + (p.moving ? 5 : 0), len = 9;
  ctx.strokeStyle = state.hitmarker > 0 ? "#ff5252" : "#7fff7f"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - gap - len, H / 2); ctx.lineTo(W / 2 - gap, H / 2); ctx.moveTo(W / 2 + gap, H / 2); ctx.lineTo(W / 2 + gap + len, H / 2);
  ctx.moveTo(W / 2, H / 2 - gap - len); ctx.lineTo(W / 2, H / 2 - gap); ctx.moveTo(W / 2, H / 2 + gap); ctx.lineTo(W / 2, H / 2 + gap + len);
  ctx.stroke();
  if (state.hitmarker > 0) { ctx.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(W / 2 + sx * 6, H / 2 + sy * 6); ctx.lineTo(W / 2 + sx * 12, H / 2 + sy * 12); } ctx.stroke(); }
}
function drawRadar() {
  const p = state.player, s = 4.5, ox = 16, oy = 60;
  ctx.save(); ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(ox - 4, oy - 4, MAP_W * s + 8, MAP_H * s + 8);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (grid[y][x]) { ctx.fillStyle = "#8a8a8a"; ctx.fillRect(ox + x * s, oy + y * s, s, s); }
  if (state.bomb) { ctx.fillStyle = state.bomb.planted && Math.floor(state.time * 4) % 2 ? "#ff1744" : "#ffb347"; ctx.fillRect(ox + state.bomb.x * s - 3, oy + state.bomb.y * s - 3, 6, 6); }
  for (const b of state.bots) if (b.hp > 0 && (b.seen > 0 || b.shootFlash > 0)) { ctx.fillStyle = "#ffb347"; ctx.beginPath(); ctx.arc(ox + b.x * s, oy + b.y * s, 3, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#5fa8ff"; ctx.beginPath(); ctx.arc(ox + p.x * s, oy + p.y * s, 3.5, 0, 7); ctx.fill();
  ctx.strokeStyle = "#5fa8ff"; ctx.beginPath(); ctx.moveTo(ox + p.x * s, oy + p.y * s); ctx.lineTo(ox + (p.x + Math.cos(p.a) * 3) * s, oy + (p.y + Math.sin(p.a) * 3) * s); ctx.stroke();
  ctx.restore();
}
export function draw() {
  if (!state.player) { ctx.fillStyle = "#0b0c10"; ctx.fillRect(0, 0, W, H); return; }
  renderWorld();
  if (!state.player.dead) { drawViewmodel(); drawCrosshair(); }
  drawRadar();
  if (state.flash > 0) { ctx.fillStyle = `rgba(255,${state.flash > 1 ? 255 : 0},0,${Math.min(0.6, state.flash)})`; ctx.fillRect(0, 0, W, H); }
  if (state.hurtTime > 0) {                                                                      // damage direction arc
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(state.hurtDir); ctx.strokeStyle = `rgba(255,40,40,${state.hurtTime})`; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, 90, -0.5, 0.5); ctx.stroke(); ctx.restore();
  }
  if (state.player.dead) { ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.font = "bold 36px Impact, sans-serif"; ctx.textAlign = "center"; ctx.fillText("YOU ARE DEAD", W / 2, H / 2 - 40); }
  if (!state.locked && state.running && !state.over) { ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText("Click to capture the mouse", W / 2, H / 2 + 60); }
}

// ---------- Loop ----------
function step(dt) { if (state.running) { updateGame(dt); updateHud(dt); } }
let last = performance.now();
function frame(now) { const dt = Math.min((now - last) / 1000, 0.05); last = now; step(dt); draw(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
window.game = { state, step, draw, newGame };
