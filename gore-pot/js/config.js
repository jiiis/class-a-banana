// ============================================================
//  GORE POT settings - tweak away!
// ============================================================
export const W = 960, H = 540;
export const GROUND = 450;              // y of the pavement
export const LEVEL_W = 3200;            // how wide the street is
export const GRAVITY = 1700;

export const PLAYER = {
  speed: 260, jump: 620, hp: 100, w: 26, h: 56,
  invuln: 0.6,                          // seconds of safety after being hit
};

// Weapons: key = number key. spread in radians, pellets per shot, ammo null = infinite.
export const WEAPONS = {
  1: { name: "Pistol",    damage: 2, rate: 4,  speed: 900,  spread: 0.03, pellets: 1, ammo: null, knock: 120, color: "#ffe082", sound: "pistol" },
  2: { name: "Tommy Gun", damage: 1, rate: 12, speed: 1000, spread: 0.09, pellets: 1, ammo: 150,  knock: 60,  color: "#ffd54f", sound: "tommy" },
  3: { name: "Shotgun",   damage: 2, rate: 1.4, speed: 850, spread: 0.22, pellets: 6, ammo: 24,   knock: 320, color: "#ffab40", sound: "shotgun" },
};

// Zombies. hp in bullet-points, speed px/s, attack damage per bite, score when killed.
export const ZOMBIES = {
  shambler: { hp: 4,  speed: 55,  w: 26, h: 54, attack: 10, score: 10, color: "#7cb342", skin: "#9ccc65" },
  runner:   { hp: 2,  speed: 170, w: 22, h: 48, attack: 8,  score: 15, color: "#8d6e63", skin: "#a1887f" },
  brute:    { hp: 14, speed: 40,  w: 44, h: 72, attack: 22, score: 40, color: "#5d4037", skin: "#8bc34a" },
  cop:      { hp: 6,  speed: 85,  w: 26, h: 56, attack: 12, score: 20, color: "#283593", skin: "#aed581" },
};

export const WAVE_BREAK = 6;            // seconds between waves
export function makeWave(n) {
  const list = [];
  const add = (type, count) => { for (let i = 0; i < count; i++) list.push(type); };
  add("shambler", 4 + n * 2);
  if (n >= 2) add("runner", n);
  if (n >= 3) add("cop", Math.ceil(n / 2));
  if (n >= 4) add("brute", Math.ceil((n - 2) / 2));
  return list;
}
export const SPAWN_GAP = (n) => Math.max(0.35, 1.3 - n * 0.08);   // seconds between zombies appearing
