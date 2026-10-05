import { state, newPlayer } from "./state.js";
import { W, H, LEVEL_W, WEAPONS } from "./config.js";
import { updatePlayer, switchTo } from "./player.js";
import { updateZombies } from "./enemies.js";
import { updateParticles } from "./particles.js";
import { draw, canvas } from "./render.js";
import { unlockAudio, toggleMute, isMuted, sfx } from "./audio.js";
import { clamp, lerp } from "./util.js";

const $ = (id) => document.getElementById(id);

function reset() {
  Object.assign(state, { running: true, over: false, time: 0, score: 0, kills: 0, wave: 0, countdown: 3, spawnQueue: [], zombies: [], bullets: [], particles: [], gibs: [], pickups: [], floaters: [], decals: [], shake: 0 });
  state.player = newPlayer(LEVEL_W / 2);
  state.camX = LEVEL_W / 2 - W / 2;
  $("overlay").style.display = "none";
}

function gameOver() {
  state.over = true;
  $("title").textContent = "YOU GOT WHACKED";
  $("subtitle").textContent = `Vinnie went down on wave ${state.wave} with ${state.kills} zombies on the ledger. Score ${state.score}.`;
  $("start").textContent = "Try again";
  $("overlay").style.display = "flex";
}

function hud() {
  const p = state.player;
  $("hp").style.width = `${(p.hp / p.maxHp) * 100}%`; $("hpText").textContent = Math.ceil(p.hp);
  $("weaponName").textContent = WEAPONS[p.weapon].name;
  $("ammo").textContent = p.ammo[p.weapon] === null ? "∞" : p.ammo[p.weapon];
  $("wave").textContent = state.wave; $("score").textContent = state.score;
}

// Input
const toWorld = (ev) => { const r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (H / r.height) }; };
window.addEventListener("keydown", (e) => { state.keys[e.code] = true; unlockAudio(); if (e.code.startsWith("Digit") && state.player) switchTo(state.player, Number(e.code[5])); if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault(); });
window.addEventListener("keyup", (e) => { state.keys[e.code] = false; });
canvas.addEventListener("mousemove", (e) => { Object.assign(state.mouse, toWorld(e)); });
canvas.addEventListener("mousedown", (e) => { if (e.button === 0) { state.mouse.down = true; unlockAudio(); } });
window.addEventListener("mouseup", () => { state.mouse.down = false; });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("wheel", (e) => { if (!state.player) return; const n = ((state.player.weapon - 1 + (e.deltaY > 0 ? 1 : 2)) % 3) + 1; switchTo(state.player, n); e.preventDefault(); }, { passive: false });
$("start").addEventListener("click", () => { unlockAudio(); reset(); });
$("mute").addEventListener("click", () => { $("mute").textContent = toggleMute() ? "🔇" : "🔊"; });
$("mute").textContent = isMuted() ? "🔇" : "🔊";

// Scale the board to the window
function fit() { const k = Math.min(window.innerWidth / W, window.innerHeight / H); $("wrap").style.transform = `translate(-50%, -50%) scale(${k})`; }
window.addEventListener("resize", fit); fit();

// One step of the game (also exposed on window.game for poking at it from the console)
function step(dt) {
  if (state.running && !state.over) {
    state.time += dt;
    updatePlayer(dt);
    updateZombies(dt);
    updateParticles(dt);
    // Camera follows the player with a bit of lead toward the mouse
    const lead = (state.mouse.x - W / 2) * 0.25;
    state.camX = lerp(state.camX, clamp(state.player.x + lead - W / 2, 0, LEVEL_W - W), 1 - Math.pow(0.001, dt));
    state.shake = Math.max(0, state.shake - 40 * dt);
    hud();
    if (state.player.hp <= 0 && state.player.deadFor === undefined) state.player.deadFor = 0;
    if (state.player.deadFor !== undefined) { state.player.deadFor += dt; if (state.player.deadFor > 1.6) gameOver(); }
  } else state.time += dt;                        // title screen: the street still breathes behind the overlay
}

// Main loop
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  step(dt);
  draw();
  requestAnimationFrame(frame);
}
state.player = null;
requestAnimationFrame(frame);
window.game = { state, step, draw };
