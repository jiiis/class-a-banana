import { state } from "./state.js";
import { ZOMBIES, GRAVITY, GROUND, LEVEL_W, W, makeWave, SPAWN_GAP, WAVE_BREAK } from "./config.js";
import { platforms } from "./level.js";
import { rnd, pick, overlaps } from "./util.js";
import { blood, gibs, floater, puff } from "./particles.js";
import { hurtPlayer } from "./player.js";
import { sfx } from "./audio.js";

export function startWave() {
  state.wave++;
  state.spawnQueue = makeWave(state.wave).sort(() => Math.random() - 0.5);
  state.spawnTimer = 0;
  state.countdown = null;
  floater(state.player.x, state.player.y - 110, `WAVE ${state.wave}`, "#f2b134", 30);
  sfx("wave");
  // A few pickups appear for the new wave
  for (let i = 0; i < 2 + Math.floor(state.wave / 2); i++) dropPickup(rnd(100, LEVEL_W - 100), Math.random() < 0.4 ? "cannoli" : pick(["tommy", "shotgun"]));
}

export function dropPickup(x, kind, y = GROUND) {
  const onPlat = platforms.find((pl) => x > pl.x && x < pl.x + pl.w);
  state.pickups.push({ x, y: Math.random() < 0.4 && onPlat ? onPlat.y : y, kind, bob: rnd(0, 6), life: 30 });
}

function spawnZombie(type) {
  const def = ZOMBIES[type];
  // Appear just off screen on the side with fewer zombies
  const left = state.zombies.filter((z) => z.x < state.player.x).length, right = state.zombies.length - left;
  const side = left === right ? (Math.random() < 0.5 ? -1 : 1) : left < right ? -1 : 1;
  let x = state.camX + (side < 0 ? -40 : W + 40);
  if (x < 20) x = state.camX + W + 40; else if (x > LEVEL_W - 20) x = state.camX - 40;
  state.zombies.push({ type, def, x, y: GROUND, vx: 0, vy: 0, w: def.w, h: def.h, hp: def.hp, maxHp: def.hp, dir: side < 0 ? 1 : -1, phase: rnd(0, 6), cd: rnd(0.5, 1.2), flash: 0, lean: rnd(-0.08, 0.08), jumpCd: rnd(0, 1) });
  if (type === "brute") sfx("roar", 0.5); else if (Math.random() < 0.3) sfx("groan", 0.4);
}

export function updateZombies(dt) {
  const p = state.player;
  // Waves
  if (state.spawnQueue.length) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) { spawnZombie(state.spawnQueue.pop()); state.spawnTimer = SPAWN_GAP(state.wave); }
  } else if (state.zombies.length === 0 && state.countdown === null && p.hp > 0) {
    state.countdown = WAVE_BREAK;
    if (state.wave > 0) floater(p.x, p.y - 100, "Wave cleared!", "#aed581", 22);
  }
  if (state.countdown !== null) { state.countdown -= dt; if (state.countdown <= 0) startWave(); }

  for (const z of state.zombies) {
    if (z.flash > 0) z.flash -= dt;
    if (z.stun > 0) { z.stun -= dt; z.vx *= 0.9; }
    else {
      const dx = p.x - z.x;
      z.dir = Math.sign(dx) || z.dir;
      const close = Math.abs(dx) < (z.w + p.w) / 2 + 4 && Math.abs(p.y - z.y) < 40;
      z.vx = close ? 0 : z.dir * z.def.speed;
      // Hop up onto platforms when the player is above
      z.jumpCd -= dt;
      if (z.onGround && p.y < z.y - 40 && Math.abs(dx) < 120 && z.jumpCd <= 0) { z.vy = -560; z.onGround = false; z.jumpCd = 1.5; }
      z.cd -= dt;
      if (close && z.cd <= 0) { z.cd = 1.1; z.bite = 0.25; hurtPlayer(z.def.attack, z.x); }
    }
    if (z.bite > 0) z.bite -= dt;
    z.vy += GRAVITY * dt;
    const prevY = z.y;
    z.x += z.vx * dt; z.y += z.vy * dt;
    z.onGround = false;
    if (z.y >= GROUND) { z.y = GROUND; z.vy = 0; z.onGround = true; }
    else if (z.vy >= 0) for (const pl of platforms) if (z.x > pl.x - 4 && z.x < pl.x + pl.w + 4 && prevY <= pl.y + 1 && z.y >= pl.y) { z.y = pl.y; z.vy = 0; z.onGround = true; }
    // Walk off the platform edge if the player is below
    z.phase += dt * (z.vx ? Math.abs(z.vx) / 12 : 2);
  }

  // Bullets hit zombies
  for (const b of state.bullets) {
    b.life -= dt;
    b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 4) b.trail.shift();
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y >= GROUND) { b.life = 0; puff(b.x, GROUND, 2, "#bdbdbd"); continue; }
    for (const z of state.zombies) {
      if (z.hp <= 0) continue;
      if (Math.abs(b.x - z.x) < z.w / 2 + 3 && b.y < z.y && b.y > z.y - z.h) {
        b.life = 0;
        z.hp -= b.dmg; z.flash = 0.1; z.stun = 0.12;
        z.vx = Math.sign(b.vx) * b.knock; z.x += Math.sign(b.vx) * b.knock * 0.02;
        const headshot = b.y < z.y - z.h * 0.75;
        blood(b.x, b.y, headshot ? 10 : 5, headshot ? 1.3 : 0.8);
        sfx("hit", 0.05);
        if (z.hp <= 0) killZombie(z, b, headshot);
        break;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  state.zombies = state.zombies.filter((z) => z.hp > 0);

  // Pickups
  for (const k of state.pickups) {
    k.life -= dt; k.bob += dt * 3;
    if (overlaps(p, { x: k.x, y: k.y, w: 20, h: 20 })) {
      k.life = 0;
      if (k.kind === "cannoli") { p.hp = Math.min(p.maxHp, p.hp + 35); floater(p.x, p.y - 80, "+35 cannoli!", "#ffe0b2", 18); sfx("cannoli"); }
      else if (k.kind === "tommy") { p.ammo[2] += 60; floater(p.x, p.y - 80, "+60 rounds", "#ffd54f"); sfx("pickup"); }
      else if (k.kind === "shotgun") { p.ammo[3] += 8; floater(p.x, p.y - 80, "+8 shells", "#ffab40"); sfx("pickup"); }
    }
  }
  state.pickups = state.pickups.filter((k) => k.life > 0);
}

function killZombie(z, b, headshot) {
  const bonus = headshot ? 2 : 1;
  state.score += z.def.score * bonus; state.kills++;
  floater(z.x, z.y - z.h - 10, headshot ? `HEADSHOT +${z.def.score * 2}` : `+${z.def.score}`, headshot ? "#f2b134" : "#fff", headshot ? 18 : 14);
  blood(z.x, z.y - z.h / 2, z.type === "brute" ? 30 : 16, z.type === "brute" ? 1.6 : 1);
  gibs(z.x, z.y - z.h / 2, z.type === "brute" ? 9 : 5, z.def.color);
  state.shake = Math.max(state.shake, z.type === "brute" ? 10 : 3);
  sfx("splat", 0.05);
  if (Math.random() < (z.type === "brute" ? 0.8 : 0.15)) dropPickup(z.x, Math.random() < 0.5 ? "cannoli" : pick(["tommy", "shotgun"]), z.y);
}
