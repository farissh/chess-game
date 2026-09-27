export function createStockfish() {
  const worker = new Worker(
    "/stockfish/stockfish-19-lite-single.js"
  );

  return worker;
}