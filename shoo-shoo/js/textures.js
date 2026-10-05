// All textures and sprites are painted once at start-up onto small offscreen canvases.
export const TEX = 64;
const make = (w, h, paint) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); paint(x, w, h); return c; };
const seeded = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

function bricks(x, base, mortar, rows, seed) {
  const r = seeded(seed);
  x.fillStyle = mortar; x.fillRect(0, 0, TEX, TEX);
  const bh = TEX / rows;
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? TEX / 4 : 0;
    for (let bx = -TEX / 2; bx < TEX; bx += TEX / 2) {
      const shade = 0.85 + r() * 0.3;
      x.fillStyle = tint(base, shade); x.fillRect(bx + off + 1, row * bh + 1, TEX / 2 - 2, bh - 2);
      if (r() < 0.3) { x.fillStyle = "rgba(0,0,0,0.12)"; x.fillRect(bx + off + 4 + r() * 10, row * bh + 3, 6, 3); }
    }
  }
}
function tint(hex, k) { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, ((n >> 16) & 255) * k), g = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k); return `rgb(${r | 0},${g | 0},${b | 0})`; }
function noise(x, color, n, seed, size = 1) { const r = seeded(seed); for (let i = 0; i < n; i++) { x.fillStyle = color; x.globalAlpha = 0.15 + r() * 0.25; x.fillRect(r() * TEX, r() * TEX, size, size); } x.globalAlpha = 1; }

export const walls = {
  1: make(TEX, TEX, (x) => { bricks(x, "#d8b36a", "#9c7a3c", 8, 3); noise(x, "#5a4420", 120, 4); }),                      // sandstone
  2: make(TEX, TEX, (x) => { x.fillStyle = "#8f8f8a"; x.fillRect(0, 0, TEX, TEX); noise(x, "#444", 400, 9, 2); x.fillStyle = "#6a6a66"; x.fillRect(0, 30, TEX, 3); x.fillRect(30, 0, 3, TEX); x.fillStyle = "rgba(90,70,40,0.35)"; x.fillRect(4, 40, 10, 24); }),   // concrete
  3: make(TEX, TEX, (x) => { x.fillStyle = "#a8743a"; x.fillRect(0, 0, TEX, TEX); for (let i = 0; i < TEX; i += 8) { x.fillStyle = i % 16 ? "#b9834a" : "#976530"; x.fillRect(0, i, TEX, 8); } x.strokeStyle = "#5a3a14"; x.lineWidth = 4; x.strokeRect(2, 2, TEX - 4, TEX - 4); x.beginPath(); x.moveTo(4, 4); x.lineTo(TEX - 4, TEX - 4); x.moveTo(TEX - 4, 4); x.lineTo(4, TEX - 4); x.stroke(); }),   // crate
  4: make(TEX, TEX, (x) => { x.fillStyle = "#4e3a2a"; x.fillRect(0, 0, TEX, TEX); x.fillStyle = "#6b5038"; for (let i = 4; i < TEX; i += 12) x.fillRect(i, 2, 8, TEX - 4); x.fillStyle = "#c9a227"; x.beginPath(); x.arc(50, 34, 3, 0, 7); x.fill(); x.fillStyle = "#2b2016"; x.fillRect(0, 0, TEX, 3); x.fillRect(0, TEX - 3, TEX, 3); }),   // door
  5: make(TEX, TEX, (x) => { x.fillStyle = "#6c7a86"; x.fillRect(0, 0, TEX, TEX); x.fillStyle = "#56626c"; for (let i = 0; i < TEX; i += 16) x.fillRect(0, i, TEX, 2); for (const [rx, ry] of [[6, 6], [TEX - 8, 6], [6, TEX - 8], [TEX - 8, TEX - 8]]) { x.fillStyle = "#38424a"; x.beginPath(); x.arc(rx, ry, 2.5, 0, 7); x.fill(); } x.fillStyle = "#f5c542"; x.fillRect(20, 26, 24, 12); x.fillStyle = "#222"; x.font = "bold 9px sans-serif"; x.fillText("DANGER", 21, 35); }),   // metal
};

