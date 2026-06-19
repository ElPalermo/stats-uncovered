// Deterministic tennis model. Formulas come strictly from the spec.

import type { TennisMatchInput, TennisPlayerInput } from "./inputs";
import { TraceBuilder, round, type TraceStep } from "./trace";

export interface PlayerComputation {
  strength: number;
  trace: TraceStep[];
}

export interface TennisResult {
  playerA: PlayerComputation;
  playerB: PlayerComputation;
  diff: number;
  probabilityRaw: number;
  probability: number;
  trace: TraceStep[];
}

function computePlayer(p: TennisPlayerInput, label: string): PlayerComputation {
  const t = new TraceBuilder();

  const strength = t.add({
    label: `${label} · Strength`,
    formula:
      "serve_hold_rate*0.4 + break_rate*0.3 + surface_win_rate*0.2 + recent_form_score*2 + first_serve_win_rate*0.2",
    inputs: {
      serve_hold_rate: p.serve_hold_rate,
      break_rate: p.break_rate,
      surface_win_rate: p.surface_win_rate,
      recent_form_score: p.recent_form_score,
      first_serve_win_rate: p.first_serve_win_rate,
    },
    result: round(
      p.serve_hold_rate * 0.4 +
        p.break_rate * 0.3 +
        p.surface_win_rate * 0.2 +
        p.recent_form_score * 2 +
        p.first_serve_win_rate * 0.2,
    ),
  });

  return { strength, trace: t.build() };
}

export function computeTennis(input: TennisMatchInput): TennisResult {
  const playerA = computePlayer(input.playerA, input.playerA.name || "A");
  const playerB = computePlayer(input.playerB, input.playerB.name || "B");

  const t = new TraceBuilder();

  const diff = t.add({
    label: "Diff",
    formula: "Strength_A - Strength_B",
    inputs: { Strength_A: playerA.strength, Strength_B: playerB.strength },
    result: round(playerA.strength - playerB.strength),
  });

  const probabilityRaw = t.add({
    label: "Probability (raw)",
    formula: "50 + (Diff * 0.6)",
    inputs: { Diff: diff },
    result: round(50 + diff * 0.6),
  });

  const clamped = Math.max(5, Math.min(95, probabilityRaw));
  const probability = t.add({
    label: "Probability (clamped 5–95)",
    formula: "clamp(Probability, 5, 95)",
    inputs: { Probability: probabilityRaw },
    result: round(clamped),
  });

  return {
    playerA,
    playerB,
    diff,
    probabilityRaw,
    probability,
    trace: t.build(),
  };
}
