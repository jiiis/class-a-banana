import { ctx, circle, ellipse, poly, line, shadow } from "./gfx.js";
import { state } from "../state.js";

// Cute animals drawn with shapes. Each faces right; the canvas is flipped
// when the animal walks left. (0, 0) is the point where it touches the ground.
export function drawCritter(c) {
  const moving = !!c.target;
  if (c.hunted) circle(ctx, c.x, c.y + 1, 11, "rgba(229,57,53,0.2)", "#e53935", 1.5);   // being hunted
  else if (c === state.hoverCritter) {                                                   // mouse over it with a hero selected: show the target
    const pulse = 11 + Math.sin(state.time * 8) * 1.5;
    ctx.setLineDash([3, 3]);
    circle(ctx, c.x, c.y + 1, pulse, "rgba(255,213,79,0.18)", "#ffd54f", 1.5);
    ctx.setLineDash([]);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) line(ctx, c.x + dx * (pulse + 2), c.y + 1 + dy * (pulse + 2), c.x + dx * (pulse + 6), c.y + 1 + dy * (pulse + 6), "#ffd54f", 1.5);
  }
  const k = CRITTER_SCALE[c.type] || 1;                                      // small animals drawn smaller
  shadow(ctx, c.x, c.y + 1, (c.type === "deer" ? 11 : c.type === "chicken" ? 5 : 8) * k, 3 * k);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(c.dir * k, k);
  DRAW[c.type](c.phase, moving);
  ctx.restore();
}

const CRITTER_SCALE = { bunny: 0.7, chicken: 0.8, fox: 0.9 };

