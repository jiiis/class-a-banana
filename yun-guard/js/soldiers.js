import { state } from "./state.js";
import { SOLDIER_RESPAWN, ENGAGE_RANGE } from "./config.js";
import { hurt } from "./combat.js";
import { soldierDamage, soldierRate, soldierCount, soldierHp, abilityDef } from "./towers.js";
import { dist } from "./util.js";
import { sfx } from "./audio.js";

const SOLDIER_SPEED = 90;

export function updateSoldiers(t, dt) {
  const n = soldierCount(t);
  while (t.soldiers.length < n) {
    t.soldiers.push({ x: t.x, y: t.y, hp: soldierHp(t), maxHp: soldierHp(t), cd: 0, respawn: 0, target: null, phase: Math.random() * 6, dir: 1, moving: false, swing: 0 });
  }

  t.soldiers.forEach((s, i) => {
    // Upgrades make soldiers tougher
    const mh = soldierHp(t);
    if (s.maxHp !== mh) { s.hp += mh - s.maxHp; s.maxHp = mh; }
    s.level = Math.min(t.level, 3);                       // better armour at higher levels (drawing only)
    s.ability = t.ability || null;
    const ab = abilityDef(t);

    // Each soldier has a spot in the formation around the rally point
    const off = (i - (n - 1) / 2) * 16;
    s.home = { x: t.rally.x + off, y: t.rally.y + off * 0.4 };

    if (s.hp <= 0) {                                      // fallen: wait to respawn at the barracks
      s.respawn -= dt;
      if (s.respawn <= 0) { s.hp = s.maxHp; s.x = t.x; s.y = t.y; }
      return;
    }

    // Choose a monster near the rally point, preferring one no squadmate is already fighting
    if (!s.target || s.target.dead || s.target.reached || dist(s.target, s.home) > ENGAGE_RANGE) {
      const near = state.enemies
        .filter((e) => !e.dead && !e.def.flying && dist(e, s.home) <= ENGAGE_RANGE)   // can't reach flying monsters
        .sort((a, b) => b.travelled - a.travelled);
      s.target = near.find((e) => !t.soldiers.some((o) => o !== s && o.hp > 0 && o.target === e)) || near[0] || null;
    }

    const dest = s.target || s.home;
    const d = dist(s, dest);
    s.moving = false;
    if (s.swing > 0) s.swing -= dt;

    if (s.target && d <= 16) {                            // in melee: block and trade blows
      s.target.blocked = true;
      s.dir = s.target.x >= s.x ? 1 : -1;
      s.cd -= dt;
      if (s.cd <= 0) {
        hurt(s.target, soldierDamage(t), t.def.type);
        if (ab?.cleave) for (const e of state.enemies) if (e !== s.target && !e.dead && !e.def.flying && dist(e, s) <= ab.cleave) hurt(e, soldierDamage(t) * 0.6, t.def.type);   // berserkers cleave
        s.cd = 1 / soldierRate(t); s.swing = 0.2; sfx("clash", 0.12);
      }
      if (ab?.regen) s.hp = Math.min(s.maxHp, s.hp + ab.regen * dt);   // paladins heal even while fighting
      s.target.atkCd = (s.target.atkCd ?? 0.5) - dt;
      if (s.target.atkCd <= 0) {
        s.hp -= s.target.def.attack * (1 - (ab?.armor || 0));
        s.target.atkCd = 1;
        if (s.hp <= 0) { s.respawn = SOLDIER_RESPAWN; s.target = null; }
      }
    } else if (d > 1) {                                   // walk to the fight or back home
      const step = Math.min(SOLDIER_SPEED * dt, d);
      const dx = dest.x - s.x;
      s.x += (dx / d) * step;
      s.y += ((dest.y - s.y) / d) * step;
      if (Math.abs(dx) > 0.5) s.dir = Math.sign(dx);
      s.moving = true;
      s.phase += dt * 12;
    } else if (s.hp < s.maxHp) {                          // resting at home: slowly heal
      s.hp = Math.min(s.maxHp, s.hp + 6 * dt);
    }
  });
}
