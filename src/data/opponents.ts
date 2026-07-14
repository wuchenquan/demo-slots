import type { OpponentState } from "../simulation/types";

export const INITIAL_OPPONENTS: OpponentState[] = [
  { id: "mira", name: "Mira", avatar: "🧭", coins: 8500, shields: 1, progress: 68, score: 1450 },
  { id: "kai", name: "Kai", avatar: "⚡", coins: 6200, shields: 2, progress: 54, score: 1310 },
  { id: "noor", name: "Noor", avatar: "🌙", coins: 10400, shields: 0, progress: 77, score: 1620 },
  { id: "dax", name: "Dax", avatar: "🔥", coins: 4900, shields: 1, progress: 42, score: 980 },
  { id: "sol", name: "Sol", avatar: "☀️", coins: 7100, shields: 3, progress: 61, score: 1190 },
];
