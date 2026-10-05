import { state } from "./state.js";
import { W, H } from "./config.js";

// Weather drifts in now and then: a shower of rain or a flurry of snow,
// fading in, lingering for a while, then clearing up again.
const CLEAR_MIN = 35, CLEAR_MAX = 80;      // seconds of clear sky between spells
const SPELL_MIN = 18, SPELL_MAX = 40;      // how long a spell lasts
const FADE = 4;                            // seconds to fade in / out

export function initWeather() {
  state.weather = { type: null, intensity: 0, timer: CLEAR_MIN * 0.3 + Math.random() * 20, ending: false, drops: [] };
}

export function updateWeather(dt) {
  const w = state.weather;
  if (!w) return;
  w.timer -= dt;
  if (!w.type) {
    if (w.timer <= 0) {                                      // a spell begins
      w.type = Math.random() < 0.6 ? "rain" : "snow";
      w.timer = SPELL_MIN + Math.random() * (SPELL_MAX - SPELL_MIN);
      w.ending = false;
      w.drops = [];
      const n = w.type === "rain" ? 220 : 140;
      for (let i = 0; i < n; i++) w.drops.push(newDrop(w.type, true));
    }
    return;
  }
  if (w.timer <= 0) w.ending = true;
  w.intensity += (w.ending ? -1 : 1) * dt / FADE;
  w.intensity = Math.max(0, Math.min(1, w.intensity));
  if (w.ending && w.intensity <= 0) {                        // cleared up
    w.type = null;
    w.timer = CLEAR_MIN + Math.random() * (CLEAR_MAX - CLEAR_MIN);
    w.drops = [];
    return;
  }
  for (const d of w.drops) {
    d.x += d.vx * dt; d.y += d.vy * dt;
    if (w.type === "snow") d.x += Math.sin(state.time * 1.5 + d.wob) * 12 * dt;
    if (d.y > H + 10 || d.x < -20 || d.x > W + 20) Object.assign(d, newDrop(w.type, false));
  }
}

function newDrop(type, anywhere) {
  const x = Math.random() * (W + 80) - 40;
  const y = anywhere ? Math.random() * H : -10 - Math.random() * 30;
  if (type === "rain") return { x, y, vx: -60, vy: 520 + Math.random() * 160, len: 10 + Math.random() * 8 };
  return { x, y, vx: -8, vy: 28 + Math.random() * 30, r: 1 + Math.random() * 1.8, wob: Math.random() * 6 };
}

export function drawWeather(ctx) {
  const w = state.weather;
  if (!w || !w.type || w.intensity <= 0) return;
  const k = w.intensity;
  if (w.type === "rain") {
    ctx.fillStyle = `rgba(30,45,80,${0.22 * k})`;            // the sky darkens
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(200,225,255,${0.45 * k})`; ctx.lineWidth = 1; ctx.lineCap = "round";
    ctx.beginPath();
    for (const d of w.drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * 0.12, d.y + d.len); }
    ctx.stroke();
    // Splashes where drops land
    ctx.fillStyle = `rgba(220,235,255,${0.3 * k})`;
    for (let i = 0; i < w.drops.length; i += 9) { const d = w.drops[i]; if (d.y > H - 40) { ctx.beginPath(); ctx.ellipse(d.x, H - 4 - (i % 7) * 60 / 7 * 0, 2.5, 1, 0, 0, Math.PI * 2); ctx.fill(); } }
  } else {
    ctx.fillStyle = `rgba(230,240,255,${0.12 * k})`;         // a pale winter haze
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(255,255,255,${0.85 * k})`;
    for (const d of w.drops) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); }
  }
}
