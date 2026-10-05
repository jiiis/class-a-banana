let ctx = null, muted = false;
const last = {};
export function unlockAudio() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); }
export function sfx(name, minGap = 0.03, vol = 1) {
  if (muted || !ctx || !SFX[name]) return;
  const now = ctx.currentTime;
  if (last[name] && now - last[name] < minGap) return;
  last[name] = now; SFX[name](vol);
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
  usp:      (v) => { noise({ dur: 0.09, vol: 0.3 * v, filter: 2200, filterEnd: 300 }); tone({ freq: 180, end: 60, type: "square", dur: 0.07, vol: 0.12 * v }); },
  ak:       (v) => { noise({ dur: 0.08, vol: 0.4 * v, filter: 1800, filterEnd: 200 }); tone({ freq: 140, end: 50, type: "sawtooth", dur: 0.08, vol: 0.2 * v }); },
  enemy:    (v) => { noise({ dur: 0.08, vol: 0.18 * v, filter: 1200, filterEnd: 150 }); tone({ freq: 120, end: 45, type: "sawtooth", dur: 0.08, vol: 0.1 * v }); },
  knife:    () => noise({ dur: 0.12, vol: 0.15, filter: 4000, filterEnd: 1500, type: "highpass" }),
  stab:     () => { noise({ dur: 0.1, vol: 0.25, filter: 900, filterEnd: 200 }); tone({ freq: 220, end: 80, dur: 0.12, vol: 0.12 }); },
  hit:      () => tone({ freq: 1800, end: 1200, type: "square", dur: 0.04, vol: 0.08 }),
  headshot: () => { tone({ freq: 2200, type: "square", dur: 0.05, vol: 0.1 }); tone({ freq: 3000, type: "square", dur: 0.08, vol: 0.08, delay: 0.04 }); },
  hurt:     () => { noise({ dur: 0.12, vol: 0.25, filter: 700, filterEnd: 150 }); tone({ freq: 160, end: 90, type: "triangle", dur: 0.18, vol: 0.15 }); },
  empty:    () => tone({ freq: 800, type: "square", dur: 0.04, vol: 0.08 }),
  reload:   () => { tone({ freq: 500, type: "square", dur: 0.05, vol: 0.1 }); noise({ dur: 0.08, vol: 0.12, filter: 2500, filterEnd: 800, delay: 0.3 }); tone({ freq: 700, type: "square", dur: 0.05, vol: 0.1, delay: 0.9 }); },
  step:     () => noise({ dur: 0.07, vol: 0.06, filter: 500, filterEnd: 150 }),
  beep:     () => tone({ freq: 1100, type: "square", dur: 0.07, vol: 0.12 }),
  plant:    () => { for (let i = 0; i < 4; i++) tone({ freq: 900, type: "square", dur: 0.05, vol: 0.1, delay: i * 0.12 }); },
  defuseTick: () => tone({ freq: 600, type: "square", dur: 0.04, vol: 0.06 }),
  defused:  () => { [660, 880, 1100].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.2, vol: 0.15, delay: i * 0.1 })); },
  explode:  () => { noise({ dur: 1.4, vol: 0.7, filter: 600, filterEnd: 30 }); tone({ freq: 70, end: 20, type: "sawtooth", dur: 1.2, vol: 0.4 }); },
  roundStart: () => { [392, 523].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.25, vol: 0.15, delay: i * 0.15 })); },
  win:      () => { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: "square", dur: 0.25, vol: 0.12, delay: i * 0.12 })); },
  lose:     () => { [392, 330, 262].forEach((f, i) => tone({ freq: f, type: "sawtooth", dur: 0.4, vol: 0.14, delay: i * 0.2 })); },
  buy:      () => { tone({ freq: 880, type: "square", dur: 0.06, vol: 0.1 }); tone({ freq: 1320, type: "square", dur: 0.1, vol: 0.1, delay: 0.06 }); },
  botDie:   () => { tone({ freq: 200, end: 80, type: "sawtooth", dur: 0.3, vol: 0.12 }); noise({ dur: 0.25, vol: 0.15, filter: 600, filterEnd: 100 }); },
};
