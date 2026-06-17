import type { CorrelationTag } from "./mock-data";

export type CorrelationLevel = "low" | "medium" | "high";

/** Devuelve nivel y penalización (en fracción) para un par de tags. */
function pairPenalty(a: CorrelationTag, b: CorrelationTag): { level: CorrelationLevel; penalty: number } {
  if (a === b) return { level: "high", penalty: 0.13 };

  const key = [a, b].sort().join("|");

  // Alta correlación (10–15%)
  const high: Record<string, number> = {
    "shots|shotsOnTarget": 0.13,
    "corners|shots": 0.1,
    "corners|shotsOnTarget": 0.1,
    "passes|shots": 0.1,
    "passes|corners": 0.1,
    "aces|serviceHold": 0.13,
    "aces|tieBreak": 0.1,
    "breaks|games": 0.12,
    "serviceHold|games": 0.12,
    "result|winner": 0.15,
  };
  if (high[key]) return { level: "high", penalty: high[key] };

  // Media (5–10%)
  const medium: Record<string, number> = {
    "goals|shots": 0.07,
    "goals|shotsOnTarget": 0.08,
    "goals|corners": 0.06,
    "goals|btts": 0.09,
    "btts|shotsOnTarget": 0.06,
    "result|goals": 0.07,
    "result|btts": 0.06,
    "winner|games": 0.08,
    "winner|sets": 0.09,
    "winner|breaks": 0.07,
    "sets|games": 0.08,
    "sets|breaks": 0.07,
    "tieBreak|games": 0.06,
    "fouls|cards": 0.09,
  };
  if (medium[key]) return { level: "medium", penalty: medium[key] };

  // Baja (0–2%)
  return { level: "low", penalty: 0.015 };
}

/** Suma de penalizaciones por pares, capada al 30%. */
export function computeCorrelationFactor(tags: (CorrelationTag | undefined)[]): {
  factor: number;
  level: CorrelationLevel;
} {
  const valid = tags.filter((t): t is CorrelationTag => !!t);
  if (valid.length < 2) return { factor: 0, level: "low" };
  let total = 0;
  let worst: CorrelationLevel = "low";
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const { level, penalty } = pairPenalty(valid[i], valid[j]);
      total += penalty;
      if (level === "high" || (level === "medium" && worst === "low")) worst = level;
    }
  }
  return { factor: Math.min(0.3, total), level: worst };
}
