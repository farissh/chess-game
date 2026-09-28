"use client";

import { Chessboard } from "react-chessboard";
import { DifficultySelector } from "@/components/chess/DifficultySelector";
import { GameControls } from "@/components/chess/GameControls";
import { GameStatus } from "@/components/chess/GameStatus";
import { MoveHistory } from "@/components/chess/MoveHistory";
import { useChessGame } from "@/hooks/useChessGame";
import { MoveFeedback } from "@/components/chess/MoveFeedback";

export function ChessGame() {
  const {
    changeDifficulty,
    difficulties,
    difficulty,
    game,
    isFinished,
    makePlayerMove,
    moveHistory,
    newGame,
    resigned,
    resignGame,
    status,
    playerColor,
    changePlayerColor,
    undoMove,
    opponentAnalysis,
    lastMoveBeforeAnalysis,
    lastMoveAfterAnalysis,
    coachPhase,
    lastUserMove,
    centipawnLoss,
    currentPositionAnalysis,
    moveQuality,
    lastMoveBeforeFen,
  } = useChessGame();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Play vs Computer</h1>

        <div className="flex gap-2 mt-4 justify-center">
          <button
            onClick={() => changePlayerColor("w")}
            className={`px-4 py-2 rounded ${
              playerColor === "w"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-black"
            }`}
          >
            Play White
          </button>

          <button
            onClick={() => changePlayerColor("b")}
            className={`px-4 py-2 rounded ${
              playerColor === "b"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-black"
            }`}
          >
            Play Black
          </button>
        </div>
      </div>

      <DifficultySelector
        difficulty={difficulty}
        difficulties={difficulties}
        onChange={changeDifficulty}
      />

      <GameControls
        control="resign"
        isFinished={isFinished}
        isGameOver={game.isGameOver()}
        resigned={resigned}
        onNewGame={newGame}
        onResign={resignGame}
      />

      <GameStatus status={status} />

      <div className="w-full max-w-[500px]">
        <Chessboard
          options={{
            position: game.fen(),
            boardOrientation:
              playerColor === "w" ? "white" : "black",

            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!targetSquare) {
                return false;
              }

              return makePlayerMove(sourceSquare, targetSquare);
            },
          }}
        />
      </div>

      <MoveHistory moves={moveHistory} />

      <MoveFeedback
        moveQuality={moveQuality}
        centipawnLoss={centipawnLoss}
        bestMoveBefore={lastMoveBeforeAnalysis?.bestMove ?? null}
        userMove={lastUserMove?.uci ?? null}
        bestMoveNow={currentPositionAnalysis?.bestMove ?? null}
        beforeFen={lastMoveBeforeFen}
        currentFen={game.fen()}
      />

      <GameControls
        control="newGame"
        isFinished={isFinished}
        isGameOver={game.isGameOver()}
        resigned={resigned}
        onNewGame={newGame}
        onResign={resignGame}
      />

      <button
        onClick={undoMove}
        disabled={moveHistory.length === 0}
        className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
      >
        Undo
      </button>

      <p className="text-sm">Coach phase: {coachPhase}</p>

      <div className="text-sm opacity-60 max-w-[500px] break-all">
        <p>{game.fen()}</p>
      </div>
    </main>
  );
}
