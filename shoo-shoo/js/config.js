// ============================================================
//  SHOO SHOO settings
// ============================================================
export const W = 960, H = 540;
export const FOV = (66 * Math.PI) / 180;
export const MOVE = 3.4, WALK = 1.7;          // cells per second
export const RADIUS = 0.25;                   // player / bot body radius in cells
export const ROUND_TIME = 105, FREEZE_TIME = 3, BOMB_TIME = 40, PLANT_TIME = 3, DEFUSE_TIME = 10, KIT_DEFUSE_TIME = 5;
export const ROUNDS_TO_WIN = 5;
export const BUY_TIME = 15;                   // seconds after the round starts when you can buy

// Weapons. dmg per hit, rate shots/s, spread (radians) at rest, kick = view jump per shot, hs = headshot multiplier
export const WEAPONS = {
  knife: { name: "Knife",  dmg: 55, rate: 1.8, spread: 0,     kick: 0,     hs: 1,   range: 1.3, mag: Infinity, reserve: Infinity, reload: 0,   melee: true,  sound: "knife" },
  usp:   { name: "USP-S",  dmg: 28, rate: 4.5, spread: 0.012, kick: 0.025, hs: 4,   range: 40,  mag: 12,       reserve: 36,       reload: 1.6, sound: "usp" },
  ak:    { name: "AK-47",  dmg: 34, rate: 10,  spread: 0.02,  kick: 0.035, hs: 4,   range: 60,  mag: 30,       reserve: 90,       reload: 2.4, sound: "ak", recoilGrow: 0.012 },
};
export const PRICES = { rifle: 2700, armor: 1000, kit: 400, ammo: 200 };
export const REWARD = { kill: 300, win: 3250, lose: 1400, plantBonus: 800 };

export const BOT = {
  hp: 100, speed: 2.1, dmg: 17, rate: 0.9, reaction: 0.7,       // seconds before a bot that spots you starts firing
  accuracy: 0.38,                                                // base hit chance at point blank, drops with distance
  count: 5,
};
