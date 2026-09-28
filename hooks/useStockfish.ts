"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createStockfish } from "@/lib/stockfish";

export type StockfishConfig = {
  limitStrength?: boolean;
  elo?: number;
};

export type BestMoveRequest =
  | {
      depth: number;
      moveTime?: never;
    }
  | {
      depth?: never;
      moveTime: number;
    };

export type StockfishBestMove = {
  id: number;
  move: string;
};

type UseStockfishOptions = {
  onBestMove?: (move: string) => void;
};

function sendConfiguration(engine: Worker, config: StockfishConfig) {
  if (typeof config.limitStrength === "boolean") {
    engine.postMessage(
      `setoption name UCI_LimitStrength value ${config.limitStrength}`
    );
  }

  if (typeof config.elo === "number") {
    engine.postMessage(`setoption name UCI_Elo value ${config.elo}`);
  }
}

export type EngineScoreType = "cp" | "mate";

export type EngineInfo = {
  depth: number;
  scoreType: EngineScoreType;
  score: number;
  pv: string[];
  bestMove: string | null;
};

export function parseInfoMessage(message: string): EngineInfo | null {
  if (!message.startsWith("info ")) {
    return null;
  }

  const parts = message.trim().split(/\s+/);

  const depthIndex = parts.indexOf("depth");
  const scoreIndex = parts.indexOf("score");
  const pvIndex = parts.indexOf("pv");

  if (depthIndex === -1 || scoreIndex === -1) {
    return null;
  }

  const depth = Number(parts[depthIndex + 1]);

  const scoreType = parts[scoreIndex + 1] as EngineScoreType;
  const score = Number(parts[scoreIndex + 2]);

  if (
    Number.isNaN(depth) ||
    Number.isNaN(score) ||
    !["cp", "mate"].includes(scoreType)
  ) {
    return null;
  }

  const pv =
    pvIndex !== -1
      ? parts.slice(pvIndex + 1)
      : [];

  return {
    depth,
    scoreType,
    score,
    pv,
    bestMove: pv[0] ?? null,
  };
}

export function useStockfish(
  initialConfig: StockfishConfig = {},
  options: UseStockfishOptions = {}
) {
  const stockfishRef = useRef<Worker | null>(null);
  const latestInfoRef = useRef<EngineInfo | null>(null);
  const configRef = useRef<StockfishConfig>(initialConfig);
  const onBestMoveRef = useRef(options.onBestMove);
  const bestMoveIdRef = useRef(0);
  const [engineInfo, setEngineInfo] = useState<EngineInfo | null>(null);

  const [engineReady, setEngineReady] = useState(false);
  const [engineThinking, setEngineThinking] = useState(false);
  const [bestMove, setBestMove] = useState<StockfishBestMove | null>(null);

  useEffect(() => {
    onBestMoveRef.current = options.onBestMove;
  }, [options.onBestMove]);

  const configureEngine = useCallback(
    (config: StockfishConfig) => {
      configRef.current = {
        ...configRef.current,
        ...config,
      };

      const engine = stockfishRef.current;

      if (!engine || !engineReady) {
        return;
      }

      sendConfiguration(engine, configRef.current);
    },
    [engineReady]
  );

  const requestBestMove = useCallback(
    (fen: string, request: BestMoveRequest) => {
      const engine = stockfishRef.current;

      if (!engine || !engineReady) {
        return;
      }

      setBestMove(null);
      setEngineInfo(null);
      latestInfoRef.current = null;

      setEngineThinking(true);

      engine.postMessage(`position fen ${fen}`);

      if (typeof request.depth === "number") {
        engine.postMessage(`go depth ${request.depth}`);
      } else {
        engine.postMessage(`go movetime ${request.moveTime}`);
      }
    },
    [engineReady]
  );

  const resetEngineThinking = useCallback(() => {
    setEngineThinking(false);
  }, []);

  const stopThinking = useCallback(() => {
    const engine = stockfishRef.current;

    if (!engine) {
      return;
    }

    engine.postMessage("stop");
    setEngineThinking(false);
  }, []);

  useEffect(() => {
    const engine = createStockfish();

    stockfishRef.current = engine;

    engine.onmessage = (event: MessageEvent<string>) => {
      const message = event.data;

      console.log("Stockfish:", message);

      if (message === "uciok") {
        engine.postMessage("isready");
        return;
      }

      if (message === "readyok") {
        setEngineReady(true);
        sendConfiguration(engine, configRef.current);
        return;
      }

      if (message.startsWith("info ")) {
        const info = parseInfoMessage(message);

        if (info) {
          latestInfoRef.current = info;
        }

        return;
      }

      if (message.startsWith("bestmove")) {
        const [, move] = message.split(" ");

        setEngineThinking(false);

        if (!move || move === "(none)") {
          setBestMove(null);
          setEngineInfo(null);
          return;
        }

        const latestInfo = latestInfoRef.current;

        if (latestInfo) {
          setEngineInfo({
            ...latestInfo,
            bestMove: move,
          });
        }

        bestMoveIdRef.current += 1;

        setBestMove({
          id: bestMoveIdRef.current,
          move,
        });

        onBestMoveRef.current?.(move);
      }
    };

    engine.postMessage("uci");

    return () => {
      stockfishRef.current = null;
      engine.terminate();
    };
  }, []);

  return {
    bestMove,
    engineInfo,
    configureEngine,
    engineReady,
    engineThinking,
    requestBestMove,
    resetEngineThinking,
    stopThinking,
  };
}
