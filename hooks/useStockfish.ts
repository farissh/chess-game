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

export function useStockfish(
  initialConfig: StockfishConfig = {},
  options: UseStockfishOptions = {}
) {
  const stockfishRef = useRef<Worker | null>(null);
  const configRef = useRef<StockfishConfig>(initialConfig);
  const onBestMoveRef = useRef(options.onBestMove);
  const bestMoveIdRef = useRef(0);

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

      if (message.startsWith("bestmove")) {
        const [, move] = message.split(" ");

        setEngineThinking(false);

        if (!move || move === "(none)") {
          setBestMove(null);
          return;
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
    configureEngine,
    engineReady,
    engineThinking,
    requestBestMove,
    resetEngineThinking,
    stopThinking,
  };
}
