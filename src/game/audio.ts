// Synthesized sounds & music via Web Audio — no audio files needed.
let ctx: AudioContext | null = null;
let musicTimer: number | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, delay = 0) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = a.currentTime + delay;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur);
}

export const sfx = {
  tap: () => tone(660, 0.08, "triangle", 0.1),
  place: () => tone(330, 0.12, "square", 0.06),
  invalid: () => tone(140, 0.18, "sawtooth", 0.06),
  clear: (lines: number) =>
    [523, 659, 784, 1046, 1318].slice(0, 2 + lines).forEach((f, i) => tone(f, 0.25, "triangle", 0.12, i * 0.06)),
  over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, "sine", 0.14, i * 0.18)),
  level: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, "triangle", 0.13, i * 0.1)),
};

const MELODY = [262, 330, 392, 330, 294, 349, 440, 349, 262, 330, 392, 523, 494, 392, 330, 294];
export function startMusic() {
  if (musicTimer !== null) return;
  let i = 0;
  musicTimer = window.setInterval(() => {
    tone(MELODY[i % MELODY.length]!, 0.4, "sine", 0.035);
    if (i % 4 === 0) tone(MELODY[i % MELODY.length]! / 2, 0.8, "triangle", 0.03);
    i++;
  }, 420);
}
export function stopMusic() {
  if (musicTimer !== null) window.clearInterval(musicTimer);
  musicTimer = null;
}

export function vibrate(ms: number | number[]) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}
