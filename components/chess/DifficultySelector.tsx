"use client";

import type { Difficulty, DifficultyConfig } from "@/hooks/useChessGame";

type DifficultySelectorProps = {
  difficulty: Difficulty;
  difficulties: Record<Difficulty, DifficultyConfig>;
  onChange: (difficulty: Difficulty) => void;
};

export function DifficultySelector({
  difficulty,
  difficulties,
  onChange,
}: DifficultySelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {(Object.keys(difficulties) as Difficulty[]).map((level) => (
        <button
          key={level}
          onClick={() => onChange(level)}
          className={`px-4 py-2 rounded ${
            difficulty === level
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-black"
          }`}
        >
          {difficulties[level].label}
        </button>
      ))}
    </div>
  );
}
