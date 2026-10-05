import { PLAYER } from "./config.js";

export const state = {
  running: false, over: false, time: 0,
  score: 0, kills: 0, wave: 0, countdown: 2, spawnQueue: [], spawnTimer: 0,
  camX: 0,
  keys: {}, mouse: { x: 480, y: 270, down: false },
  player: null,
  zombies: [], bullets: [], particles: [], gibs: [], pickups: [], floaters: [], decals: [],
  shake: 0,
};

export function newPlayer(x) {
  return {
    x, y: 450, vx: 0, vy: 0, w: PLAYER.w, h: PLAYER.h, hp: PLAYER.hp, maxHp: PLAYER.hp,
    dir: 1, aim: 0, onGround: true, weapon: 1, ammo: { 1: null, 2: 150, 3: 24 }, cd: 0, hurt: 0, flash: 0, phase: 0, dropping: 0, fedora: true,
  };
}
