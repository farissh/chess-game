"use client";

type MoveHistoryProps = {
  moves: string[];
};

export function MoveHistory({ moves }: MoveHistoryProps) {
  return (
    <div className="w-full max-w-[500px]">
      <h2 className="font-semibold mb-2">Move History</h2>

      <div className="grid grid-cols-3 gap-2 text-sm">
        {moves.map((move, index) => (
          <div key={`${move}-${index}`}>
            {index + 1}. {move}
          </div>
        ))}
      </div>
    </div>
  );
}
