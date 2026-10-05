import { state } from "./state.js";
import { W, H, FOV, MOVE, WALK, RADIUS, WEAPONS } from "./config.js";
import { isWall, lineOfSight } from "./map.js";
import { sfx } from "./audio.js";
import { damageBot } from "./bots.js";

export function tryMove(o, dx, dy) {
  // Slide along walls: test x and y separately with a body radius
  const nx = o.x + dx, ny = o.y + dy, r = RADIUS;
  if (!isWall(nx + Math.sign(dx) * r, o.y - r) && !isWall(nx + Math.sign(dx) * r, o.y + r)) o.x = nx;
  if (!isWall(o.x - r, ny + Math.sign(dy) * r) && !isWall(o.x + r, ny + Math.sign(dy) * r)) o.y = ny;
}

export function updatePlayer(dt) {
  const p = state.player, k = state.keys;
  if (p.dead) return;
  // Look
  p.a += state.mouse.dx * 0.0022; p.pitch = Math.max(-160, Math.min(160, p.pitch - state.mouse.dy * 0.9));
  state.mouse.dx = 0; state.mouse.dy = 0;
  // Move (frozen during freeze time)
  let fx = 0, fy = 0;
  if (state.phase !== "freeze" && !state.buyOpen) {
    if (k.KeyW) fy += 1; if (k.KeyS) fy -= 1; if (k.KeyA) fx -= 1; if (k.KeyD) fx += 1;
  }
  const len = Math.hypot(fx, fy);
  p.moving = len > 0;
  if (len) {
    const sp = (k.ShiftLeft || k.ShiftRight ? WALK : MOVE) * dt / len;
    const dx = (Math.cos(p.a) * fy - Math.sin(p.a) * fx) * sp, dy = (Math.sin(p.a) * fy + Math.cos(p.a) * fx) * sp;
    tryMove(p, dx, dy);
    p.bob += dt * (k.ShiftLeft ? 6 : 11);
    if (Math.sin(p.bob) > 0.98 && !k.ShiftLeft) sfx("step", 0.25);
  } else p.bob *= 0.9;
  // Weapons
  const w = WEAPONS[p.weapon], am = p.ammo[p.weapon];
  p.cd -= dt; p.recoil = Math.max(0, p.recoil - dt * 0.06); p.kick *= 0.82;
  if (p.reloading > 0) { p.reloading -= dt; if (p.reloading <= 0) { const need = w.mag - am.mag, got = Math.min(need, am.reserve); am.mag += got; am.reserve -= got; } }
  if (k.KeyR && p.reloading <= 0 && am.mag < w.mag && am.reserve > 0 && !w.melee) { p.reloading = w.reload; sfx("reload"); }
  if (state.mouse.down && p.cd <= 0 && p.reloading <= 0 && state.phase === "live" && !state.buyOpen) {
    if (am.mag <= 0) { sfx("empty", 0.25); p.cd = 0.25; if (am.reserve > 0) { p.reloading = w.reload; sfx("reload"); } return; }
    fire(p, w, am);
  }
}

function fire(p, w, am) {
  p.cd = 1 / w.rate;
  if (!w.melee) am.mag--;
  p.kick = 1; p.pitch += w.kick * 300 * (0.6 + Math.random() * 0.6); p.a += (Math.random() - 0.5) * w.kick * 0.6;
  const spread = w.spread + p.recoil * (w.recoilGrow ? 1 : 0.3);
  p.recoil = Math.min(0.12, p.recoil + (w.recoilGrow || 0));
  const ang = p.a + (Math.random() - 0.5) * 2 * spread;
  sfx(w.sound, 0.02);
  // Hitscan against the bots: the closest one inside the aim cone, with no wall in between
  let best = null, bestD = w.range;
  for (const b of state.bots) {
    if (b.hp <= 0) continue;
    const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
    if (d > bestD) continue;
    let da = Math.atan2(dy, dx) - ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) > Math.atan2(0.28, d)) continue;
    if (!lineOfSight(p, b)) continue;
    bestD = d; best = b;
  }
  if (!best) { if (w.melee) return; return; }
  // Where on the body did we hit? Compare the crosshair with the sprite's screen height (pitch matters!)
  const depth = bestD, size = H / depth, horizon = H / 2 + p.pitch, top = horizon - size / 2;
  const cross = H / 2, rel = (cross - top) / size;                   // 0 = top of head, 1 = feet
  if (rel < 0 || rel > 1) return;                                     // shot over the head or into the ground
  const head = rel < 0.22;
  const dmg = Math.round(w.dmg * (head ? w.hs : rel > 0.75 ? 0.75 : 1) * (depth > 20 ? 0.8 : 1));
  damageBot(best, dmg, head, w.melee ? "knife" : p.weapon);
  state.hitmarker = 0.12; sfx(head ? "headshot" : w.melee ? "stab" : "hit", 0.03);
}

export function hurtPlayer(dmg, from) {
  const p = state.player;
  if (p.dead) return;
  if (p.armor > 0) { const absorbed = Math.min(p.armor, dmg * 0.5); p.armor -= absorbed; dmg -= absorbed; }
  p.hp -= Math.round(dmg);
  state.flash = 0.35;
  let da = Math.atan2(from.y - p.y, from.x - p.x) - p.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
  state.hurtDir = da; state.hurtTime = 0.8;
  sfx("hurt", 0.1);
  if (p.hp <= 0) { p.hp = 0; p.dead = true; p.pitch = -120; }
}
