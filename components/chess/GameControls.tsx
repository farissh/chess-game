"use client";

type GameControlsProps = {
  control: "resign" | "newGame";
  isFinished: boolean;
  isGameOver: boolean;
  resigned: boolean;
  onNewGame: () => void;
  onResign: () => void;
};

export function GameControls({
  control,
  isFinished,
  isGameOver,
  resigned,
  onNewGame,
  onResign,
}: GameControlsProps) {
  if (control === "resign") {
    return (
      <button
        onClick={onResign}
        disabled={resigned || isGameOver}
        className="px-5 py-2 rounded bg-red-600 text-white disabled:opacity-50"
      >
        Resign
      </button>
    );
  }

  return (
      <button
        onClick={onNewGame}
        className="px-5 py-2 rounded bg-blue-600 text-white"
      >
        {isFinished ? "Play Again" : "New Game"}
      </button>
  );
}
