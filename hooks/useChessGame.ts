"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
const COACH_ANALYSIS_DEPTH = 18;

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

  const opponentEngine = useStockfish(
    {
      limitStrength: true,
      elo: difficulties[DEFAULT_DIFFICULTY].elo,
    },
    {
      onBestMove: makeEngineMove,
    }
  );

  const coachEngine = useStockfish({
    limitStrength: false,
  });

  const {
    configureEngine,
    engineReady,
    engineThinking,
    requestBestMove,
    resetEngineThinking,
    stopThinking,
    engineInfo,
  } = opponentEngine;

  const {
    engineReady: coachEngineReady,
    engineInfo: coachAnalysis,
    requestBestMove: requestCoachAnalysis,
    stopThinking: stopCoachAnalysis,
  } = coachEngine;

  useEffect(() => {
    if (!coachEngineReady) {
      return;
    }

    requestCoachAnalysis(game.fen(), {
      depth: COACH_ANALYSIS_DEPTH,
    });
  }, [coachEngineReady, game, requestCoachAnalysis]);

  const newGame = useCallback(() => {
    const newGameInstance = new Chess();

    setGame(newGameInstance);
    resetEngineThinking();
    stopCoachAnalysis();
    setResigned(false);

    if (playerColor === "b" && engineReady) {
      requestBestMove(newGameInstance.fen(), {
        moveTime: difficulties[difficulty].moveTime,
      });
    }
  }, [
    difficulty,
    engineReady,
    playerColor,
    requestBestMove,
    resetEngineThinking,
    stopCoachAnalysis,
  ]);

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
      playerColor,
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
    stopCoachAnalysis();
    setResigned(true);
  }, [stopThinking, stopCoachAnalysis]);

  const changePlayerColor = useCallback(
    (color: PlayerColor) => {
      setPlayerColor(color);

      const newGameInstance = new Chess();

      setGame(newGameInstance);
      setResigned(false);
      resetEngineThinking();
      stopCoachAnalysis();

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
      stopCoachAnalysis,
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
  }, [engineReady, engineThinking, game, resigned, playerColor,]);

  const undoMove = useCallback(() => {
    const wasEngineThinking = engineThinking;

    stopThinking();
    stopCoachAnalysis();

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
  }, [engineThinking, stopThinking, stopCoachAnalysis]);

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
    opponentAnalysis: engineInfo,
    coachAnalysis,
  };
}
