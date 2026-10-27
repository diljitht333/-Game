import { createFileRoute } from "@tanstack/react-router";
import { BlockPuzzleApp } from "@/components/game/BlockPuzzleApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Block Puzzle — Gem Block Brain Game" },
      { name: "description", content: "Drag gem blocks onto a 10x10 grid, clear rows and columns, chain combos and beat your best score." },
      { property: "og:title", content: "Block Puzzle — Gem Block Brain Game" },
      { property: "og:description", content: "Drag gem blocks, clear lines, chain combos. A casual puzzle for phone and web." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlockPuzzleApp,
});
