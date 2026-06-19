// Deterministic football model. Formulas come strictly from the spec.
// Do NOT add coefficients, heuristics or Poisson here.

import type { FootballMatchInput, FootballTeamInput } from "./inputs";
import { TraceBuilder, round, type TraceStep } from "./trace";

export interface TeamComputation {
  formFactor: number;
  attack: number;
  defense: number;
  adjustedAttack: number;
  teamStrength: number;
  trace: TraceStep[];
}

export interface FootballResult {
  teamA: TeamComputation;
  teamB: TeamComputation;
  matchDiff: number;
  probabilityRaw: number; // before clamp
  probability: number; // clamped 5–95
  trace: TraceStep[];
}

function computeTeam(
  team: FootballTeamInput,
  rivalDefense: number,
  leagueAverage: number,
  label: string,
): TeamComputation {
  const t = new TraceBuilder();

  // 2.1 FormFactor = (form_last5_score - form_last10_score) * 2
  const formFactor = t.add({
    label: `${label} · FormFactor`,
    formula: "(form_last5_score - form_last10_score) * 2",
    inputs: {
      form_last5_score: team.form_last5_score,
      form_last10_score: team.form_last10_score,
    },
    result: round((team.form_last5_score - team.form_last10_score) * 2),
  });

  // 2.2 Attack
  const attack = t.add({
    label: `${label} · Attack`,
    formula:
      "shots_for_avg*0.4 + goals_scored_avg*30 + corners_for_avg*0.2 + possession_avg*0.1 + FormFactor",
    inputs: {
      shots_for_avg: team.shots_for_avg,
      goals_scored_avg: team.goals_scored_avg,
      corners_for_avg: team.corners_for_avg,
      possession_avg: team.possession_avg,
      FormFactor: formFactor,
    },
    result: round(
      team.shots_for_avg * 0.4 +
        team.goals_scored_avg * 30 +
        team.corners_for_avg * 0.2 +
        team.possession_avg * 0.1 +
        formFactor,
    ),
  });

  // 2.3 Defense (own defense, used by rival's adjustment)
  const defense = t.add({
    label: `${label} · Defense`,
    formula:
      "shots_against_avg*0.5 + goals_conceded_avg*30 + corners_against_avg*0.2",
    inputs: {
      shots_against_avg: team.shots_against_avg,
      goals_conceded_avg: team.goals_conceded_avg,
      corners_against_avg: team.corners_against_avg,
    },
    result: round(
      team.shots_against_avg * 0.5 +
        team.goals_conceded_avg * 30 +
        team.corners_against_avg * 0.2,
    ),
  });

  // 2.4 AdjustedAttack = Attack * (RivalDefense / LeagueAverage)
  const adjustedAttack = t.add({
    label: `${label} · AdjustedAttack`,
    formula: "Attack * (RivalDefense / LeagueAverage)",
    inputs: { Attack: attack, RivalDefense: rivalDefense, LeagueAverage: leagueAverage },
    result: round(leagueAverage === 0 ? 0 : attack * (rivalDefense / leagueAverage)),
  });

  // 2.5 TeamStrength = AdjustedAttack - Defense (AdjustedDefense ≡ own Defense per spec)
  const teamStrength = t.add({
    label: `${label} · TeamStrength`,
    formula: "AdjustedAttack - AdjustedDefense",
    inputs: { AdjustedAttack: adjustedAttack, AdjustedDefense: defense },
    result: round(adjustedAttack - defense),
  });

  return {
    formFactor,
    attack,
    defense,
    adjustedAttack,
    teamStrength,
    trace: t.build(),
  };
}

export function computeFootball(input: FootballMatchInput): FootballResult {
  // Defenses are needed before adjustment.
  const rawA = {
    defense:
      input.teamA.shots_against_avg * 0.5 +
      input.teamA.goals_conceded_avg * 30 +
      input.teamA.corners_against_avg * 0.2,
  };
  const rawB = {
    defense:
      input.teamB.shots_against_avg * 0.5 +
      input.teamB.goals_conceded_avg * 30 +
      input.teamB.corners_against_avg * 0.2,
  };

  const teamA = computeTeam(input.teamA, rawB.defense, input.leagueAverage, input.teamA.name || "A");
  const teamB = computeTeam(input.teamB, rawA.defense, input.leagueAverage, input.teamB.name || "B");

  const matchTrace = new TraceBuilder();

  const matchDiff = matchTrace.add({
    label: "MatchDiff",
    formula: "TeamStrength_A - TeamStrength_B",
    inputs: { TeamStrength_A: teamA.teamStrength, TeamStrength_B: teamB.teamStrength },
    result: round(teamA.teamStrength - teamB.teamStrength),
  });

  const probabilityRaw = matchTrace.add({
    label: "Probability (raw)",
    formula: "50 + (MatchDiff * 0.8)",
    inputs: { MatchDiff: matchDiff },
    result: round(50 + matchDiff * 0.8),
  });

  const clamped = Math.max(5, Math.min(95, probabilityRaw));
  const probability = matchTrace.add({
    label: "Probability (clamped 5–95)",
    formula: "clamp(Probability, 5, 95)",
    inputs: { Probability: probabilityRaw },
    result: round(clamped),
  });

  return {
    teamA,
    teamB,
    matchDiff,
    probabilityRaw,
    probability,
    trace: matchTrace.build(),
  };
}
