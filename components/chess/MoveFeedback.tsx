"use client";

import { useEffect, useState } from "react";
import type { MoveQuality } from "@/hooks/useChessGame";
import { Chess } from "chess.js";

type MoveFeedbackProps = {
  moveQuality: MoveQuality | null;
  centipawnLoss: number | null;
  bestMoveBefore: string | null;
  userMove: string | null;
  bestMoveNow: string | null;
  beforeFen: string | null;
  currentFen: string;
};

function formatMove(
  move: string | null,
  fen: string | null
) {
  if (!move || move.length < 4) {
    return move;
  }

  const from = move.slice(0, 2);
  const to = move.slice(2, 4);

  if (!fen) {
    return `${from} → ${to}`;
  }

  const game = new Chess(fen);
  const piece = game.get(from as Parameters<typeof game.get>[0]);

  const pieceNames: Record<string, string> = {
    p: "Pawn",
    n: "Knight",
    b: "Bishop",
    r: "Rook",
    q: "Queen",
    k: "King",
  };

  const pieceName = piece ? pieceNames[piece.type] : null;

  return pieceName
    ? `${pieceName} ${from} → ${to}`
    : `${from} → ${to}`;
}

export function MoveFeedback({
  moveQuality,
  centipawnLoss,
  bestMoveBefore,
  userMove,
  bestMoveNow,
  beforeFen,
  currentFen,
}: MoveFeedbackProps) {

    const [showBestMove, setShowBestMove] = useState(false);

    useEffect(() => {
    setShowBestMove(false);
    }, [bestMoveNow]);
    
    if (
    moveQuality === null &&
    centipawnLoss === null &&
    !bestMoveBefore &&
    !userMove &&
    !bestMoveNow
    ) {
    return null;
    }

    return (
    <div className="w-full max-w-[500px] rounded-lg border p-4 space-y-2">
        {moveQuality && (
        <p className="text-lg font-semibold">
            Move quality: {moveQuality}
        </p>
        )}

        {centipawnLoss !== null && (
        <p className="text-sm">
            Centipawn loss: {centipawnLoss}
        </p>
        )}

        {bestMoveBefore && (
        <p className="text-sm">
            Best move before: {formatMove(bestMoveBefore, beforeFen)}
        </p>
        )}

        {userMove && (
        <p className="text-sm">
            Your move: {formatMove(userMove, beforeFen)}
        </p>
        )}

        {bestMoveNow && (
        <div className="pt-2">
            {!showBestMove ? (
            <button
                onClick={() => setShowBestMove(true)}
                className="px-3 py-2 rounded bg-gray-800 text-white text-sm"
            >
                Show Best Move
            </button>
            ) : (
            <div className="space-y-2">
                <p className="text-sm font-medium">
                Best move now: {formatMove(bestMoveNow, currentFen)}
                </p>

                <button
                onClick={() => setShowBestMove(false)}
                className="text-xs underline"
                >
                Hide
                </button>
            </div>
            )}
        </div>
        )}
    </div>
    );
}