const DRAW = {
  bunny(phase, moving) {
    const hop = moving ? -Math.abs(Math.sin(phase)) * 6 : 0;
    ctx.translate(0, hop);
    ellipse(ctx, -2, -3, 4, 2, "#eeeeee");                         // back foot
    ellipse(ctx, 5, -2, 3, 1.8, "#eeeeee");                        // front foot
    ellipse(ctx, 0, -6, 7, 5, "#f5f5f5", "#bdbdbd", 1);            // body
    circle(ctx, -7, -6, 2.2, "#ffffff", "#bdbdbd", 1);             // tail
    circle(ctx, 7, -10, 4.5, "#f5f5f5", "#bdbdbd", 1);             // head
    ellipse(ctx, 5, -18, 1.6, 5, "#f5f5f5", "#bdbdbd", 1);         // ears
    ellipse(ctx, 8.5, -18, 1.6, 5, "#f5f5f5", "#bdbdbd", 1);
    ellipse(ctx, 5, -18, 0.7, 3.2, "#f8bbd0");
    ellipse(ctx, 8.5, -18, 0.7, 3.2, "#f8bbd0");
    circle(ctx, 9, -11, 0.9, "#212121");                           // eye
    circle(ctx, 11.5, -9, 0.8, "#f48fb1");                          // nose
  },

  deer(phase, moving) {
    const sw = moving ? Math.sin(phase) * 4 : 0;
    const nod = moving ? 0 : Math.sin(phase) * 2.5;                 // head bobs while grazing
    for (const [lx, d] of [[-8, 1], [-4, -1], [6, 1], [10, -1]]) line(ctx, lx, -12, lx + sw * d, 0, "#8d6e63", 2.5);
    ellipse(ctx, 0, -15, 12, 7, "#b07a3b", "#6d4c41", 1);          // body
    for (const [sx, sy] of [[-5, -16], [0, -19], [4, -14], [-1, -12]]) circle(ctx, sx, sy, 1.2, "#efdcc3");   // spots
    line(ctx, -12, -17, -16, -13, "#b07a3b", 3);                    // tail
    line(ctx, 10, -19, 15, -27 + nod, "#b07a3b", 5);                // neck
    ellipse(ctx, 17, -29 + nod, 5.5, 4, "#b07a3b", "#6d4c41", 1);   // head
    ellipse(ctx, 21.5, -28 + nod, 2.5, 1.8, "#8d6e63");             // muzzle
    circle(ctx, 23, -28.5 + nod, 0.9, "#212121");                   // nose
    circle(ctx, 18, -30.5 + nod, 1, "#212121");                     // eye
    poly(ctx, [[13, -32 + nod], [11, -37 + nod], [15, -33 + nod]], "#b07a3b", "#6d4c41", 1);   // ear
    line(ctx, 15, -33 + nod, 13, -41 + nod, "#5d4037", 1.5);        // antlers
    line(ctx, 14, -38 + nod, 11, -40 + nod, "#5d4037", 1.5);
    line(ctx, 15, -33 + nod, 18, -40 + nod, "#5d4037", 1.5);
    line(ctx, 17, -37 + nod, 20, -38 + nod, "#5d4037", 1.5);
  },

  fox(phase, moving) {
    const sw = moving ? Math.sin(phase) * 4 : 0;
    const nod = moving ? 0 : Math.sin(phase) * 1.5;
    for (const [lx, d] of [[-7, 1], [-3, -1], [5, 1], [8, -1]]) line(ctx, lx, -6, lx + sw * d, 0, "#4e342e", 2.2);
    ellipse(ctx, 0, -9, 11, 5.5, "#ef6c00", "#bf360c", 1);           // body
    ellipse(ctx, 2, -7, 7, 3, "#ffe0b2");                            // white belly
    line(ctx, -11, -10, -19, -7 + sw * 0.5, "#ef6c00", 5);           // bushy tail
    circle(ctx, -20, -6.5 + sw * 0.5, 3, "#fff3e0");                  // white tail tip
    circle(ctx, 11, -12 + nod, 5, "#ef6c00", "#bf360c", 1);           // head
    poly(ctx, [[8, -15 + nod], [9, -22 + nod], [12.5, -15.5 + nod]], "#ef6c00", "#bf360c", 1);   // ears
    poly(ctx, [[12, -15.5 + nod], [14.5, -21 + nod], [16, -14 + nod]], "#ef6c00", "#bf360c", 1);
    poly(ctx, [[9, -16 + nod], [9.5, -20 + nod], [11.5, -16 + nod]], "#3e2723");                   // black ear tips
    poly(ctx, [[13, -16 + nod], [14.5, -19.5 + nod], [15, -15 + nod]], "#3e2723");
    ellipse(ctx, 15, -10 + nod, 3.5, 2.5, "#fff3e0");                 // muzzle
    circle(ctx, 18, -10.5 + nod, 1.2, "#212121");                     // nose
    circle(ctx, 12.5, -13 + nod, 1.1, "#212121");                     // eye
  },

  chicken(phase, moving) {
    const sw = moving ? Math.sin(phase) * 2 : 0;
    const peck = moving ? 0 : Math.max(0, Math.sin(phase * 1.5)) * 3;
    line(ctx, -2, -4, -2 + sw, 0, "#f57f17", 1.5);                    // legs
    line(ctx, 2, -4, 2 - sw, 0, "#f57f17", 1.5);
    ellipse(ctx, 0, -8, 6, 4.5, "#fafafa", "#bdbdbd", 1);             // body
    for (const [tx, ty] of [[-7, -11], [-8, -9], [-7, -7]]) line(ctx, -5, -9, tx, ty, "#e0e0e0", 1.5);   // tail feathers
    ellipse(ctx, 1, -8, 3, 2, "#eeeeee");                             // wing
    circle(ctx, 6, -12 + peck, 3, "#fafafa", "#bdbdbd", 1);           // head
    poly(ctx, [[4.5, -14.5 + peck], [5.5, -17 + peck], [6.5, -15 + peck], [7.5, -17 + peck], [8, -14.5 + peck]], "#e53935");   // comb
    poly(ctx, [[8.5, -12 + peck], [11.5, -11 + peck], [8.5, -10.5 + peck]], "#fb8c00");               // beak
    circle(ctx, 8.5, -9.5 + peck, 1, "#e53935");                      // wattle
    circle(ctx, 7, -12.5 + peck, 0.8, "#212121");                     // eye
  },

  sheep(phase, moving) {
    const sw = moving ? Math.sin(phase) * 3 : 0;
    const graze = moving ? 0 : Math.max(0, Math.sin(phase)) * 3;    // head dips to nibble
    for (const [lx, d] of [[-6, 1], [-2, -1], [4, 1], [8, -1]]) line(ctx, lx, -8, lx + sw * d, 0, "#37474f", 2.5);
    for (const [bx, by, r] of [[-6, -11, 6], [0, -13, 7], [6, -11, 6], [-2, -9, 6], [3, -9, 6]]) circle(ctx, bx, by, r, "#fafafa", "#cfd8dc", 1);   // fluff
    ellipse(ctx, 11, -10 + graze, 4.5, 3.8, "#37474f");             // head
    ellipse(ctx, 8, -13 + graze, 2.5, 1.3, "#37474f");              // ear
    circle(ctx, 12.5, -11 + graze, 0.9, "#fff");                    // eye
    circle(ctx, 12.8, -11 + graze, 0.4, "#000");
  },
};
