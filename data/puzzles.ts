export const puzzles = [
  {
    id: 1,
    title: "Mate in 1",
    instruction: "White to move",
    fen: "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1",
    bestMove: {
      from: "f7",
      to: "h7",
    },
    explanation:
      "Queen ke h7 adalah checkmate. Raja hitam tidak punya petak aman dan queen dilindungi oleh raja putih.",
  },
  {
    id: 2,
    title: "Mate in 1",
    instruction: "White to move",
    fen: "6k1/5ppp/8/8/8/6Q1/5PPP/6K1 w - - 0 1",
    bestMove: {
      from: "g3",
      to: "b8",
    },
    explanation:
      "Queen ke b8 memberikan checkmate karena raja hitam tidak punya ruang untuk melarikan diri.",
  },
  {
    id: 3,
    title: "Capture the Queen",
    instruction: "White to move",
    fen: "4k3/8/8/8/3q4/4N3/8/4K3 w - - 0 1",
    bestMove: {
      from: "e3",
      to: "d5",
    },
    explanation:
      "Knight ke d5 menangkap queen hitam. Ini contoh sederhana melihat bidak lawan yang bisa diambil secara langsung.",
  },
];