// Deterministic model inputs.
// Source of truth for the football & tennis engines. No derived fields here.

export interface FootballTeamInput {
  name: string;
  shots_for_avg: number;
  shots_against_avg: number;
  goals_scored_avg: number;
  goals_conceded_avg: number;
  corners_for_avg: number;
  corners_against_avg: number;
  possession_avg: number; // 0–100
  form_last5_score: number; // 0–1
  form_last10_score: number; // 0–1
}

export interface FootballMatchInput {
  teamA: FootballTeamInput;
  teamB: FootballTeamInput;
  leagueAverage: number; // baseline used to normalise Defense vs rival
}

export interface TennisPlayerInput {
  name: string;
  serve_hold_rate: number; // 0–1
  break_rate: number; // 0–1
  first_serve_win_rate: number; // 0–1
  return_points_won_rate: number; // 0–1
  surface_win_rate: number; // 0–1
  recent_form_score: number; // 0–1
}

export interface TennisMatchInput {
  playerA: TennisPlayerInput;
  playerB: TennisPlayerInput;
}

export const emptyFootballTeam = (name: string): FootballTeamInput => ({
  name,
  shots_for_avg: 0,
  shots_against_avg: 0,
  goals_scored_avg: 0,
  goals_conceded_avg: 0,
  corners_for_avg: 0,
  corners_against_avg: 0,
  possession_avg: 50,
  form_last5_score: 0.5,
  form_last10_score: 0.5,
});

export const emptyTennisPlayer = (name: string): TennisPlayerInput => ({
  name,
  serve_hold_rate: 0,
  break_rate: 0,
  first_serve_win_rate: 0,
  return_points_won_rate: 0,
  surface_win_rate: 0,
  recent_form_score: 0,
});
