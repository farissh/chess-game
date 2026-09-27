"use client";

type GameStatusProps = {
  status: string;
};

export function GameStatus({ status }: GameStatusProps) {
  return <p className="font-semibold">{status}</p>;
}
