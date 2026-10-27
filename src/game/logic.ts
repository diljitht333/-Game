// Pure game rules for Block Puzzle — no React, fully testable.
export const SIZE = 10;
export const COLORS = 6;

export type Board = (number | null)[];
export interface Piece {
  id: string;
  cells: [number, number][];
  color: number;
  w: number;
  h: number;
}

const SHAPES: string[][] = [
  ["X"],
  ["XX"],
  ["X", "X"],
  ["XXX"],
  ["X", "X", "X"],
  ["XXXX"],
  ["X", "X", "X", "X"],
  ["XXXXX"],
  ["X", "X", "X", "X", "X"],
  ["XX", "XX"],
  ["XXX", "XXX", "XXX"],
  ["X.", "XX"],
  [".X", "XX"],
  ["XX", "X."],
  ["XX", ".X"],
  ["X..", "X..", "XXX"],
  ["..X", "..X", "XXX"],
  ["XXX", "X..", "X.."],
  ["XXX", "..X", "..X"],
  ["XXX", ".X."],
  [".X.", "XXX"],
  ["X.", "XX", "X."],
  [".X", "XX", ".X"],
  ["XX.", ".XX"],
  [".XX", "XX."],
  ["X.", "XX", ".X"],
  [".X", "XX", "X."],
  ["X.", "X.", "XX"],
  ["XXX", "X.."],
];

function parse(rows: string[]): [number, number][] {
  const out: [number, number][] = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => ch === "X" && out.push([r, c])));
  return out;
}

export const SHAPE_CELLS = SHAPES.map(parse);

export type Rng = () => number;
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dateSeed(d = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

let pid = 0;
export function makePiece(shapeIndex: number, color: number): Piece {
  const cells = SHAPE_CELLS[shapeIndex] ?? SHAPE_CELLS[0]!;
  return {
    id: `p${++pid}`,
    cells,
    color,
    w: Math.max(...cells.map((c) => c[1])) + 1,
    h: Math.max(...cells.map((c) => c[0])) + 1,
  };
}

export function randomPiece(rng: Rng): Piece {
  return makePiece(Math.floor(rng() * SHAPE_CELLS.length), Math.floor(rng() * COLORS));
}

export const emptyBoard = (): Board => Array(SIZE * SIZE).fill(null);

export function canPlace(board: Board, piece: Piece, r: number, c: number): boolean {
  return piece.cells.every(([dr, dc]) => {
    const rr = r + dr;
    const cc = c + dc;
    return rr >= 0 && cc >= 0 && rr < SIZE && cc < SIZE && board[rr * SIZE + cc] === null;
  });
}

export function findSpot(board: Board, piece: Piece): [number, number] | null {
  for (let r = 0; r <= SIZE - piece.h; r++)
    for (let c = 0; c <= SIZE - piece.w; c++) if (canPlace(board, piece, r, c)) return [r, c];
  return null;
}

export function canPlaceAnywhere(board: Board, piece: Piece) {
  return findSpot(board, piece) !== null;
}

export interface PlaceResult {
  board: Board;
  clearedCells: number[];
  lines: number;
}

export function place(board: Board, piece: Piece, r: number, c: number): PlaceResult {
  const next = board.slice();
  piece.cells.forEach(([dr, dc]) => (next[(r + dr) * SIZE + c + dc] = piece.color));
  const cleared = new Set<number>();
  let lines = 0;
  for (let i = 0; i < SIZE; i++) {
    const row = Array.from({ length: SIZE }, (_, k) => i * SIZE + k);
    const col = Array.from({ length: SIZE }, (_, k) => k * SIZE + i);
    if (row.every((x) => next[x] !== null)) (lines++, row.forEach((x) => cleared.add(x)));
    if (col.every((x) => next[x] !== null)) (lines++, col.forEach((x) => cleared.add(x)));
  }
  cleared.forEach((x) => (next[x] = null));
  return { board: next, clearedCells: [...cleared], lines };
}

/** Points: 1 per placed cell; lines give 100/300/600/1000…; combo streak multiplies line points by 1 + 0.5 per extra streak step. */
export function scoreFor(cellsPlaced: number, lines: number, combo: number): number {
  if (lines === 0) return cellsPlaced;
  const linePts = (lines * (lines + 1) * 100) / 2;
  const mult = 1 + 0.5 * Math.max(0, combo - 1);
  return cellsPlaced + Math.round(linePts * mult);
}

export function makeTray(rng: Rng, board: Board): Piece[] {
  for (let attempt = 0; attempt < 25; attempt++) {
    const tray = [randomPiece(rng), randomPiece(rng), randomPiece(rng)];
    if (tray.some((p) => canPlaceAnywhere(board, p))) return tray;
  }
  return [makePiece(0, 0), makePiece(1, 1), makePiece(2, 2)];
}

export function isGameOver(board: Board, tray: (Piece | null)[]): boolean {
  const left = tray.filter(Boolean) as Piece[];
  return left.length > 0 && !left.some((p) => canPlaceAnywhere(board, p));
}

/** Best move = the placement that clears the most lines (ties: first found). */
export function findHint(board: Board, tray: (Piece | null)[]) {
  let best: { idx: number; r: number; c: number; lines: number } | null = null;
  tray.forEach((p, idx) => {
    if (!p) return;
    for (let r = 0; r <= SIZE - p.h; r++)
      for (let c = 0; c <= SIZE - p.w; c++)
        if (canPlace(board, p, r, c)) {
          const { lines } = place(board, p, r, c);
          if (!best || lines > best.lines) best = { idx, r, c, lines };
        }
  });
  return best as { idx: number; r: number; c: number; lines: number } | null;
}

export const levelTarget = (level: number) => level * 1000;
export const comboWord = (lines: number, combo: number) =>
  combo >= 4 || lines >= 4 ? "Awesome!" : combo >= 3 || lines >= 3 ? "Amazing!" : lines >= 2 || combo >= 2 ? "Great!" : "Good!";
