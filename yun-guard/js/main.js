import { canvas } from "./render/gfx.js";
import { state } from "./state.js";
import { W, H, SPOT_RADIUS } from "./config.js";
import { dist } from "./util.js";
import { map, generateMap } from "./map.js";
import { update } from "./update.js";
import { draw } from "./render/draw.js";
import { initUi, openMenu, closeMenu } from "./ui.js";
import { startWave, spawnEnemy } from "./waves.js";
import { createTower, setRally } from "./towers.js";
import { initCritters } from "./critters.js";
import { initHero, sendHero, selectedHero, selectHero, deselectHeroes, heroAt } from "./hero.js";
import { initTouch } from "./touch.js";
import { unlockAudio, toggleMute, isMuted, sfx } from "./audio.js";
import { initWeather } from "./weather.js";

// A new random world every time. Add ?seed=1234 to the URL to replay a map you liked.
const seedParam = Number(new URLSearchParams(location.search).get("seed"));
generateMap(seedParam > 0 ? seedParam : Math.floor(Math.random() * 1e6));

initUi();
initTouch();
initCritters();
initWeather();

// Pick a hero before the round starts (or pass ?hero=april / ?hero=avril in the URL)
const heroPick = document.getElementById("heroPick");
const preset = new URLSearchParams(location.search).get("hero");
function chooseHero(kind) {
  initHero(kind);
  heroPick.style.display = "none";
  document.getElementById("next").disabled = false;
  sfx("select");
}
document.getElementById("next").disabled = true;
for (const card of heroPick.querySelectorAll(".card")) card.addEventListener("click", () => chooseHero(card.dataset.hero));
if (["april", "avril", "ember", "willow", "meilin"].includes(preset)) chooseHero(preset);

// Click the hero to select her, then click anywhere to send her there.
// Click a build spot to open its menu; click empty ground to close it.
canvas.addEventListener("click", (ev) => {
  const r = canvas.getBoundingClientRect();
  const p = { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (H / r.height) };
  const clicked = heroAt(p), active = selectedHero();
  if (state.rallyFor) {                                   // placing a barracks rally flag
    if (state.towers.includes(state.rallyFor)) setRally(state.rallyFor, p);
    state.rallyFor = null;
    sfx("order");
  } else if (clicked) {                                   // click a hero to select (or deselect) them
    selectHero(clicked);
    sfx(clicked.selected ? "select" : "click");
    closeMenu();
  } else if (active) {
    sendHero(p, active);                                   // one order per selection: deselected after the click
    deselectHeroes();
    sfx("order");
  } else {
    const i = map.spots.findIndex((s) => dist(s, p) <= SPOT_RADIUS + 5);
    if (i >= 0) { openMenu(i); sfx("click"); } else closeMenu();
  }
  canvas.style.cursor = selectedHero() || state.rallyFor ? "crosshair" : state.hover !== null ? "pointer" : "default";
});

// Highlight the build spot under the mouse
canvas.addEventListener("mousemove", (ev) => {
  const r = canvas.getBoundingClientRect();
  const p = { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (H / r.height) };
  const i = map.spots.findIndex((s) => dist(s, p) <= SPOT_RADIUS + 5);
  state.hover = i >= 0 ? i : null;
  // With a hero selected, an animal under the mouse is marked as the would-be target
  state.hoverCritter = selectedHero() ? state.critters.find((c) => dist(c, { x: p.x, y: p.y + 6 }) <= 16) || null : null;
  if (!selectedHero() && !state.rallyFor) canvas.style.cursor = state.hover !== null ? "pointer" : "default";
});
canvas.addEventListener("mouseleave", () => { state.hover = null; state.hoverCritter = null; });

// Sound: browsers need a click or key press before audio may start
for (const evt of ["pointerdown", "keydown"]) window.addEventListener(evt, unlockAudio);
const muteBtn = document.getElementById("mute");
muteBtn.textContent = isMuted() ? "🔇" : "🔊";
muteBtn.addEventListener("click", () => { muteBtn.textContent = toggleMute() ? "🔇" : "🔊"; });
// Keyboard: 1 selects the hero (press again to deselect), Escape deselects everything
window.addEventListener("keydown", (ev) => {
  const hero = state.heroes[0];
  if (ev.key === "1" && hero && hero.hp > 0) {
    selectHero(hero);
    sfx(hero.selected ? "select" : "click");
    closeMenu();
  } else if (ev.key === "Escape") {
    deselectHeroes();
    state.rallyFor = null;
    closeMenu();
  }
  canvas.style.cursor = selectedHero() || state.rallyFor ? "crosshair" : state.hover !== null ? "pointer" : "default";
});

document.getElementById("next").addEventListener("click", startWave);

// Main loop
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handy for poking at the game from the browser console.
window.game = { state, map, update, draw, spawnEnemy, startWave, createTower, sendHero };
