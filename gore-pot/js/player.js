import { state } from "./state.js";
import { PLAYER, WEAPONS, GRAVITY, GROUND, LEVEL_W } from "./config.js";
import { platforms } from "./level.js";
import { clamp, rnd } from "./util.js";
import { shell, flash, puff, floater } from "./particles.js";
import { sfx } from "./audio.js";

export function updatePlayer(dt) {
  const p = state.player, k = state.keys;
  if (p.hp <= 0) return;
  // Run
  const left = k.KeyA || k.ArrowLeft, right = k.KeyD || k.ArrowRight;
  const want = (right ? 1 : 0) - (left ? 1 : 0);
  p.vx = want * PLAYER.speed;
  // Jump / drop
  if ((k.KeyW || k.Space || k.ArrowUp) && p.onGround && !p.jumpHeld) { p.vy = -PLAYER.jump; p.onGround = false; sfx("jump", 0.1); puff(p.x, p.y, 3, "#bdbdbd"); }
  p.jumpHeld = !!(k.KeyW || k.Space || k.ArrowUp);
  if ((k.KeyS || k.ArrowDown) && p.onGround && p.y < GROUND) p.dropping = 0.25;   // fall through a platform
  if (p.dropping > 0) p.dropping -= dt;
  // Gravity and platforms (one-way: only land when falling onto the top)
  const wasGround = p.onGround;
  p.vy += GRAVITY * dt;
  const prevY = p.y;
  p.x = clamp(p.x + p.vx * dt, 14, LEVEL_W - 14);
  p.y += p.vy * dt;
  p.onGround = false;
  if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
  else if (p.vy >= 0 && p.dropping <= 0) {
    for (const pl of platforms) if (p.x > pl.x - 6 && p.x < pl.x + pl.w + 6 && prevY <= pl.y + 1 && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.onGround = true; }
  }
  if (p.onGround && !wasGround) { sfx("land", 0.1); puff(p.x, p.y, 2, "#bdbdbd"); }
  // Aim at the mouse (world coordinates)
  const mx = state.mouse.x + state.camX, my = state.mouse.y;
  p.aim = Math.atan2(my - (p.y - 32), mx - p.x);
  p.dir = Math.cos(p.aim) >= 0 ? 1 : -1;
  if (want !== 0 && p.onGround) p.phase += dt * 11; else if (p.onGround) p.phase = 0;
  // Shoot
  p.cd -= dt;
  if (p.hurt > 0) p.hurt -= dt;
  if (p.flash > 0) p.flash -= dt;
  if (state.mouse.down && p.cd <= 0) fire(p);
}

function fire(p) {
  const w = WEAPONS[p.weapon];
  if (w.ammo !== null && p.ammo[p.weapon] <= 0) { sfx("empty", 0.2); p.cd = 0.3; floater(p.x, p.y - 70, "click!", "#9e9e9e", 13); switchTo(p, 1); return; }
  if (w.ammo !== null) p.ammo[p.weapon]--;
  p.cd = 1 / w.rate;
  const ox = p.x + Math.cos(p.aim) * 30, oy = p.y - 32 + Math.sin(p.aim) * 30;
  for (let i = 0; i < w.pellets; i++) {
    const a = p.aim + rnd(-w.spread, w.spread);
    state.bullets.push({ x: ox, y: oy, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, dmg: w.damage, knock: w.knock, color: w.color, life: 0.9, trail: [] });
  }
  flash(ox, oy, p.aim, w.pellets > 1 ? 16 : 10);
  shell(p.x - p.dir * 4, p.y - 34, p.dir);
  p.recoil = 1;
  state.shake = Math.max(state.shake, w.pellets > 1 ? 6 : 2);
  sfx(w.sound, 0.03);
}

export function switchTo(p, n) {
  if (!WEAPONS[n] || p.weapon === n) return;
  p.weapon = n; p.cd = 0.25; sfx("reload", 0.1);
}

export function hurtPlayer(dmg, fromX) {
  const p = state.player;
  if (p.hurt > 0 || p.hp <= 0) return;
  p.hp -= dmg; p.hurt = PLAYER.invuln; p.flash = 0.15;
  p.vx = 0; p.vy = -220; p.x += Math.sign(p.x - fromX) * 18;
  state.shake = 8;
  sfx("bite", 0.1);
  if (p.fedora && Math.random() < 0.35) { p.fedora = false; state.gibs.push({ x: p.x, y: p.y - 60, vx: -Math.sign(fromX - p.x) * 120, vy: -260, w: 18, h: 7, rot: 0, vr: 6, life: 4, color: "#212121", hat: true }); }
  if (p.hp <= 0) { p.hp = 0; sfx("dead"); }
}
