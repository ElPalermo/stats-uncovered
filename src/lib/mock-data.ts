export type Sport = "football" | "tennis" | "basketball" | "f1";

export interface TeamForm {
  name: string;
  logo?: string;
  last15: { wins: number; draws: number; losses: number };
  avgStats: Record<string, number>;
}

export interface Match {
  id: string;
  sport: Sport;
  league: string;
  status: "live" | "upcoming" | "finished";
  minute?: number;
  startTime: string; // ISO
  home: TeamForm;
  away: TeamForm;
  scoreHome?: number;
  scoreAway?: number;
  predictions: { label: string; value: number; unit?: string }[];
}

const now = new Date();
const iso = (h: number, m = 0) => {
  const d = new Date(now);
  d.setHours(now.getHours() + h, m, 0, 0);
  return d.toISOString();
};

export const MATCHES: Match[] = [
  {
    id: "1",
    sport: "football",
    league: "LaLiga",
    status: "live",
    minute: 67,
    startTime: iso(-1, -7),
    scoreHome: 2,
    scoreAway: 1,
    home: {
      name: "Real Madrid",
      last15: { wins: 11, draws: 2, losses: 2 },
      avgStats: { goals: 2.4, corners: 6.1, shots: 15.2, possession: 58 },
    },
    away: {
      name: "Sevilla",
      last15: { wins: 7, draws: 4, losses: 4 },
      avgStats: { goals: 1.5, corners: 4.8, shots: 11.1, possession: 47 },
    },
    predictions: [
      { label: "Over 2.5 goals", value: 78, unit: "%" },
      { label: "Both teams to score", value: 64, unit: "%" },
      { label: "Over 9.5 corners", value: 71, unit: "%" },
      { label: "Home win", value: 62, unit: "%" },
    ],
  },
  {
    id: "2",
    sport: "football",
    league: "LaLiga",
    status: "upcoming",
    startTime: iso(2, 30),
    home: {
      name: "FC Barcelona",
      last15: { wins: 10, draws: 3, losses: 2 },
      avgStats: { goals: 2.7, corners: 7.2, shots: 17.4, possession: 64 },
    },
    away: {
      name: "Atlético Madrid",
      last15: { wins: 9, draws: 4, losses: 2 },
      avgStats: { goals: 1.9, corners: 5.0, shots: 12.8, possession: 49 },
    },
    predictions: [
      { label: "Over 2.5 goals", value: 69, unit: "%" },
      { label: "BTTS", value: 71, unit: "%" },
      { label: "Over 10.5 corners", value: 58, unit: "%" },
      { label: "Draw or Barça", value: 74, unit: "%" },
    ],
  },
  {
    id: "3",
    sport: "tennis",
    league: "ATP Madrid Open",
    status: "live",
    minute: undefined,
    startTime: iso(-2),
    scoreHome: 1,
    scoreAway: 1,
    home: {
      name: "Carlos Alcaraz",
      last15: { wins: 13, draws: 0, losses: 2 },
      avgStats: { aces: 8.4, doubleFaults: 2.1, firstServePct: 68, breakPts: 4.2 },
    },
    away: {
      name: "Jannik Sinner",
      last15: { wins: 12, draws: 0, losses: 3 },
      avgStats: { aces: 7.1, doubleFaults: 2.6, firstServePct: 65, breakPts: 3.8 },
    },
    predictions: [
      { label: "Over 22.5 games", value: 72, unit: "%" },
      { label: "Over 14.5 aces (match)", value: 66, unit: "%" },
      { label: "Match to 3 sets", value: 58, unit: "%" },
      { label: "Alcaraz to win", value: 54, unit: "%" },
    ],
  },
  {
    id: "4",
    sport: "basketball",
    league: "Liga ACB",
    status: "upcoming",
    startTime: iso(4),
    home: {
      name: "Real Madrid Baloncesto",
      last15: { wins: 12, draws: 0, losses: 3 },
      avgStats: { points: 86.2, rebounds: 35.1, assists: 19.4, threes: 11.3 },
    },
    away: {
      name: "FC Barcelona Bàsquet",
      last15: { wins: 11, draws: 0, losses: 4 },
      avgStats: { points: 83.5, rebounds: 33.8, assists: 20.1, threes: 10.6 },
    },
    predictions: [
      { label: "Over 165.5 points", value: 61, unit: "%" },
      { label: "Over 21.5 threes", value: 57, unit: "%" },
      { label: "Home -3.5", value: 52, unit: "%" },
      { label: "First half over 82.5", value: 64, unit: "%" },
    ],
  },
  {
    id: "5",
    sport: "f1",
    league: "Spanish Grand Prix",
    status: "upcoming",
    startTime: iso(20),
    home: {
      name: "Max Verstappen",
      last15: { wins: 9, draws: 0, losses: 6 },
      avgStats: { polePct: 60, podiumPct: 87, avgFinish: 2.1, dnfPct: 7 },
    },
    away: {
      name: "Lando Norris",
      last15: { wins: 4, draws: 0, losses: 11 },
      avgStats: { polePct: 27, podiumPct: 67, avgFinish: 3.4, dnfPct: 13 },
    },
    predictions: [
      { label: "Verstappen podium", value: 84, unit: "%" },
      { label: "Safety car", value: 62, unit: "%" },
      { label: "Norris top 5", value: 78, unit: "%" },
      { label: "Sub 1:18 pole", value: 55, unit: "%" },
    ],
  },
  {
    id: "6",
    sport: "football",
    league: "Premier League",
    status: "finished",
    startTime: iso(-5),
    scoreHome: 3,
    scoreAway: 2,
    home: {
      name: "Manchester City",
      last15: { wins: 12, draws: 2, losses: 1 },
      avgStats: { goals: 2.8, corners: 7.6, shots: 18.1, possession: 66 },
    },
    away: {
      name: "Arsenal",
      last15: { wins: 10, draws: 3, losses: 2 },
      avgStats: { goals: 2.1, corners: 6.0, shots: 14.5, possession: 56 },
    },
    predictions: [
      { label: "Over 2.5 (hit)", value: 100, unit: "%" },
      { label: "BTTS (hit)", value: 100, unit: "%" },
      { label: "Over 10.5 corners", value: 0, unit: "%" },
      { label: "Home win (hit)", value: 100, unit: "%" },
    ],
  },
];

export const SPORT_LABEL: Record<Sport, string> = {
  football: "Football",
  tennis: "Tennis",
  basketball: "Basketball",
  f1: "Formula 1",
};
