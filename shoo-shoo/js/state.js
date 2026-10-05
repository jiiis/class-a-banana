import { WEAPONS } from "./config.js";

export const state = {
  running: false, time: 0, locked: false,
  keys: {}, mouse: { dx: 0, dy: 0, down: false },
  player: null, bots: [], bullets: [], hits: [], decals: [],
  round: 0, ctScore: 0, tScore: 0, phase: "freeze", phaseTime: 0, roundTime: 0,
  bomb: null,                          // { x, y, planted, timer, carrier }
  defusing: 0, money: 800, feed: [], status: "", flash: 0, hitmarker: 0, hurtDir: 0, buyOpen: false,
  over: false, kills: 0,
};

export function newPlayer(spawn, keep) {
  const p = {
    x: spawn.x, y: spawn.y, a: -Math.PI / 2, pitch: 0, hp: 100, armor: keep?.armor ?? 0, helmet: keep?.helmet ?? false, kit: keep?.kit ?? false,
    weapon: keep?.hasRifle ? "ak" : "usp", hasRifle: keep?.hasRifle ?? false,
    ammo: { usp: { mag: WEAPONS.usp.mag, reserve: WEAPONS.usp.reserve }, ak: { mag: WEAPONS.ak.mag, reserve: WEAPONS.ak.reserve }, knife: { mag: Infinity, reserve: Infinity } },
    cd: 0, reloading: 0, recoil: 0, kick: 0, bob: 0, moving: false, dead: false, shots: 0,
  };
  return p;
}
