"use client";

import { useCallback, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { useStockfish } from "@/hooks/useStockfish";

export type Difficulty = "beginner" | "easy" | "medium" | "hard";

export type DifficultyConfig = {
  label: string;
  elo: number;
  moveTime: number;
};

export const difficulties: Record<Difficulty, DifficultyConfig> = {
  beginner: {
    label: "Beginner",
    elo: 600,
    moveTime: 300,
  },
  easy: {
    label: "Easy",
    elo: 800,
    moveTime: 500,
  },
  medium: {
    label: "Medium",
    elo: 1200,
    moveTime: 700,
  },
  hard: {
    label: "Hard",
    elo: 1600,
    moveTime: 1000,
  },
};

const DEFAULT_DIFFICULTY: Difficulty = "easy";

function cloneGame(game: Chess) {
  const clonedGame = new Chess();

  clonedGame.loadPgn(game.pgn());

  return clonedGame;
}

export type PlayerColor = "w" | "b"

export function useChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [resigned, setResigned] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [playerColor, setPlayerColor] = useState<PlayerColor>("w");

  const makeEngineMove = useCallback(
    (moveText: string) => {
      if (resigned) {
        return;
      }

      setGame((currentGame) => {
        const gameCopy = cloneGame(currentGame);

        const from = moveText.substring(0, 2);
        const to = moveText.substring(2, 4);
        const promotion =
          moveText.length > 4 ? moveText.substring(4, 5) : undefined;

        try {
          gameCopy.move({
            from,
            to,
            promotion: promotion || "q",
          });

          return gameCopy;
        } catch {
          return currentGame;
        }
      });
    },
    [resigned]
  );

  const {
    configureEngine,
    engineReady,
    engineThinking,
    requestBestMove,
    resetEngineThinking,
    stopThinking,
  } = useStockfish(
    {
      limitStrength: true,
      elo: difficulties[DEFAULT_DIFFICULTY].elo,
    },
    {
      onBestMove: makeEngineMove,
    }
  );

  const newGame = useCallback(() => {
    setGame(new Chess());
    resetEngineThinking();
    setResigned(false);
  }, [resetEngineThinking]);

  const askEngineMove = useCallback(
    (fen: string) => {
      requestBestMove(fen, {
        moveTime: difficulties[difficulty].moveTime,
      });
    },
    [difficulty, requestBestMove]
  );

  const makePlayerMove = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (
        resigned ||
        !engineReady ||
        engineThinking ||
        game.turn() !== playerColor
      ) {
        return false;
      }

      const gameCopy = cloneGame(game);

      try {
        const move = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });

        if (!move) {
          return false;
        }

        setGame(gameCopy);

        if (!gameCopy.isGameOver()) {
          askEngineMove(gameCopy.fen());
        }

        return true;
      } catch {
        return false;
      }
    },
    [
      askEngineMove,
      engineReady,
      engineThinking,
      game,
      resigned,
    ]
  );

  const changeDifficulty = useCallback(
    (level: Difficulty) => {
      setDifficulty(level);
      configureEngine({
        limitStrength: true,
        elo: difficulties[level].elo,
      });
      newGame();
    },
    [configureEngine, newGame]
  );

  const resignGame = useCallback(() => {
    stopThinking();
    setResigned(true);
  }, [stopThinking]);

  const changePlayerColor = useCallback(
    (color: PlayerColor) => {
      setPlayerColor(color);

      const newGameInstance = new Chess();

      setGame(newGameInstance);
      setResigned(false);
      resetEngineThinking();

      if (color === "b" && engineReady) {
        requestBestMove(newGameInstance.fen(), {
          moveTime: difficulties[difficulty].moveTime,
        });
      }
    },
    [
      difficulty,
      engineReady,
      requestBestMove,
      resetEngineThinking,
    ]
  );

  const status = useMemo(() => {
    if (!engineReady) {
      return "Loading opponent...";
    }

    if (resigned) {
      return "You resigned \u2014 Computer wins";
    }

    if (game.isCheckmate()) {
      return game.turn() === playerColor
        ? "Checkmate — Computer wins"
        : "Checkmate — You win";
    }

    if (game.isDraw()) {
      return "Draw";
    }

    if (game.isGameOver()) {
      return "Game over";
    }

    if (engineThinking) {
      return "Computer is thinking...";
    }

    if (game.isCheck()) {
      return "Check \u2014 your move";
    }

    return "Your move";
  }, [engineReady, engineThinking, game, resigned]);

  const undoMove = useCallback(() => {
    const wasEngineThinking = engineThinking;

    stopThinking();

    setGame((currentGame) => {
      const gameCopy = cloneGame(currentGame);

      if (gameCopy.history().length === 0) {
        return currentGame;
      }

      // Selalu hapus move terakhir
      gameCopy.undo();

      // Kalau bot sudah selesai bergerak,
      // hapus juga move player sebelumnya.
      if (!wasEngineThinking && gameCopy.history().length > 0) {
        gameCopy.undo();
      }

      return gameCopy;
    });

    setResigned(false);
  }, [engineThinking, stopThinking]);

  return {
    changeDifficulty,
    difficulties,
    difficulty,
    engineReady,
    engineThinking,
    game,
    isFinished: resigned || game.isGameOver(),
    makePlayerMove,
    moveHistory: game.history(),
    newGame,
    resigned,
    resignGame,
    status,
    playerColor,
    changePlayerColor,
    undoMove,
  };
}
