import { state } from "./state.js";
import { BOT, PLANT_TIME, REWARD } from "./config.js";
import { tSpawn, siteA, siteB, siteCenter, lineOfSight, nextStep, isWall } from "./map.js";
import { sfx } from "./audio.js";
import { hurtPlayer, tryMove } from "./player.js";
import { addFeed } from "./hud.js";

const NAMES = ["Boris", "Kaz", "Vlad", "Ivan", "Rook", "Dmitri", "Sasha", "Nico"];

export function spawnBots(round) {
  state.bots = [];
  const n = Math.min(BOT.count + Math.floor(round / 3), 7);
  const spots = [...tSpawn].sort(() => Math.random() - 0.5);
  for (let i = 0; i < n; i++) {
    const s = spots[i % spots.length];
    state.bots.push({ name: NAMES[(i + round * 3) % NAMES.length], x: s.x + (Math.random() - 0.5) * 0.4, y: s.y + (Math.random() - 0.5) * 0.4, hp: BOT.hp, a: Math.PI / 2, frame: 0, anim: 0, cd: 1 + Math.random(), seen: 0, shootFlash: 0, target: null, repath: 0, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 0, carrier: i === 0, planting: 0, site: Math.random() < 0.5 ? siteA : siteB });
  }
}

export function updateBots(dt) {
  const p = state.player;
  for (const b of state.bots) {
    if (b.hp <= 0) continue;
    if (b.shootFlash > 0) b.shootFlash -= dt;
    b.cd -= dt; b.repath -= dt; b.strafeT -= dt;
    const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
    const sees = !p.dead && d < 18 && lineOfSight(b, p) && (state.phase === "live");
    b.seen = sees ? b.seen + dt : Math.max(0, b.seen - dt * 2);

    if (sees && b.seen > BOT.reaction && !(b.carrier && state.bomb && !state.bomb.planted && d > 6)) {
      // Fight: face the player, strafe a bit, shoot on cooldown with distance-based accuracy
      b.a = Math.atan2(dy, dx);
      if (b.strafeT <= 0) { b.strafe = -b.strafe; b.strafeT = 0.6 + Math.random(); }
      if (d > 2.5) tryMove(b, Math.cos(b.a) * BOT.speed * 0.5 * dt - Math.sin(b.a) * b.strafe * BOT.speed * 0.5 * dt, Math.sin(b.a) * BOT.speed * 0.5 * dt + Math.cos(b.a) * b.strafe * BOT.speed * 0.5 * dt);
      else tryMove(b, -Math.sin(b.a) * b.strafe * BOT.speed * 0.6 * dt, Math.cos(b.a) * b.strafe * BOT.speed * 0.6 * dt);
      b.anim += dt * 6;
      if (b.cd <= 0) {
        b.cd = 1 / BOT.rate + Math.random() * 0.3; b.shootFlash = 0.1;
        sfx("enemy", 0.03, Math.max(0.2, 1 - d / 18));
        const chance = BOT.accuracy * Math.max(0.15, 1 - d / 16) * (p.moving ? 0.75 : 1);
        if (Math.random() < chance) hurtPlayer(BOT.dmg * (0.8 + Math.random() * 0.5), b);
      }
      b.target = null;
    } else {
      // Travel: the carrier heads to a bomb site, the others follow the carrier or hunt the player's last known area
      let goal;
      if (state.bomb && !state.bomb.planted && b.carrier) goal = siteCenter(b.site);
      else if (state.bomb && state.bomb.planted) goal = { x: state.bomb.x + Math.cos(b.a) * 2, y: state.bomb.y + Math.sin(b.a) * 2 };
      else { const c = state.bots.find((o) => o.carrier && o.hp > 0); goal = c && c !== b ? { x: c.x, y: c.y } : (b.seen > 0 ? p : siteCenter(b.site)); }
      if (b.repath <= 0 || !b.target) { b.target = nextStep(b, goal); b.repath = 0.4; }
      if (b.target) {
        const tx = b.target.x - b.x, ty = b.target.y - b.y, td = Math.hypot(tx, ty);
        if (td > 0.05) { b.a = Math.atan2(ty, tx); const sp = Math.min(BOT.speed * dt, td); tryMove(b, (tx / td) * sp, (ty / td) * sp); b.anim += dt * 9; }
        if (td < 0.15) b.target = null;
      }
      // Plant when the carrier stands on the site
      if (b.carrier && state.bomb && !state.bomb.planted && b.site.some((s) => Math.hypot(s.x - b.x, s.y - b.y) < 0.8)) {
        b.planting += dt;
        if (b.planting > 0.3 && Math.floor(b.planting * 4) !== Math.floor((b.planting - dt) * 4)) sfx("beep", 0.2, 0.5);
        if (b.planting >= PLANT_TIME) {
          state.bomb = { x: b.x, y: b.y, planted: true, timer: 40 };
          state.status = "The bomb has been planted!"; state.statusTime = 4; sfx("plant"); addFeed(`${b.name} planted the bomb`, "t");
          b.carrier = false;
        }
      } else b.planting = 0;
      if (state.bomb && !state.bomb.planted && b.carrier) { state.bomb.x = b.x; state.bomb.y = b.y; }
    }
    // Keep a little distance from squadmates so they don't stack into one sprite
    for (const o of state.bots) if (o !== b && o.hp > 0) { const sx = b.x - o.x, sy = b.y - o.y, sd = Math.hypot(sx, sy); if (sd < 0.7 && sd > 0.001) tryMove(b, (sx / sd) * (0.7 - sd) * 0.5, (sy / sd) * (0.7 - sd) * 0.5); }
    b.frame = Math.floor(b.anim) % 3;
  }
}

export function damageBot(b, dmg, head, weapon) {
  if (b.hp <= 0) return;
  b.hp -= dmg;
  b.seen = BOT.reaction + 1;                 // getting shot wakes them up
  if (b.hp <= 0) {
    b.hp = 0; state.kills++; state.money += REWARD.kill; sfx("botDie", 0.1);
    addFeed(`You ${head ? "🎯 " : ""}${weapon === "knife" ? "🔪 " : ""}${b.name}`, "ct");
    if (b.carrier && state.bomb && !state.bomb.planted) {          // the bomb is dropped and the nearest bot picks it up
      b.carrier = false; state.bomb.x = b.x; state.bomb.y = b.y;
      const next = state.bots.filter((o) => o.hp > 0).sort((o, q) => Math.hypot(o.x - b.x, o.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
      if (next) { next.carrier = true; next.repath = 0; }
    }
  }
}
