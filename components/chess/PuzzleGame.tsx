"use client";

import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { puzzles } from "@/data/puzzles";
import { useStockfish } from "@/hooks/useStockfish";

export function PuzzleGame() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = puzzles[puzzleIndex];
  const [game, setGame] = useState(() => new Chess(puzzle.fen));
  const [result, setResult] = useState<string | null>(null);
  const [isSolved, setIsSolved] = useState(false);

  const { bestMove, engineReady, requestBestMove } = useStockfish();
  const engineBestMove = bestMove?.move ?? null;

  useEffect(() => {
    if (!engineReady) {
      return;
    }

    requestBestMove(puzzle.fen, {
      depth: 12,
    });
  }, [engineReady, puzzle.fen, requestBestMove]);

  function makeMove(sourceSquare: string, targetSquare: string) {
    if (isSolved) {
      return false;
    }

    const gameCopy = new Chess(game.fen());

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (!move) {
        return false;
      }

      const userMove = `${sourceSquare}${targetSquare}`;
      const isCorrect = userMove === engineBestMove;

      setGame(gameCopy);

      if (isCorrect) {
        setResult("Correct");
        setIsSolved(true);
      } else {
        setResult("Wrong");
      }

      return true;
    } catch {
      return false;
    }
  }

  function resetPuzzle() {
    setGame(new Chess(puzzle.fen));
    setResult(null);
    setIsSolved(false);
  }

  function nextPuzzle() {
    const nextIndex = puzzleIndex + 1;

    if (nextIndex >= puzzles.length) {
      return;
    }

    setPuzzleIndex(nextIndex);
    setGame(new Chess(puzzles[nextIndex].fen));
    setResult(null);
    setIsSolved(false);
  }

  function restartAll() {
    setPuzzleIndex(0);
    setGame(new Chess(puzzles[0].fen));
    setResult(null);
    setIsSolved(false);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6">
      <h1 className="text-3xl font-bold">Chess Coach</h1>

      <div className="text-center">
        <p className="text-sm opacity-70">
          Puzzle {puzzleIndex + 1} / {puzzles.length}
        </p>

        <h2 className="text-xl font-semibold mt-1">{puzzle.title}</h2>

        <p className="mt-1">{puzzle.instruction}</p>
      </div>

      <p className="text-sm opacity-70">
        {engineBestMove ? "Engine ready" : "Analyzing puzzle..."}
      </p>

      <div className="w-full max-w-[500px]">
        <Chessboard
          options={{
            position: game.fen(),
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!engineBestMove) {
                return false;
              }

              if (!targetSquare) {
                return false;
              }

              return makeMove(sourceSquare, targetSquare);
            },
          }}
        />
      </div>

      {result && (
        <div className="text-center max-w-md">
          <p
            className={`text-xl font-bold ${
              result === "Correct" ? "text-green-500" : "text-red-500"
            }`}
          >
            {result}
          </p>

          {result === "Correct" && <p className="mt-2">{puzzle.explanation}</p>}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={resetPuzzle}
          className="px-4 py-2 rounded bg-gray-800 text-white"
        >
          Reset Puzzle
        </button>

        {isSolved && puzzleIndex < puzzles.length - 1 && (
          <button
            onClick={nextPuzzle}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Next Puzzle
          </button>
        )}

        {isSolved && puzzleIndex === puzzles.length - 1 && (
          <button
            onClick={restartAll}
            className="px-4 py-2 rounded bg-green-600 text-white"
          >
            Restart
          </button>
        )}
      </div>

      {engineBestMove && <p>Best move: {engineBestMove}</p>}

      <div className="max-w-[500px] text-sm break-all">
        <p className="font-semibold">Current FEN:</p>
        <p>{game.fen()}</p>
      </div>
    </main>
  );
}
