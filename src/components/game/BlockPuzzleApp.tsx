import { useEffect, useState } from "react";
import {
  BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Gift, Globe, Music, Play, Settings as SettingsIcon,
  Smartphone, Star, Trophy, Volume2, X,
} from "lucide-react";
import bgDusk from "@/assets/bg-dusk.jpg";
import gems from "@/assets/gems.png";
import { Game, MenuBtn, PieceView } from "./Game";
import { makePiece } from "@/game/logic";
import {
  defaultSettings, loadScores, loadSettings, markTutorialSeen, saveSettings, tutorialSeen,
  type ScoreEntry, type Settings,
} from "@/game/storage";
import { sfx, startMusic, stopMusic } from "@/game/audio";

type Screen = "splash" | "menu" | "tutorial" | "game" | "scores";

export function BlockPuzzleApp() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [daily, setDaily] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [scoresBack, setScoresBack] = useState<Screen>("menu");

  useEffect(() => setSettings(loadSettings()), []);
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  useEffect(() => {
    if (interacted && settings.music) startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [interacted, settings.music]);

  const tap = () => settings.sound && sfx.tap();
  const startGame = (isDaily: boolean) => {
    tap();
    setDaily(isDaily);
    setGameKey((k) => k + 1);
    setScreen(tutorialSeen() ? "game" : "tutorial");
  };

  const bgStyle = settings.theme === "dusk" ? { backgroundImage: `linear-gradient(180deg, oklch(0.15 0.05 270 / 0.35), oklch(0.12 0.05 270 / 0.75)), url(${bgDusk})` } : undefined;

  return (
    <div
      className={`theme-${settings.theme} screen-bg fixed inset-0 overflow-hidden`}
      style={bgStyle}
      onPointerDown={() => !interacted && setInteracted(true)}
    >
      <main className="relative mx-auto h-full w-full max-w-[460px]">
        {screen === "splash" && <Splash onDone={() => setScreen("menu")} />}
        {screen === "menu" && (
          <MainMenu
            onPlay={() => startGame(false)}
            onDaily={() => startGame(true)}
            onTutorial={() => (tap(), setScreen("tutorial"))}
            onSettings={() => (tap(), setShowSettings(true))}
            onScores={() => (tap(), setScoresBack("menu"), setScreen("scores"))}
          />
        )}
        {screen === "tutorial" && (
          <Tutorial
            onClose={() => (markTutorialSeen(), setScreen(gameKey ? "game" : "menu"))}
            onStart={() => (markTutorialSeen(), setGameKey((k) => k || 1), setScreen("game"))}
          />
        )}
        {screen === "game" && (
          <Game
            key={gameKey}
            settings={settings}
            daily={daily}
            onToggleSound={() => update({ sound: !settings.sound })}
            onMenu={() => setScreen("menu")}
            onSettings={() => setShowSettings(true)}
            onHighScores={() => (setScoresBack("menu"), setScreen("scores"))}
          />
        )}
        {screen === "scores" && <HighScores onBack={() => setScreen(scoresBack)} />}
        {showSettings && <SettingsScreen settings={settings} update={update} onBack={() => setShowSettings(false)} />}
      </main>
    </div>
  );
}

function Logo({ big }: { big?: boolean }) {
  return (
    <div className="text-center">
      <h1 className={`title-gold leading-none ${big ? "text-7xl" : "text-6xl"}`}>BLOCK</h1>
      <div className={`title-blue -mt-1 tracking-[0.25em] ${big ? "text-5xl" : "text-4xl"}`}>PUZZLE</div>
    </div>
  );
}

function Splash({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setP((v) => Math.min(100, v + 4)), 50);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (p < 100) return;
    const t = setTimeout(onDone, 250);
    return () => clearTimeout(t);
  }, [p, onDone]);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-10">
      <img src={gems} alt="Gem blocks" width={1024} height={1024} className="h-56 w-56 animate-bob object-contain drop-shadow-2xl" />
      <Logo big />
      <div className="mt-16 w-full text-center">
        <div className="mb-2 font-bold">Loading...</div>
        <div className="h-4 overflow-hidden rounded-full border-2 border-primary bg-background/60">
          <div className="h-full bg-primary transition-all" style={{ width: `${p}%` }} />
        </div>
      </div>
    </div>
  );
}

