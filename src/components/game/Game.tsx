import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Home, Lightbulb, Pause, Play, RotateCcw, Settings as SettingsIcon, Shuffle, Trophy, Undo2, Volume2, VolumeX } from "lucide-react";
import gems from "@/assets/gems.png";
import {
  SIZE, type Board, type Piece, canPlace, comboWord, dateSeed, emptyBoard, findHint, isGameOver,
  levelTarget, makeTray, mulberry32, place, scoreFor,
} from "@/game/logic";
import { addScore, bestScore, type Settings } from "@/game/storage";
import { sfx, vibrate } from "@/game/audio";

interface GS {
  board: Board;
  tray: (Piece | null)[];
  score: number;
  combo: number;
  lines: number;
  level: number;
  undo: number;
  hint: number;
  shuffle: number;
}

interface Props {
  settings: Settings;
  daily: boolean;
  onToggleSound: () => void;
  onMenu: () => void;
  onSettings: () => void;
  onHighScores: () => void;
}

const POWERUPS = 3;

export function Game({ settings, daily, onToggleSound, onMenu, onSettings, onHighScores }: Props) {
  const rng = useRef(mulberry32(daily ? dateSeed() : Date.now()));
  const fresh = useCallback((): GS => {
    rng.current = mulberry32(daily ? dateSeed() : Date.now());
    const board = emptyBoard();
    return { board, tray: makeTray(rng.current, board), score: 0, combo: 0, lines: 0, level: 1, undo: POWERUPS, hint: POWERUPS, shuffle: POWERUPS };
  }, [daily]);

  const [gs, setGs] = useState<GS>(fresh);
  const [history, setHistory] = useState<GS[]>([]);
  const [best, setBest] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const [flash, setFlash] = useState<Map<number, number> | null>(null);
  const [popup, setPopup] = useState<{ word: string; combo: number; pts: number; key: number } | null>(null);
  const [hint, setHint] = useState<{ idx: number; r: number; c: number } | null>(null);
  const [drag, setDrag] = useState<{ idx: number; x: number; y: number } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const recorded = useRef(false);

  useEffect(() => setBest(bestScore()), []);

  const s = settings;
  const play = (fn: () => void) => s.sound && fn();
  const buzz = (ms: number | number[]) => s.vibration && vibrate(ms);

  // ---- drag target calculation ----
  const target = useMemo(() => {
    if (!drag || !rectRef.current) return null;
    const piece = gs.tray[drag.idx];
    if (!piece) return null;
    const rect = rectRef.current;
    const cs = rect.width / SIZE;
    const left = drag.x - (piece.w * cs) / 2;
    const top = drag.y - piece.h * cs - cs * 1.4;
    const r = Math.round((top - rect.top) / cs);
    const c = Math.round((left - rect.left) / cs);
    return { piece, r, c, left, top, cs, valid: canPlace(gs.board, piece, r, c) };
  }, [drag, gs]);

  const preview = useMemo(() => {
    if (!target?.valid) return null;
    const cells = new Set(target.piece.cells.map(([dr, dc]) => (target.r + dr) * SIZE + target.c + dc));
    const filled = (i: number) => gs.board[i] !== null || cells.has(i);
    const lineCells = new Set<number>();
    for (let i = 0; i < SIZE; i++) {
      const row = Array.from({ length: SIZE }, (_, k) => i * SIZE + k);
      const col = Array.from({ length: SIZE }, (_, k) => k * SIZE + i);
      if (row.every(filled)) row.forEach((x) => lineCells.add(x));
      if (col.every(filled)) col.forEach((x) => lineCells.add(x));
    }
    return { cells, lineCells, color: target.piece.color };
  }, [target, gs.board]);

  const commit = useCallback(
    (idx: number, r: number, c: number) => {
      const piece = gs.tray[idx];
      if (!piece || !canPlace(gs.board, piece, r, c)) return false;
      const res = place(gs.board, piece, r, c);
      const combo = res.lines > 0 ? gs.combo + 1 : 0;
      const pts = scoreFor(piece.cells.length, res.lines, combo);
      let tray = gs.tray.slice();
      tray[idx] = null;
      if (tray.every((p) => p === null)) tray = makeTray(rng.current, res.board);
      const next: GS = { ...gs, board: res.board, tray, score: gs.score + pts, combo, lines: gs.lines + res.lines };

      setHistory([gs]);
      setGs(next);
      setHint(null);

      if (res.lines > 0) {
        const colorAt = new Map<number, number>();
        const placed = new Map(piece.cells.map(([dr, dc]) => [(r + dr) * SIZE + c + dc, piece.color]));
        res.clearedCells.forEach((i) => colorAt.set(i, gs.board[i] ?? placed.get(i) ?? piece.color));
        setFlash(colorAt);
        setTimeout(() => setFlash(null), 460);
        setPopup({ word: comboWord(res.lines, combo), combo, pts, key: Date.now() });
        setTimeout(() => setPopup(null), 1500);
        play(() => sfx.clear(res.lines));
        buzz([20, 30, 40]);
      } else {
        play(sfx.place);
        buzz(12);
      }

      if (next.score >= levelTarget(next.level)) {
        setTimeout(() => { setLevelUp(true); play(sfx.level); }, 650);
      }
      if (isGameOver(next.board, next.tray)) {
        setTimeout(() => { setOver(true); play(sfx.over); buzz(200); }, 700);
      }
      return true;
    },
    [gs, s.sound, s.vibration],
  );

  // record score once when game ends
  useEffect(() => {
    if (over && !recorded.current) {
      recorded.current = true;
      addScore({ score: gs.score, date: new Date().toISOString(), daily });
      setBest(bestScore());
    }
  }, [over, gs.score, daily]);

  // ---- pointer handling ----
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = () => {
      if (target?.valid) commit(drag.idx, target.r, target.c);
      else if (target && target.top > (rectRef.current?.top ?? 0) - target.cs * 3) {
        play(sfx.invalid);
        setShakeKey((k) => k + 1);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, target, commit]);

  const startDrag = (idx: number, e: React.PointerEvent) => {
    if (!gs.tray[idx] || paused || over || levelUp) return;
    e.preventDefault();
    rectRef.current = boardRef.current?.getBoundingClientRect() ?? null;
    setHint(null);
    play(sfx.tap);
    setDrag({ idx, x: e.clientX, y: e.clientY });
  };

  // ---- power-ups ----
  const doUndo = () => {
    if (gs.undo <= 0 || history.length === 0) return play(sfx.invalid);
    const prev = history[0]!;
    setGs({ ...prev, undo: gs.undo - 1, hint: gs.hint, shuffle: gs.shuffle });
    setHistory([]);
    play(sfx.tap);
  };
  const doHint = () => {
    const h = findHint(gs.board, gs.tray);
    if (gs.hint <= 0 || !h) return play(sfx.invalid);
    setHint({ idx: h.idx, r: h.r, c: h.c });
    setGs({ ...gs, hint: gs.hint - 1 });
    play(sfx.tap);
  };
  const doShuffle = () => {
    if (gs.shuffle <= 0) return play(sfx.invalid);
    const tray = makeTray(rng.current, gs.board);
    setGs({ ...gs, tray, shuffle: gs.shuffle - 1 });
    setHistory([]);
    setHint(null);
    play(sfx.tap);
    setOver(false);
  };
  const restart = () => {
    setGs(fresh());
    setHistory([]);
    setOver(false);
    setPaused(false);
    setLevelUp(false);
    setHint(null);
    recorded.current = false;
    setBest(bestScore());
  };
  const nextLevel = () => {
    setGs({ ...gs, level: gs.level + 1, undo: gs.undo + 1, hint: gs.hint + 1, shuffle: gs.shuffle + 1 });
    setLevelUp(false);
  };

  const hintCells = useMemo(() => {
    if (!hint) return null;
    const p = gs.tray[hint.idx];
    if (!p) return null;
    return { set: new Set(p.cells.map(([dr, dc]) => (hint.r + dr) * SIZE + hint.c + dc)), color: p.color };
  }, [hint, gs.tray]);

  const shownBest = Math.max(best, gs.score);

  return (
    <div className="relative flex h-full flex-col px-3 pb-3 pt-[max(env(safe-area-inset-top),12px)]" style={{ touchAction: "none" }}>
      {/* HUD */}
      <div className="flex items-center justify-between gap-2">
        <button aria-label="Pause" onClick={() => setPaused(true)} className="btn-navy grid h-11 w-11 place-items-center">
          <Pause className="h-5 w-5" />
        </button>
        <div className="flex items-end gap-5">
          <div className="flex items-center gap-1.5">
            <Crown className="h-7 w-7 text-gold" fill="currentColor" />
            <div className="leading-tight">
              <div className="text-xs font-bold text-muted-foreground">Best</div>
              <div className="font-display text-lg text-gold">{shownBest}</div>
            </div>
          </div>
          <div className="text-center leading-tight">
            <div className="text-xs font-bold text-muted-foreground">{daily ? "Daily · Score" : `Level ${gs.level} · Score`}</div>
            <div className="font-display text-3xl text-gold">{gs.score}</div>
          </div>
        </div>
        <button aria-label="Toggle sound" onClick={onToggleSound} className="btn-navy grid h-11 w-11 place-items-center">
          {s.sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>

      {/* level progress */}
      <div className="mx-auto mt-2 h-1.5 w-2/3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(100, ((gs.score - levelTarget(gs.level - 1)) / 1000) * 100)}%` }}
        />
      </div>

      {/* Board */}
      <div className="relative mt-3 flex flex-1 items-center justify-center">
        <div key={shakeKey} className={`board-frame w-full max-w-[min(100%,58dvh)] p-1.5 ${shakeKey ? "animate-shake" : ""}`}>
          <div ref={boardRef} className={`style-${s.blockStyle} grid aspect-square grid-cols-10 gap-[3px]`}>
            {gs.board.map((v, i) => {
              const fl = flash?.get(i);
              const inPreview = preview?.cells.has(i);
              const onLine = preview?.lineCells.has(i);
              const hinted = hintCells?.set.has(i);
              let cls = "cell-empty";
              if (fl !== undefined) cls = `block c${fl} clearing`;
              else if (v !== null) cls = `block c${onLine ? preview!.color : v}`;
              else if (inPreview) cls = `block ghost c${preview!.color}`;
              else if (hinted) cls = `block hint c${hintCells!.color}`;
              return <div key={i} className={`${cls} ${onLine ? "line-preview" : ""}`} />;
            })}
          </div>
        </div>

        {popup && (
          <div key={popup.key} className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="animate-pop text-center">
              <div className="title-gold text-6xl">{popup.word}</div>
              {popup.combo > 1 && <div className="title-gold text-3xl">Combo x {popup.combo}</div>}
              <div className="title-gold text-4xl">+{popup.pts}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tray */}
      <div className={`style-${s.blockStyle} mt-3 grid grid-cols-3 gap-2`}>
        {gs.tray.map((p, idx) => (
          <div
            key={p?.id ?? `empty-${idx}`}
            onPointerDown={(e) => startDrag(idx, e)}
            className={`panel grid aspect-square place-items-center ${hint?.idx === idx ? "line-preview" : ""}`}
          >
            {p && drag?.idx !== idx && <PieceView piece={p} cell={Math.min(18, 80 / Math.max(p.w, p.h))} />}
          </div>
        ))}
      </div>

      {/* Power-ups */}
      <div className="mt-3 flex justify-around">
        <PowerButton label="Undo" count={gs.undo} onClick={doUndo} icon={<Undo2 className="h-6 w-6" />} />
        <PowerButton label="Hint" count={gs.hint} onClick={doHint} icon={<Lightbulb className="h-6 w-6 text-gold" />} />
        <PowerButton label="Shuffle" count={gs.shuffle} onClick={doShuffle} icon={<Shuffle className="h-6 w-6 text-accent" />} />
      </div>

      {/* Dragged piece */}
      {drag && target && (
        <div className={`style-${s.blockStyle} pointer-events-none fixed z-40`} style={{ left: target.left, top: target.top }}>
          <PieceView piece={target.piece} cell={target.cs} gap={3} />
        </div>
      )}

      {/* Overlays */}
      {paused && (
        <Overlay>
          <h2 className="font-display text-4xl">Game Paused</h2>
          <img src={gems} alt="" width={1024} height={1024} className="mx-auto my-4 h-32 w-32 animate-bob object-contain" />
          <MenuBtn gold icon={<Play className="h-6 w-6" fill="currentColor" />} onClick={() => setPaused(false)}>Resume</MenuBtn>
          <MenuBtn icon={<RotateCcw className="h-5 w-5" />} onClick={restart}>Restart</MenuBtn>
          <MenuBtn icon={<Home className="h-5 w-5" />} onClick={onMenu}>Main Menu</MenuBtn>
          <MenuBtn icon={<SettingsIcon className="h-5 w-5" />} onClick={onSettings}>Settings</MenuBtn>
        </Overlay>
      )}
      {levelUp && !over && (
        <Overlay>
          <Crown className="mx-auto h-20 w-20 animate-bob text-gold" fill="currentColor" />
          <h2 className="title-gold text-5xl">Level Complete!</h2>
          <div className="panel my-4 space-y-2 p-4 text-left font-bold">
            <Row label="Level" value={gs.level} />
            <Row label="Score" value={gs.score} />
            <Row label="Lines Cleared" value={gs.lines} />
            <Row label="Best Score" value={shownBest} />
            <p className="pt-1 text-center text-xs text-muted-foreground">Reward: +1 Undo, Hint & Shuffle</p>
          </div>
          <MenuBtn gold icon={<Play className="h-6 w-6" fill="currentColor" />} onClick={nextLevel}>Next Level</MenuBtn>
          <MenuBtn icon={<Home className="h-5 w-5" />} onClick={onMenu}>Main Menu</MenuBtn>
        </Overlay>
      )}
      {over && (
        <Overlay>
          <h2 className="title-red text-7xl leading-[0.9]">GAME<br />OVER</h2>
          <div className="panel my-5 grid grid-cols-2 divide-x p-4">
            <div>
              <div className="font-bold text-muted-foreground">Score</div>
              <div className="font-display text-4xl text-gold">{gs.score}</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 font-bold text-muted-foreground">
                <Crown className="h-4 w-4 text-gold" fill="currentColor" /> Best Score
              </div>
              <div className="font-display text-4xl text-gold">{shownBest}</div>
            </div>
          </div>
          {gs.shuffle > 0 && (
            <MenuBtn icon={<Shuffle className="h-5 w-5" />} onClick={doShuffle}>Continue with Shuffle ({gs.shuffle})</MenuBtn>
          )}
          <MenuBtn gold icon={<Play className="h-6 w-6" fill="currentColor" />} onClick={restart}>Play Again</MenuBtn>
          <MenuBtn icon={<Home className="h-5 w-5" />} onClick={onMenu}>Main Menu</MenuBtn>
          <MenuBtn icon={<Trophy className="h-5 w-5" />} onClick={onHighScores}>View High Scores</MenuBtn>
        </Overlay>
      )}
    </div>
  );
}

export function PieceView({ piece, cell, gap = 2 }: { piece: Piece; cell: number; gap?: number }) {
  const set = new Set(piece.cells.map(([r, c]) => `${r},${c}`));
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${piece.w}, ${cell - gap}px)`, gap }}>
      {Array.from({ length: piece.w * piece.h }, (_, i) => {
        const r = Math.floor(i / piece.w);
        const c = i % piece.w;
        return <div key={i} style={{ height: cell - gap }} className={set.has(`${r},${c}`) ? `block c${piece.color}` : ""} />;
      })}
    </div>
  );
}

function PowerButton({ label, count, onClick, icon }: { label: string; count: number; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 disabled:opacity-40" disabled={count <= 0}>
      <span className="btn-navy relative grid h-14 w-14 place-items-center rounded-full">
        {icon}
        <span className="badge-count absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-xs font-black">{count}</span>
      </span>
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}

export function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm space-y-3 text-center animate-in zoom-in-90">{children}</div>
    </div>
  );
}

export function MenuBtn({ children, icon, onClick, gold }: { children: React.ReactNode; icon?: React.ReactNode; onClick: () => void; gold?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${gold ? "btn-gold h-16 text-2xl" : "btn-navy h-13 py-3 text-lg"} flex w-full items-center justify-center gap-3 px-4`}
    >
      {icon}
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-display text-xl text-gold">{value}</span>
    </div>
  );
}
