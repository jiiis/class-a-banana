import { state } from "./state.js";
import { map } from "./map.js";
import { dist } from "./util.js";
import { addFloater, addBurst, addBlood } from "./combat.js";
import { sfx } from "./audio.js";

// How each animal behaves: how fast it moves, how far it wanders from home,
// and how long it stands around (grazing) between walks.
const BEHAVIOUR = {
  bunny: { speed: 70, wander: 35, idleMin: 1.0, idleMax: 3.0, hops: true },
  deer:  { speed: 40, wander: 40, idleMin: 2.0, idleMax: 5.0 },
  sheep: { speed: 25, wander: 30, idleMin: 2.5, idleMax: 6.0 },
  fox:   { speed: 60, wander: 45, idleMin: 1.5, idleMax: 4.0 },
  chicken: { speed: 35, wander: 25, idleMin: 1.0, idleMax: 3.0 },
  cow:   { speed: 22, wander: 30, idleMin: 3.0, idleMax: 7.0 },
  duck:  { speed: 32, wander: 30, idleMin: 1.0, idleMax: 3.5 },
};

export function initCritters() {
  state.critters = map.critters.map((c) => ({
    type: c.type, home: { x: c.x, y: c.y }, x: c.x, y: c.y,
    dir: Math.random() < 0.5 ? 1 : -1, phase: Math.random() * 6,
    idle: 1 + Math.random() * 2, target: null,
    hp: 10, fleeing: false,
  }));
}

// A hero caught one. It vanishes in a puff, leaves a small splash, and earns a little gold.
export function slayCritter(c) {
  if (!state.critters.includes(c)) return;
  state.critters = state.critters.filter((x) => x !== c);
  state.gold += 2;
  addFloater(c.x, c.y - 16, "+2", "#ffd54f");
  addBurst(c.x, c.y, 12, "rgba(255,255,255,0.8)");
  addBlood(c.x, c.y, c.type === "deer" || c.type === "cow" ? 22 : c.type === "chicken" || c.type === "duck" ? 10 : 16);
  sfx("die", 0.08); sfx("coin", 0.12);
}

export function updateCritters(dt) {
  const hunters = state.heroes.filter((h) => h.hp > 0 && h.hunt);
  const huntedBy = (c) => hunters.find((h) => h.hunt === c);
  for (const c of state.critters) {
    const b = BEHAVIOUR[c.type];
    const hunter = huntedBy(c);
    c.hunted = !!hunter;
    // Being chased by a hero: run away (heroes are faster, but it's a chase)
    if (hunter && dist(c, hunter) < 90) {
      const dx = c.x - hunter.x, dy = c.y - hunter.y, d = Math.hypot(dx, dy) || 1;
      c.target = { x: Math.max(16, Math.min(944, c.x + (dx / d) * 40)), y: Math.max(20, Math.min(585, c.y + (dy / d) * 40)) };
      c.dir = dx >= 0 ? 1 : -1;
      c.fleeing = true;
    }
    if (c.target) {
      const d = dist(c, c.target);
      const step = Math.min(b.speed * (c.fleeing ? 1.4 : 1) * dt, d);
      c.x += ((c.target.x - c.x) / d) * step;
      c.y += ((c.target.y - c.y) / d) * step;
      c.phase += dt * (b.hops ? 9 : 8);
      if (d <= step + 0.5) { c.target = null; c.idle = c.fleeing ? 0.2 : b.idleMin + Math.random() * (b.idleMax - b.idleMin); c.phase = 0; c.fleeing = false; }
    } else {
      c.idle -= dt;
      c.phase += dt * 2;                       // slow grazing nod
      if (c.idle <= 0) {
        const a = Math.random() * Math.PI * 2, r = b.wander * (0.4 + Math.random() * 0.6);
        c.target = { x: c.home.x + Math.cos(a) * r, y: c.home.y + Math.sin(a) * r };
        c.dir = c.target.x >= c.x ? 1 : -1;
      }
    }
  }
}