function MainMenu(props: { onPlay: () => void; onDaily: () => void; onTutorial: () => void; onSettings: () => void; onScores: () => void }) {
  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-[max(env(safe-area-inset-top),16px)]">
      <div className="flex justify-between">
        <button aria-label="Settings" onClick={props.onSettings} className="btn-navy grid h-12 w-12 place-items-center">
          <SettingsIcon className="h-6 w-6" />
        </button>
        <button aria-label="Daily challenge" onClick={props.onDaily} className="btn-navy grid h-12 w-12 place-items-center">
          <Gift className="h-6 w-6 text-gold" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <img src={gems} alt="" width={1024} height={1024} className="mb-2 h-32 w-32 animate-bob object-contain" />
        <Logo big />
      </div>
      <div className="space-y-3">
        <MenuBtn gold icon={<Play className="h-7 w-7" fill="currentColor" />} onClick={props.onPlay}>PLAY</MenuBtn>
        <MenuBtn icon={<CalendarDays className="h-5 w-5 text-gold" />} onClick={props.onDaily}>Daily Challenge</MenuBtn>
        <MenuBtn icon={<BookOpen className="h-5 w-5 text-gold" />} onClick={props.onTutorial}>How to Play</MenuBtn>
        <MenuBtn icon={<SettingsIcon className="h-5 w-5 text-gold" />} onClick={props.onSettings}>Settings</MenuBtn>
        <MenuBtn icon={<Trophy className="h-5 w-5 text-gold" />} onClick={props.onScores}>High Scores</MenuBtn>
      </div>
    </div>
  );
}

