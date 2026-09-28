"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { useStockfish, type EngineInfo } from "@/hooks/useStockfish";

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

function scoreFromWhitePerspective(
  score: number,
  fen: string
) {
  const sideToMove = fen.split(" ")[1];

  return sideToMove === "w"
    ? score
    : -score;
}

function scoreFromPlayerPerspective(
  score: number,
  fen: string,
  playerColor: PlayerColor
) {
  const whiteScore = scoreFromWhitePerspective(score, fen);

  return playerColor === "w"
    ? whiteScore
    : -whiteScore;
}

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

  type CoachPhase = "idle" | "before" | "after";

  const [coachPhase, setCoachPhase] = useState<CoachPhase>("idle");

  const [currentPositionAnalysis, setCurrentPositionAnalysis] =
    useState<EngineInfo | null>(null);

  const [currentPositionFen, setCurrentPositionFen] =
    useState<string | null>(null);

  const [lastMoveBeforeAnalysis, setLastMoveBeforeAnalysis] =
    useState<EngineInfo | null>(null);

  const [lastMoveAfterAnalysis, setLastMoveAfterAnalysis] =
    useState<EngineInfo | null>(null);

  const coachRequestedFenRef = useRef<string | null>(null);

  type UserMove = {
    from: string;
    to: string;
    uci: string;
  };

  const [lastUserMove, setLastUserMove] =
    useState<UserMove | null>(null);

  const [lastMoveBeforeFen, setLastMoveBeforeFen] =
    useState<string | null>(null);

  const [lastMoveAfterFen, setLastMoveAfterFen] =
    useState<string | null>(null);

  const {
    engineReady: coachEngineReady,
    engineInfo: coachAnalysis,
    requestBestMove: requestCoachAnalysis,
    stopThinking: stopCoachAnalysis,
  } = coachEngine;

  const resetCoachState = useCallback(() => {
    setCoachPhase("idle");
    setCurrentPositionAnalysis(null);
    setCurrentPositionFen(null);
    setLastMoveBeforeAnalysis(null);
    setLastMoveAfterAnalysis(null);
    coachRequestedFenRef.current = null;
  }, []);

  useEffect(() => {
    if (!coachAnalysis) {
      return;
    }

    if (coachPhase === "before") {
      setCurrentPositionAnalysis(coachAnalysis);
      setCurrentPositionFen(coachRequestedFenRef.current);
      setCoachPhase("idle");
      return;
    }

    if (coachPhase === "after") {
      setLastMoveAfterAnalysis(coachAnalysis);
      setCoachPhase("idle");
    }
  }, [coachAnalysis, coachPhase]);

  useEffect(() => {
    if (
      !coachEngineReady ||
      resigned ||
      game.isGameOver() ||
      game.turn() !== playerColor ||
      coachPhase !== "idle"
    ) {
      return;
    }

    const fen = game.fen();

    if (currentPositionFen === fen) {
      return;
    }

    coachRequestedFenRef.current = fen;
    setCoachPhase("before");

    requestCoachAnalysis(fen, {
      depth: COACH_ANALYSIS_DEPTH,
    });
  }, [
    coachEngineReady,
    coachPhase,
    currentPositionFen,
    game,
    playerColor,
    requestCoachAnalysis,
    resigned,
  ]);

  const newGame = useCallback(() => {
    const newGameInstance = new Chess();

    setGame(newGameInstance);
    resetEngineThinking();
    stopCoachAnalysis();
    resetCoachState();
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

      const currentFen = game.fen();

      if (
        !currentPositionAnalysis ||
        currentPositionFen !== currentFen ||
        coachPhase !== "idle"
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

      const userMove = {
        from: sourceSquare,
        to: targetSquare,
        uci: `${sourceSquare}${targetSquare}`,
      };

      setLastUserMove(userMove);
      setLastMoveBeforeFen(currentFen);

      setLastMoveBeforeAnalysis(currentPositionAnalysis);
      setLastMoveAfterAnalysis(null);

      setCurrentPositionAnalysis(null);
      setCurrentPositionFen(null);

      setGame(gameCopy);

      const afterFen = gameCopy.fen();

      setLastMoveAfterFen(afterFen);

      coachRequestedFenRef.current = afterFen;
      setCoachPhase("after");

      requestCoachAnalysis(afterFen, {
        depth: COACH_ANALYSIS_DEPTH,
      });

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
      coachPhase,
      currentPositionAnalysis,
      currentPositionFen,
      engineReady,
      engineThinking,
      game,
      playerColor,
      requestCoachAnalysis,
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
    stopCoachAnalysis();
    resetCoachState();
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
      resetCoachState();

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
    resetCoachState();

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

  const centipawnLoss = useMemo(() => {
    if (
      !lastMoveBeforeAnalysis ||
      !lastMoveAfterAnalysis ||
      !lastMoveBeforeFen ||
      !lastMoveAfterFen
    ) {
      return null;
    }

    if (
      lastMoveBeforeAnalysis.scoreType !== "cp" ||
      lastMoveAfterAnalysis.scoreType !== "cp"
    ) {
      return null;
    }

    const beforeScore = scoreFromPlayerPerspective(
      lastMoveBeforeAnalysis.score,
      lastMoveBeforeFen,
      playerColor
    );

    const afterScore = scoreFromPlayerPerspective(
      lastMoveAfterAnalysis.score,
      lastMoveAfterFen,
      playerColor
    );

    return Math.max(0, beforeScore - afterScore);
  }, [
    lastMoveBeforeAnalysis,
    lastMoveAfterAnalysis,
    lastMoveBeforeFen,
    lastMoveAfterFen,
    playerColor,
  ]);

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
    coachPhase,
    lastMoveBeforeAnalysis,
    lastMoveAfterAnalysis,
    lastUserMove,
    lastMoveBeforeFen,
    lastMoveAfterFen,
    centipawnLoss,
  };
}
