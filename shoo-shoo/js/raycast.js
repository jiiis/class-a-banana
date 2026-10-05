import { W, H, FOV } from "./config.js";
import { grid, MAP_W, MAP_H } from "./map.js";
import { walls, sprites, TEX } from "./textures.js";
import { state } from "./state.js";

export const canvas = document.getElementById("c");
export const ctx = canvas.getContext("2d");
const zbuf = new Float32Array(W);
const COL = 2;                                     // pixels per ray (2 = 480 rays, plenty sharp and fast)

export function renderWorld() {
  const p = state.player;
  const horizon = H / 2 + p.pitch + Math.sin(p.bob) * 3;
  // Sky and floor, darker with distance from the horizon (cheap depth cue)
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#5d7fa8"); sky.addColorStop(1, "#c9d6e3");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, Math.max(0, horizon));
  const floor = ctx.createLinearGradient(0, horizon, 0, H);
  floor.addColorStop(0, "#4a4236"); floor.addColorStop(0.25, "#7a6a50"); floor.addColorStop(1, "#a8976f");
  ctx.fillStyle = floor; ctx.fillRect(0, Math.max(0, horizon), W, H - horizon);

  // Walls by DDA, one ray per COL pixels
  const dirX = Math.cos(p.a), dirY = Math.sin(p.a);
  const planeX = -dirY * Math.tan(FOV / 2), planeY = dirX * Math.tan(FOV / 2);
  for (let sx = 0; sx < W; sx += COL) {
    const cam = (2 * (sx + COL / 2)) / W - 1;
    const rx = dirX + planeX * cam, ry = dirY + planeY * cam;
    let mx = Math.floor(p.x), my = Math.floor(p.y);
    const ddx = Math.abs(1 / (rx || 1e-9)), ddy = Math.abs(1 / (ry || 1e-9));
    let stepX, stepY, sdx, sdy;
    if (rx < 0) { stepX = -1; sdx = (p.x - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - p.x) * ddx; }
    if (ry < 0) { stepY = -1; sdy = (p.y - my) * ddy; } else { stepY = 1; sdy = (my + 1 - p.y) * ddy; }
    let side = 0, tile = 0, guard = 0;
    while (guard++ < 64) {
      if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
      if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) { tile = 1; break; }
      tile = grid[my][mx]; if (tile) break;
    }
    const dist = side === 0 ? sdx - ddx : sdy - ddy;                 // perpendicular distance: no fish-eye
    const h = H / Math.max(dist, 0.01);
    const top = horizon - h / 2;
    let wallX = side === 0 ? p.y + dist * ry : p.x + dist * rx; wallX -= Math.floor(wallX);
    let tx = Math.floor(wallX * TEX); if ((side === 0 && rx > 0) || (side === 1 && ry < 0)) tx = TEX - tx - 1;
    ctx.drawImage(walls[tile] || walls[1], tx, 0, 1, TEX, sx, top, COL, h);
    const shade = Math.min(0.75, dist / 14 + (side === 1 ? 0.18 : 0));   // side walls darker, far walls fade
    if (shade > 0.02) { ctx.fillStyle = `rgba(20,18,30,${shade})`; ctx.fillRect(sx, top, COL, h); }
    for (let i = 0; i < COL; i++) zbuf[sx + i] = dist;
  }

  // Sprites: bots, bomb, kit. Farthest first so near ones overlap.
  const items = [];
  for (const b of state.bots) items.push({ x: b.x, y: b.y, img: b.hp <= 0 ? sprites.tDead : b.shootFlash > 0 ? sprites.tShoot : sprites.t[b.frame], scale: 1, dead: b.hp <= 0 });
  if (state.bomb) items.push({ x: state.bomb.x, y: state.bomb.y, img: sprites.bomb, scale: 0.8, blink: state.bomb.planted });
  for (const it of items) { const dx = it.x - p.x, dy = it.y - p.y; it.dist = Math.hypot(dx, dy); it.ang = Math.atan2(dy, dx) - p.a; }
  items.sort((a, b) => b.dist - a.dist);
  for (const it of items) {
    let ang = it.ang; while (ang > Math.PI) ang -= Math.PI * 2; while (ang < -Math.PI) ang += Math.PI * 2;
    if (Math.abs(ang) > FOV / 2 + 0.4) continue;
    const depth = it.dist * Math.cos(ang);
    if (depth < 0.2) continue;
    const size = (H / depth) * it.scale;
    const cx = (W / 2) * (1 + Math.tan(ang) / Math.tan(FOV / 2));
    const spriteH = size, spriteW = size * (64 / 96);
    const top = horizon - spriteH / 2 + (1 - it.scale) * spriteH * 0.6;
    const left = Math.floor(cx - spriteW / 2);
    const shade = Math.min(0.7, depth / 14);
    for (let x = Math.max(0, left); x < Math.min(W, left + spriteW); x++) {
      if (zbuf[x] <= depth) continue;
      const u = Math.floor(((x - left) / spriteW) * 64);
      ctx.drawImage(it.img, u, 0, 1, 96, x, top, 1, spriteH);
    }
    if (shade > 0.02) { ctx.save(); ctx.beginPath(); for (let x = Math.max(0, left); x < Math.min(W, left + spriteW); x++) if (zbuf[x] > depth) ctx.rect(x, top, 1, spriteH); ctx.clip(); ctx.globalCompositeOperation = "source-atop"; ctx.restore(); }
    if (it.blink && Math.floor(state.time * (state.bomb.timer < 10 ? 8 : 3)) % 2) { ctx.fillStyle = "#ff1744"; ctx.beginPath(); ctx.arc(cx - spriteW * 0.15, top + spriteH * 0.78, Math.max(1.5, size * 0.02), 0, 7); ctx.fill(); }
  }
}

// Is a point on screen hidden behind a wall? (used for hit detection against the wall depth)
export const depthAt = (x) => zbuf[Math.max(0, Math.min(W - 1, Math.floor(x)))];
