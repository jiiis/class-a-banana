import { state } from "./state.js";
import { WEAPONS, PRICES, BUY_TIME } from "./config.js";

const $ = (id) => document.getElementById(id);

export function addFeed(text, team) {
  state.feed.push({ text, team, life: 5 });
  if (state.feed.length > 5) state.feed.shift();
}

export function updateHud(dt) {
  const p = state.player;
  for (const f of state.feed) f.life -= dt;
  state.feed = state.feed.filter((f) => f.life > 0);
  $("feed").innerHTML = state.feed.map((f) => `<li class="${f.team}">${f.text}</li>`).join("");
  $("hp").textContent = Math.ceil(p.hp); $("armor").textContent = Math.ceil(p.armor);
  $("money").textContent = state.money;
  const w = WEAPONS[p.weapon], am = p.ammo[p.weapon];
  $("mag").textContent = w.melee ? "—" : am.mag; $("reserve").textContent = w.melee ? "" : `/ ${am.reserve}`; $("weaponName").textContent = w.name;
  $("ctScore").textContent = state.ctScore; $("tScore").textContent = state.tScore;
  const t = state.bomb?.planted ? state.bomb.timer : state.roundTime;
  $("timer").textContent = `${Math.floor(Math.max(0, t) / 60)}:${String(Math.ceil(Math.max(0, t)) % 60).padStart(2, "0")}`;
  $("timer").style.color = state.bomb?.planted ? "#ff5252" : "";
  if (state.statusTime > 0) state.statusTime -= dt;
  $("status").textContent = state.phase === "freeze" ? `Round ${state.round} — get ready` : state.statusTime > 0 ? state.status : "";
  const nearBomb = state.bomb?.planted && Math.hypot(state.bomb.x - p.x, state.bomb.y - p.y) < 1.4 && !p.dead;
  $("hint").textContent = nearBomb ? (state.defusing > 0 ? "" : "Hold E to defuse") : state.phase === "live" && state.roundTime > 105 - BUY_TIME ? "Press B to buy" : "";
  $("defuse").style.display = state.defusing > 0 ? "block" : "none";
  $("defuseFill").style.width = `${state.defuseProgress * 100}%`;
  $("buy").style.display = state.buyOpen ? "flex" : "none";
  if (state.buyOpen) for (const b of $("buy").querySelectorAll("button")) b.disabled = state.money < PRICES[b.dataset.item] || (b.dataset.item === "rifle" && p.hasRifle) || (b.dataset.item === "kit" && p.kit);
}

export function showOverlay(title, text, button) {
  $("result").textContent = text;
  if (title) document.querySelector("#overlay h1").textContent = title;
  $("start").textContent = button;
  $("overlay").style.display = "flex";
}
export const hideOverlay = () => { $("overlay").style.display = "none"; };
