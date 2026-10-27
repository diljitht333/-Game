// Persistent data on the device (localStorage — works inside the Android app too).
export interface Settings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
  theme: "dusk" | "night" | "violet" | "forest";
  blockStyle: "gem" | "gold" | "candy" | "flat";
}
export interface ScoreEntry {
  score: number;
  date: string; // ISO
  daily?: boolean;
}

export const defaultSettings: Settings = {
  sound: true,
  music: true,
  vibration: true,
  theme: "dusk",
  blockStyle: "gem",
};

const K = { settings: "bp.settings", scores: "bp.scores", tutorial: "bp.tutorialSeen" };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? { ...(fallback as object), ...JSON.parse(v) } : fallback;
  } catch {
    return fallback;
  }
}

export const loadSettings = () => read<Settings>(K.settings, defaultSettings);
export const saveSettings = (s: Settings) => localStorage.setItem(K.settings, JSON.stringify(s));

export function loadScores(): ScoreEntry[] {
  try {
    return JSON.parse(localStorage.getItem(K.scores) || "[]");
  } catch {
    return [];
  }
}
export function addScore(e: ScoreEntry) {
  if (e.score <= 0) return;
  const list = [...loadScores(), e].sort((a, b) => b.score - a.score).slice(0, 50);
  localStorage.setItem(K.scores, JSON.stringify(list));
}
export const bestScore = () => loadScores().reduce((m, s) => Math.max(m, s.score), 0);
export const tutorialSeen = () => typeof window !== "undefined" && localStorage.getItem(K.tutorial) === "1";
export const markTutorialSeen = () => localStorage.setItem(K.tutorial, "1");
