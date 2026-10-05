// Tiny synthesised sound effects (no audio files needed). Unlocked on the first click/key.
let ctx = null, muted = localStorage.getItem("gorepot-mute") === "1";
const last = {};
export function unlockAudio() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); }
export function toggleMute() { muted = !muted; localStorage.setItem("gorepot-mute", muted ? "1" : "0"); return muted; }
export const isMuted = () => muted;
export function sfx(name, minGap = 0.04) {
  if (muted || !ctx || !SFX[name]) return;
  const now = ctx.currentTime;
  if (last[name] && now - last[name] < minGap) return;
  last[name] = now;
  SFX[name]();
}
function tone({ freq = 440, end = freq, type = "sine", dur = 0.2, vol = 0.3, delay = 0 }) {
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise({ dur = 0.3, vol = 0.3, filter = 1000, filterEnd = 200, type = "lowpass", delay = 0 }) {
  const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime + delay;
  src.buffer = buf; f.type = type; f.frequency.setValueAtTime(filter, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, filterEnd), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination); src.start(t);
}
const SFX = {
  pistol:  () => { noise({ dur: 0.1, vol: 0.35, filter: 2500, filterEnd: 400 }); tone({ freq: 220, end: 60, type: "square", dur: 0.08, vol: 0.15 }); },
  tommy:   () => { noise({ dur: 0.06, vol: 0.28, filter: 3000, filterEnd: 600 }); tone({ freq: 300, end: 90, type: "sawtooth", dur: 0.05, vol: 0.1 }); },
  shotgun: () => { noise({ dur: 0.3, vol: 0.5, filter: 1200, filterEnd: 100 }); tone({ freq: 120, end: 40, type: "square", dur: 0.25, vol: 0.25 }); },
  empty:   () => tone({ freq: 900, type: "square", dur: 0.05, vol: 0.08 }),
  reload:  () => { tone({ freq: 700, type: "square", dur: 0.05, vol: 0.1 }); tone({ freq: 500, type: "square", dur: 0.06, vol: 0.1, delay: 0.1 }); },
  hit:     () => noise({ dur: 0.08, vol: 0.2, filter: 900, filterEnd: 200 }),
  splat:   () => { noise({ dur: 0.18, vol: 0.3, filter: 700, filterEnd: 120 }); tone({ freq: 160, end: 50, type: "sine", dur: 0.15, vol: 0.15 }); },
  groan:   () => tone({ freq: 140, end: 90, type: "sawtooth", dur: 0.5, vol: 0.08 }),
  roar:    () => { tone({ freq: 90, end: 40, type: "sawtooth", dur: 0.6, vol: 0.2 }); noise({ dur: 0.4, vol: 0.15, filter: 400, filterEnd: 80 }); },
  bite:    () => { noise({ dur: 0.1, vol: 0.25, filter: 1500, filterEnd: 300 }); tone({ freq: 200, end: 120, type: "triangle", dur: 0.15, vol: 0.15 }); },
  jump:    () => tone({ freq: 300, end: 500, type: "triangle", dur: 0.12, vol: 0.1 }),
  land:    () => noise({ dur: 0.06, vol: 0.15, filter: 600, filterEnd: 200 }),
  pickup:  () => { tone({ freq: 660, type: "square", dur: 0.08, vol: 0.12 }); tone({ freq: 990, type: "square", dur: 0.14, vol: 0.12, delay: 0.08 }); },
  cannoli: () => { [523, 659, 784].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.18, vol: 0.14, delay: i * 0.07 })); },
  wave:    () => { [262, 330, 392, 523].forEach((f, i) => tone({ freq: f, type: "sawtooth", dur: 0.35, vol: 0.12, delay: i * 0.1 })); },
  dead:    () => { [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, type: "sawtooth", dur: 0.5, vol: 0.18, delay: i * 0.25 })); },
};
