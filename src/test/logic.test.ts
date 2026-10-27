import { describe, expect, it } from "vitest";
import { SIZE, canPlace, emptyBoard, isGameOver, makePiece, place, scoreFor } from "@/game/logic";

describe("block puzzle rules", () => {
  it("board is 10x10", () => expect(emptyBoard().length).toBe(100));

  it("filling a row clears it", () => {
    const b = emptyBoard();
    for (let c = 0; c < 5; c++) b[c] = 0;
    const res = place(b, makePiece(7, 1), 0, 5); // 1x5 bar
    expect(res.lines).toBe(1);
    expect(res.board.slice(0, SIZE).every((x) => x === null)).toBe(true);
  });

  it("cannot place on occupied or off-board cells", () => {
    const b = emptyBoard();
    b[0] = 0;
    expect(canPlace(b, makePiece(0, 0), 0, 0)).toBe(false);
    expect(canPlace(b, makePiece(1, 0), 0, 9)).toBe(false);
  });

  it("scoring: cells + 100/300/600 for 1/2/3 lines, combo multiplier", () => {
    expect(scoreFor(4, 0, 0)).toBe(4);
    expect(scoreFor(5, 1, 1)).toBe(105);
    expect(scoreFor(5, 2, 1)).toBe(305);
    expect(scoreFor(5, 1, 3)).toBe(205);
  });

  it("game over when no piece fits", () => {
    const full = emptyBoard().map(() => 0);
    expect(isGameOver(full, [makePiece(0, 0), null, null])).toBe(true);
  });
});
