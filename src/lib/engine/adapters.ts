// Adaptadores: convierten las estructuras de datos de la app (TeamForm) en
// los inputs que consume el engine determinista. Mantienen la UI ajena al
// modelo matemático: la UI sigue trabajando con TeamForm.

import type { TeamForm } from "../mock-data";
import type {
  FootballMatchInput,
  FootballTeamInput,
  TennisMatchInput,
  TennisPlayerInput,
} from "./inputs";

function formScore(rec: { wins: number; draws: number; losses: number }): number {
  const total = rec.wins + rec.draws + rec.losses;
  if (total <= 0) return 0.5;
  // 1 por victoria, 0.5 por empate.
  return (rec.wins + rec.draws * 0.5) / total;
}

export function toFootballTeamInput(team: TeamForm): FootballTeamInput {
  const f10 = team.avg10.for;
  const a10 = team.avg10.against;
  return {
    name: team.name,
    shots_for_avg: f10.shots ?? 0,
    shots_against_avg: a10.shots ?? 0,
    goals_scored_avg: f10.goals ?? 0,
    goals_conceded_avg: a10.goals ?? 0,
    corners_for_avg: f10.corners ?? 0,
    corners_against_avg: a10.corners ?? 0,
    possession_avg: f10.possession ?? 50,
    form_last5_score: formScore(team.last5),
    form_last10_score: formScore(team.last10),
  };
}

export function toFootballMatchInput(
  home: TeamForm,
  away: TeamForm,
  leagueAverage = 10,
): FootballMatchInput {
  return {
    teamA: toFootballTeamInput(home),
    teamB: toFootballTeamInput(away),
    leagueAverage,
  };
}

export function toTennisPlayerInput(
  team: TeamForm,
  surface?: "hard" | "clay" | "grass",
): TennisPlayerInput {
  const f10 = team.avg10.for;
  const a10 = team.avg10.against;
  // Heurísticas suaves para mapear stats existentes → rates 0-1.
  const games = f10.games ?? 0;
  const gamesAgainst = a10.games ?? 0;
  const totalGames = games + gamesAgainst || 1;
  const serveHold = Math.max(0, Math.min(1, games / totalGames));
  const breakRate = Math.max(0, Math.min(1, (f10.breaks ?? 0) / 6));
  const firstServeWin = Math.max(
    0,
    Math.min(1, 0.5 + ((f10.aces ?? 0) - (f10.doubleFaults ?? 0)) / 20),
  );
  const returnRate = Math.max(0, Math.min(1, (f10.breaks ?? 0) / Math.max(1, gamesAgainst)));
  const surfaceWin = (() => {
    if (!surface || !team.surfaceFor?.[surface]) return serveHold;
    const sg = team.surfaceFor[surface]?.games ?? games;
    return Math.max(0, Math.min(1, sg / Math.max(1, sg + gamesAgainst)));
  })();
  const recentForm = formScore(team.last10);

  return {
    name: team.name,
    serve_hold_rate: serveHold,
    break_rate: breakRate,
    first_serve_win_rate: firstServeWin,
    return_points_won_rate: returnRate,
    surface_win_rate: surfaceWin,
    recent_form_score: recentForm,
  };
}

export function toTennisMatchInput(
  home: TeamForm,
  away: TeamForm,
  surface?: "hard" | "clay" | "grass",
): TennisMatchInput {
  return {
    playerA: toTennisPlayerInput(home, surface),
    playerB: toTennisPlayerInput(away, surface),
  };
}