function Tutorial({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  const steps = [
    { text: "Drag and drop blocks onto the 10 x 10 grid.", demo: <PieceView piece={makePiece(21, 0)} cell={18} /> },
    { text: "Fill a complete row or column to clear it.", demo: <PieceView piece={makePiece(7, 4)} cell={16} /> },
    { text: "Earn points for clearing blocks and combos.", demo: <Star className="h-10 w-10 text-gold" fill="currentColor" /> },
    { text: "Plan your moves wisely. Game ends when no blocks can be placed.", demo: <PieceView piece={makePiece(11, 1)} cell={18} /> },
  ];
  return (
    <div className="flex h-full flex-col p-5 pt-[max(env(safe-area-inset-top),20px)]">
      <div className="panel flex-1 overflow-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-3xl">How to Play</h2>
          <button aria-label="Close" onClick={onClose} className="btn-gold grid h-10 w-10 place-items-center rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 style-gem">
          {steps.map((st, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
              <span className="btn-gold grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl">{i + 1}</span>
              <p className="flex-1 text-sm font-semibold">{st.text}</p>
              <div className="grid w-24 place-items-center">{st.demo}</div>
            </div>
          ))}
          <div className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
            Power-ups: <b className="text-foreground">Undo</b> your last move, get a <b className="text-foreground">Hint</b>, or{" "}
            <b className="text-foreground">Shuffle</b> new pieces. Reach each 1,000 points to complete a level and earn more.
          </div>
        </div>
      </div>
      <button onClick={onStart} className="btn-gold mt-4 h-16 text-2xl">Start Playing</button>
    </div>
  );
}

function HighScores({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"all" | "today">("all");
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  useEffect(() => setScores(loadScores()), []);
  const today = new Date().toDateString();
  const list = (tab === "all" ? scores : scores.filter((s) => new Date(s.date).toDateString() === today)).slice(0, 10);
  return (
    <div className="flex h-full flex-col p-5 pt-[max(env(safe-area-inset-top),20px)]">
      <div className="mb-4 flex items-center gap-3">
        <button aria-label="Back" onClick={onBack} className="btn-navy grid h-11 w-11 place-items-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="flex-1 pr-11 text-center font-display text-3xl">High Scores</h2>
      </div>
      <div className="panel mb-3 grid grid-cols-2 gap-1 p-1">
        {(["all", "today"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-2 font-bold ${tab === t ? "btn-gold" : ""}`}>
            {t === "all" ? "All Time" : "Today"}
          </button>
        ))}
      </div>
      <div className="panel flex-1 overflow-auto p-2">
        {list.length === 0 && <p className="p-6 text-center text-muted-foreground">No scores yet — go play a round!</p>}
        {list.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 border-b border-border/40 px-3 py-2.5 ${i === 0 ? "rounded-lg bg-primary/15" : ""}`}>
            <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-black ${i < 3 ? "btn-gold" : "bg-secondary"}`}>{i + 1}</span>
            <span className="flex-1 font-bold">
              {i === 0 ? "You · Best" : new Date(s.date).toLocaleDateString()}
              {s.daily && <span className="ml-2 rounded bg-accent/30 px-1.5 text-xs">Daily</span>}
            </span>
            <span className="font-display text-xl text-gold">{s.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={`relative h-8 w-14 rounded-full transition-colors ${on ? "bg-chart-2" : "bg-muted"}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-foreground transition-all ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

function SettingsScreen({ settings, update, onBack }: { settings: Settings; update: (p: Partial<Settings>) => void; onBack: () => void }) {
  const themes: Settings["theme"][] = ["dusk", "night", "violet", "forest"];
  const styles: Settings["blockStyle"][] = ["gem", "gold", "candy", "flat"];
  const rows = [
    { key: "sound" as const, label: "Sound Effects", icon: <Volume2 className="h-5 w-5" /> },
    { key: "music" as const, label: "Music", icon: <Music className="h-5 w-5" /> },
    { key: "vibration" as const, label: "Vibration", icon: <Smartphone className="h-5 w-5" /> },
  ];
  return (
    <div className="screen-bg fixed inset-0 z-[60] mx-auto max-w-[460px] overflow-auto p-5 pt-[max(env(safe-area-inset-top),20px)]" style={settings.theme === "dusk" ? { backgroundImage: `url(${bgDusk})` } : undefined}>
      <div className="mb-4 flex items-center gap-3">
        <button aria-label="Back" onClick={onBack} className="btn-navy grid h-11 w-11 place-items-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="flex-1 pr-11 text-center font-display text-3xl">Settings</h2>
      </div>
      <div className="panel mb-3 divide-y divide-border/40 px-4">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 py-3.5">
            {r.icon}
            <span className="flex-1 font-bold">{r.label}</span>
            <Toggle label={r.label} on={settings[r.key]} onChange={() => update({ [r.key]: !settings[r.key] })} />
          </div>
        ))}
      </div>
      <div className="panel mb-3 p-4">
        <h3 className="mb-2 font-bold">Theme</h3>
        <div className="grid grid-cols-4 gap-2">
          {themes.map((t) => (
            <button
              key={t}
              aria-label={`${t} theme`}
              onClick={() => update({ theme: t })}
              className={`theme-${t} screen-bg relative aspect-square rounded-lg border-2 ${settings.theme === t ? "border-primary" : "border-transparent"}`}
              style={t === "dusk" ? { backgroundImage: `url(${bgDusk})` } : undefined}
            >
              {settings.theme === t && <Check className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-primary p-0.5 text-primary-foreground" />}
            </button>
          ))}
        </div>
        <h3 className="mb-2 mt-4 font-bold">Block Style</h3>
        <div className="grid grid-cols-4 gap-2">
          {styles.map((st, i) => (
            <button
              key={st}
              aria-label={`${st} blocks`}
              onClick={() => update({ blockStyle: st })}
              className={`style-${st} relative grid aspect-square grid-cols-2 gap-1 rounded-lg border-2 p-2 ${settings.blockStyle === st ? "border-primary" : "border-transparent"}`}
            >
              {[0, 1, 2, 3].map((k) => <span key={k} className={`block c${(i + k) % 6}`} />)}
              {settings.blockStyle === st && <Check className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary p-0.5 text-primary-foreground" />}
            </button>
          ))}
        </div>
      </div>
      <div className="panel flex items-center gap-3 p-4">
        <Globe className="h-5 w-5" />
        <span className="flex-1 font-bold">Language</span>
        <span className="text-muted-foreground">English</span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
}