// Sprites are 64 wide and 96 tall: feet at the bottom, head at the top.
const SW = 64, SH = 96;
function bot(x, frame, team, dead = false, shooting = false) {
  const skin = "#e0b48a", suit = team === "t" ? "#8a6d3b" : "#3b4b6a", trim = team === "t" ? "#c9a227" : "#7fb3ff";
  x.clearRect(0, 0, SW, SH);
  if (dead) { x.save(); x.translate(SW / 2, SH - 14); x.rotate(Math.PI / 2); x.translate(-SW / 2, -SH + 40); }
  const step = frame === 1 ? 6 : frame === 2 ? -6 : 0;
  x.fillStyle = "#222"; x.fillRect(22, 70, 8, 24 + step * 0); x.fillRect(34, 70, 8, 24);               // legs
  x.fillStyle = "#1a1a1a"; x.fillRect(20 - step, 90, 12, 6); x.fillRect(34 + step, 90, 12, 6);         // boots
  x.fillStyle = suit; x.fillRect(18, 34, 28, 38);                                                        // torso
  x.fillStyle = trim; x.fillRect(18, 34, 28, 5); x.fillRect(28, 40, 8, 26);                              // vest straps
  if (team === "ct") { x.fillStyle = "#1e2a44"; x.fillRect(22, 42, 20, 16); }                            // kevlar
  x.fillStyle = suit; x.fillRect(10, 38, 8, 26); x.fillRect(46, 38, 8, 26);                             // arms
  x.fillStyle = skin; x.fillRect(10, 62, 8, 7); x.fillRect(46, 62, 8, 7);                               // hands
  if (shooting) { x.fillStyle = "#333"; x.fillRect(30, 50, 30, 6); x.fillRect(48, 56, 6, 10); x.fillStyle = "#ffeb3b"; x.beginPath(); x.arc(62, 53, 5, 0, 7); x.fill(); }
  else { x.fillStyle = "#333"; x.fillRect(40, 54, 18, 6); x.fillRect(42, 60, 5, 10); }                   // rifle
  x.fillStyle = skin; x.fillRect(22, 12, 20, 22);                                                        // head
  x.fillStyle = team === "t" ? "#3a3a3a" : "#2d3b5c"; x.fillRect(20, 8, 24, 10);                         // balaclava / helmet
  if (team === "ct") x.fillRect(20, 8, 24, 14);
  x.fillStyle = "#111"; x.fillRect(26, 22, 4, 3); x.fillRect(34, 22, 4, 3);                              // eyes
  if (team === "t") { x.fillStyle = "#3a3a3a"; x.fillRect(22, 26, 20, 8); }                              // mask over mouth
  if (dead) { x.restore(); x.fillStyle = "rgba(160,20,20,0.6)"; x.beginPath(); x.ellipse(SW / 2, SH - 6, 26, 5, 0, 0, 7); x.fill(); }
}
export const sprites = {
  t: [0, 1, 2].map((f) => make(SW, SH, (x) => bot(x, f, "t"))),
  tShoot: make(SW, SH, (x) => bot(x, 0, "t", false, true)),
  tDead: make(SW, SH, (x) => bot(x, 0, "t", true)),
  bomb: make(SW, SH, (x) => { x.fillStyle = "#333"; x.fillRect(16, 78, 32, 14); x.fillStyle = "#555"; x.fillRect(18, 72, 28, 8); x.fillStyle = "#c62828"; x.fillRect(22, 74, 6, 4); x.fillStyle = "#4caf50"; x.fillRect(30, 74, 12, 4); x.fillStyle = "#777"; x.fillRect(46, 70, 3, 20); }),
  kit: make(SW, SH, (x) => { x.fillStyle = "#1565c0"; x.fillRect(22, 78, 20, 14); x.fillStyle = "#fff"; x.fillRect(30, 80, 4, 10); x.fillRect(27, 83, 10, 4); }),
};
