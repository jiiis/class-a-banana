import { state, newPlayer } from "./state.js";
import { ROUND_TIME, FREEZE_TIME, BOMB_TIME, DEFUSE_TIME, KIT_DEFUSE_TIME, ROUNDS_TO_WIN, REWARD, PRICES, BUY_TIME, WEAPONS } from "./config.js";
import { ctSpawn } from "./map.js";
import { spawnBots, updateBots } from "./bots.js";
import { updatePlayer } from "./player.js";
import { sfx } from "./audio.js";
import { addFeed, showOverlay, hideOverlay } from "./hud.js";

export function newGame() {
  Object.assign(state, { running: true, over: false, time: 0, round: 0, ctScore: 0, tScore: 0, money: 800, feed: [], kills: 0 });
  state.player = newPlayer(ctSpawn[0], null);
  startRound();
  hideOverlay();
}

export function startRound() {
  const old = state.player;
  state.round++;
  const keep = old && !old.dead ? { armor: old.armor, helmet: old.helmet, kit: old.kit, hasRifle: old.hasRifle } : null;
  state.player = newPlayer(ctSpawn[Math.floor(Math.random() * ctSpawn.length)], keep);
  if (keep) state.player.ammo = old.ammo;
  spawnBots(state.round);
  const carrier = state.bots.find((b) => b.carrier);
  state.bomb = { x: carrier.x, y: carrier.y, planted: false, timer: BOMB_TIME };
  state.phase = "freeze"; state.phaseTime = FREEZE_TIME; state.roundTime = ROUND_TIME; state.defusing = 0; state.defuseProgress = 0; state.buyOpen = false;
  state.status = ""; state.statusTime = 0;
  sfx("roundStart");
}

export function updateGame(dt) {
  if (state.over) return;
  state.time += dt;
  if (state.phase === "freeze") { state.phaseTime -= dt; if (state.phaseTime <= 0) { state.phase = "live"; state.status = "Go go go!"; state.statusTime = 2; } }
  else if (state.phase === "live") state.roundTime -= dt;
  updatePlayer(dt);
  updateBots(dt);
  if (state.flash > 0) state.flash -= dt;
  if (state.hitmarker > 0) state.hitmarker -= dt;
  if (state.hurtTime > 0) state.hurtTime -= dt;
  if (state.phase !== "live") return;

  const p = state.player;
  // Bomb ticking / defusing
  if (state.bomb?.planted) {
    state.bomb.timer -= dt;
    const beepEvery = state.bomb.timer < 10 ? 0.25 : state.bomb.timer < 20 ? 0.5 : 1;
    if (Math.floor(state.bomb.timer / beepEvery) !== Math.floor((state.bomb.timer + dt) / beepEvery)) sfx("beep", 0.05, 0.6);
    const near = !p.dead && Math.hypot(state.bomb.x - p.x, state.bomb.y - p.y) < 1.4;
    if (near && state.keys.KeyE) {
      state.defusing += dt;
      const need = p.kit ? KIT_DEFUSE_TIME : DEFUSE_TIME;
      state.defuseProgress = state.defusing / need;
      if (Math.floor(state.defusing * 4) !== Math.floor((state.defusing - dt) * 4)) sfx("defuseTick", 0.1);
      if (state.defusing >= need) { sfx("defused"); addFeed("You defused the bomb", "ct"); return endRound(true, "Bomb defused!"); }
    } else state.defusing = 0;
    if (state.bomb.timer <= 0) { sfx("explode"); state.flash = 1.2; return endRound(false, "The bomb exploded"); }
  } else if (state.roundTime <= 0) return endRound(true, "Time ran out. Terrorists failed to plant");

  if (state.bots.every((b) => b.hp <= 0)) return endRound(true, "All terrorists eliminated");
  if (p.dead) { p.deadFor = (p.deadFor || 0) + dt; if (p.deadFor > 2) return endRound(false, "You were eliminated"); }
}

function endRound(ctWon, why) {
  state.phase = "end";
  if (ctWon) { state.ctScore++; state.money += REWARD.win; sfx("win"); } else { state.tScore++; state.money += REWARD.lose; sfx("lose"); }
  state.money = Math.min(16000, state.money);
  state.status = `${ctWon ? "Counter-Terrorists" : "Terrorists"} win — ${why}`; state.statusTime = 4;
  if (state.ctScore >= ROUNDS_TO_WIN || state.tScore >= ROUNDS_TO_WIN) {
    state.over = true; state.running = false;
    setTimeout(() => showOverlay(state.ctScore > state.tScore ? "CT WIN" : "T WIN", `${state.ctScore} – ${state.tScore}. You got ${state.kills} kills.`, "Play again"), 1500);
    return;
  }
  setTimeout(() => { if (!state.over) startRound(); }, 4000);
}

export function buy(item) {
  const p = state.player;
  if (state.phase === "end" || state.roundTime < ROUND_TIME - BUY_TIME || state.money < PRICES[item]) { sfx("empty"); return; }
  if (item === "rifle") { if (p.hasRifle) return; p.hasRifle = true; p.weapon = "ak"; p.ammo.ak = { mag: WEAPONS.ak.mag, reserve: WEAPONS.ak.reserve }; }
  else if (item === "armor") { p.armor = 100; p.helmet = true; }
  else if (item === "kit") { if (p.kit) return; p.kit = true; }
  else if (item === "ammo") { for (const k of ["usp", "ak"]) p.ammo[k].reserve = WEAPONS[k].reserve; }
  state.money -= PRICES[item]; sfx("buy");
}
