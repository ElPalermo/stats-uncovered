export type Sport = "football" | "tennis";

/** Probabilidad calculada con dos muestras distintas. */
export interface SampleProb {
  last5: number;
  last10: number;
}

/** Probabilidad por superficie (solo tenis). */
export interface SurfaceProb {
  hard?: SampleProb;
  clay?: SampleProb;
  grass?: SampleProb;
}

export interface StatsBlock {
  for: Record<string, number>;
  against: Record<string, number>;
}

export interface TeamForm {
  name: string;
  last5: { wins: number; draws: number; losses: number };
  last10: { wins: number; draws: number; losses: number };
  avg5: StatsBlock;
  avg10: StatsBlock;
  /** Tenis: stats por superficie (a favor). */
  surfaceFor?: { hard?: Record<string, number>; clay?: Record<string, number>; grass?: Record<string, number> };
}

export interface TieredThreshold {
  line: number;
  overPct: SampleProb;
  /** Si el mercado es por equipo, desglose: */
  homePct?: SampleProb;
  awayPct?: SampleProb;
  /** Tenis: por superficie. */
  surface?: SurfaceProb;
}

export interface CompareEntry {
  metric: string;
  homePct: SampleProb;
  awayPct: SampleProb;
}

export interface ItemEntry {
  label: string;
  pct: SampleProb;
}

export type CorrelationTag =
  | "goals"
  | "btts"
  | "cards"
  | "fouls"
  | "corners"
  | "shots"
  | "shotsOnTarget"
  | "passes"
  | "result"
  | "aces"
  | "doubleFaults"
  | "breaks"
  | "games"
  | "sets"
  | "tieBreak"
  | "serviceHold"
  | "winner";

export type PredictionSection =
  | {
      kind: "tiered";
      group: string;
      id: string;
      title: string;
      thresholds: TieredThreshold[];
      correlationTag?: CorrelationTag;
    }
  | {
      kind: "compare";
      group: string;
      id: string;
      title: string;
      entries: CompareEntry[];
    }
  | {
      kind: "items";
      group: string;
      id: string;
      title: string;
      items: ItemEntry[];
      correlationTag?: CorrelationTag;
    };

/** Árbitro asignado al partido (solo fútbol). */
export interface RefereeStats {
  name: string;
  last5: { matches: number; yellow: number; red: number; fouls: number };
  last10: { matches: number; yellow: number; red: number; fouls: number };
  leagueAvg: { yellow: number; red: number; fouls: number };
}

export interface H2H {
  total: { wins1: number; wins2: number };
  surface?: { hard?: [number, number]; clay?: [number, number]; grass?: [number, number] };
}

export interface Fatigue {
  minutesL5: number;
  setsL5: number;
  matches7d: number;
  matches14d: number;
}

export interface Ranking {
  rank: number;
  rankAvgOpponents5: number;
  rankAvgOpponents10: number;
  vsTop10: { wins: number; played: number };
  vsTop20: { wins: number; played: number };
  vsTop50: { wins: number; played: number };
}

export interface ServeStats {
  firstServePct: number;
  pointsWon1stServe: number;
  pointsWon2ndServe: number;
  serviceGamesWon: number;
  holdPct: number;
  bpSaved: number;
  bpConverted: number;
}

export interface Match {
  id: string;
  sport: Sport;
  league: string;
  status: "upcoming";
  startTime: string;
  home: TeamForm;
  away: TeamForm;
  sources?: string[];
  predictionSections: PredictionSection[];
  /** Solo fútbol */
  referee?: RefereeStats;
  /** Solo tenis */
  surface?: "hard" | "clay" | "grass";
  h2h?: H2H;
  fatigue?: { home: Fatigue; away: Fatigue };
  ranking?: { home: Ranking; away: Ranking };
  serve?: { home: ServeStats; away: ServeStats };
}

/* ---------- Tiempo (anclado para hidratación SSR estable) ---------- */
const now = new Date("2026-06-14T12:00:00.000Z");
const iso = (h: number, m = 0) => {
  const d = new Date(now);
  d.setUTCHours(now.getUTCHours() + h, m, 0, 0);
  return d.toISOString();
};

/* ---------- Construcción de mercados delegada al módulo de markets ----------
 * mock-data.ts deja de contener probabilidades hardcoded ni cálculos.
 * Toda la matemática vive en src/lib/engine (fuente única de verdad) y
 * src/lib/markets (derivación a mercados). Aquí solo hay stats base.
 */
import { buildFootballPredictions, buildTennisPredictions } from "./markets";

/* ---------- Constructores de equipos ---------- */
function ft(
  name: string,
  last5: TeamForm["last5"],
  last10: TeamForm["last10"],
  f10: Record<string, number>,
  a10: Record<string, number>,
  f5?: Record<string, number>,
  a5?: Record<string, number>,
  surfaceFor?: TeamForm["surfaceFor"],
): TeamForm {
  return {
    name,
    last5,
    last10,
    avg5: { for: f5 ?? f10, against: a5 ?? a10 },
    avg10: { for: f10, against: a10 },
    surfaceFor,
  };
}

/* ---------- Equipos fútbol ---------- */
const realMadrid = ft("Real Madrid",
  { wins: 4, draws: 1, losses: 0 },
  { wins: 8, draws: 1, losses: 1 },
  { goals: 2.4, shots: 15.2, shotsOnTarget: 6.1, corners: 6.1, yellowCards: 2.1, foulsCommitted: 11.4, foulsDrawn: 12.8, passes: 612 },
  { goals: 0.9, shots: 9.2,  shotsOnTarget: 3.1, corners: 3.8, yellowCards: 1.9, foulsCommitted: 11.0, foulsDrawn: 10.6, passes: 410 },
  { goals: 2.8, shots: 16.4, shotsOnTarget: 6.8, corners: 6.6, yellowCards: 2.0, foulsCommitted: 10.8, foulsDrawn: 13.2, passes: 640 },
  { goals: 0.6, shots: 8.4,  shotsOnTarget: 2.6, corners: 3.4, yellowCards: 1.8, foulsCommitted: 10.6, foulsDrawn: 10.2, passes: 398 },
);
const sevilla = ft("Sevilla",
  { wins: 2, draws: 1, losses: 2 },
  { wins: 4, draws: 3, losses: 3 },
  { goals: 1.2, shots: 11.1, shotsOnTarget: 3.9, corners: 4.8, yellowCards: 2.8, foulsCommitted: 13.1, foulsDrawn: 11.0, passes: 484 },
  { goals: 1.4, shots: 12.6, shotsOnTarget: 4.4, corners: 5.2, yellowCards: 2.0, foulsCommitted: 11.6, foulsDrawn: 12.8, passes: 462 },
);
const barcelona = ft("FC Barcelona",
  { wins: 4, draws: 1, losses: 0 },
  { wins: 7, draws: 2, losses: 1 },
  { goals: 2.6, shots: 17.4, shotsOnTarget: 6.8, corners: 7.2, yellowCards: 2.0, foulsCommitted: 10.8, foulsDrawn: 12.2, passes: 678 },
  { goals: 1.1, shots: 9.8,  shotsOnTarget: 3.3, corners: 4.0, yellowCards: 2.1, foulsCommitted: 11.4, foulsDrawn: 10.4, passes: 420 },
);
const atletico = ft("Atlético Madrid",
  { wins: 3, draws: 2, losses: 0 },
  { wins: 6, draws: 3, losses: 1 },
  { goals: 1.7, shots: 12.8, shotsOnTarget: 4.6, corners: 5.0, yellowCards: 2.6, foulsCommitted: 13.6, foulsDrawn: 12.0, passes: 498 },
  { goals: 0.9, shots: 9.4,  shotsOnTarget: 3.0, corners: 4.2, yellowCards: 2.0, foulsCommitted: 11.0, foulsDrawn: 11.6, passes: 432 },
);
const mancity = ft("Manchester City",
  { wins: 5, draws: 0, losses: 0 },
  { wins: 8, draws: 1, losses: 1 },
  { goals: 2.8, shots: 18.1, shotsOnTarget: 7.2, corners: 7.6, yellowCards: 1.9, foulsCommitted: 10.2, foulsDrawn: 11.1, passes: 702 },
  { goals: 0.8, shots: 8.6,  shotsOnTarget: 2.9, corners: 3.6, yellowCards: 1.6, foulsCommitted: 10.0, foulsDrawn: 10.2, passes: 388 },
);
const arsenal = ft("Arsenal",
  { wins: 4, draws: 1, losses: 0 },
  { wins: 7, draws: 2, losses: 1 },
  { goals: 2.1, shots: 14.5, shotsOnTarget: 5.5, corners: 6.0, yellowCards: 2.2, foulsCommitted: 11.0, foulsDrawn: 11.8, passes: 588 },
  { goals: 1.0, shots: 9.4,  shotsOnTarget: 3.1, corners: 3.9, yellowCards: 1.8, foulsCommitted: 10.6, foulsDrawn: 10.8, passes: 416 },
);

/* ---------- Árbitros ---------- */
const refMateuLahoz: RefereeStats = {
  name: "Mateu Lahoz",
  last5: { matches: 5, yellow: 32, red: 2, fouls: 154 },
  last10: { matches: 10, yellow: 62, red: 3, fouls: 304 },
  leagueAvg: { yellow: 4.8, red: 0.18, fouls: 24 },
};
const refOliver: RefereeStats = {
  name: "Michael Oliver",
  last5: { matches: 5, yellow: 18, red: 0, fouls: 102 },
  last10: { matches: 10, yellow: 38, red: 1, fouls: 215 },
  leagueAvg: { yellow: 3.9, red: 0.12, fouls: 22 },
};
const refSanchezMartinez: RefereeStats = {
  name: "Sánchez Martínez",
  last5: { matches: 5, yellow: 24, red: 1, fouls: 128 },
  last10: { matches: 10, yellow: 49, red: 2, fouls: 248 },
  leagueAvg: { yellow: 4.8, red: 0.18, fouls: 24 },
};

/* ---------- Tenis (jugadores) ---------- */
const alcaraz = ft("Carlos Alcaraz",
  { wins: 5, draws: 0, losses: 0 },
  { wins: 9, draws: 0, losses: 1 },
  { aces: 8.4, doubleFaults: 2.1, games: 13.2, sets: 2.4, breaks: 3.1 },
  { aces: 4.6, doubleFaults: 2.6, games: 9.1,  sets: 2.4, breaks: 1.8 },
  { aces: 9.6, doubleFaults: 1.8, games: 13.8, sets: 2.3, breaks: 3.4 },
  { aces: 4.2, doubleFaults: 2.4, games: 8.6,  sets: 2.3, breaks: 1.6 },
  { hard: { aces: 8.9, doubleFaults: 2.0, games: 13.0, sets: 2.4, breaks: 3.0 },
    clay: { aces: 7.2, doubleFaults: 2.3, games: 14.1, sets: 2.5, breaks: 3.4 },
    grass: { aces: 11.2, doubleFaults: 1.8, games: 13.6, sets: 2.3, breaks: 2.8 } },
);
const sinner = ft("Jannik Sinner",
  { wins: 4, draws: 0, losses: 1 },
  { wins: 8, draws: 0, losses: 2 },
  { aces: 7.1, doubleFaults: 2.6, games: 12.6, sets: 2.4, breaks: 2.8 },
  { aces: 5.0, doubleFaults: 2.4, games: 9.4,  sets: 2.4, breaks: 2.0 },
  { aces: 7.8, doubleFaults: 2.2, games: 13.2, sets: 2.3, breaks: 3.0 },
  { aces: 4.6, doubleFaults: 2.4, games: 8.8,  sets: 2.3, breaks: 1.8 },
  { hard: { aces: 8.2, doubleFaults: 2.4, games: 13.4, sets: 2.3, breaks: 3.1 },
    clay: { aces: 5.8, doubleFaults: 2.8, games: 12.0, sets: 2.5, breaks: 2.4 },
    grass: { aces: 9.4, doubleFaults: 2.2, games: 12.8, sets: 2.2, breaks: 2.6 } },
);

/* ---------- Construcción de partidos ---------- */
const SOURCES = ["Sofascore", "FotMob", "WhoScored", "FBref"];
const TENNIS_SOURCES = ["Sofascore", "Tennis Abstract", "ATP Stats", "Ultimate Tennis Stats"];

export const MATCHES: Match[] = [
  {
    id: "1", sport: "football", league: "LaLiga", status: "upcoming", startTime: iso(2),
    sources: SOURCES,
    home: realMadrid, away: sevilla,
    referee: refSanchezMartinez,
    predictionSections: buildFootballPredictions(realMadrid, sevilla, refSanchezMartinez),
  },
  {
    id: "2", sport: "football", league: "LaLiga", status: "upcoming", startTime: iso(5),
    sources: SOURCES,
    home: barcelona, away: atletico,
    referee: refMateuLahoz,
    predictionSections: buildFootballPredictions(barcelona, atletico, refMateuLahoz),
  },
  {
    id: "3", sport: "football", league: "Premier League", status: "upcoming", startTime: iso(7),
    sources: SOURCES,
    home: mancity, away: arsenal,
    referee: refOliver,
    predictionSections: buildFootballPredictions(mancity, arsenal, refOliver),
  },
  {
    id: "4", sport: "tennis", league: "ATP Roland Garros · Final", status: "upcoming", startTime: iso(4),
    sources: TENNIS_SOURCES,
    home: alcaraz, away: sinner,
    surface: "clay",
    h2h: {
      total: { wins1: 5, wins2: 4 },
      surface: { hard: [2, 3], clay: [2, 0], grass: [1, 1] },
    },
    fatigue: {
      home: { minutesL5: 932, setsL5: 16, matches7d: 3, matches14d: 5 },
      away: { minutesL5: 1024, setsL5: 18, matches7d: 3, matches14d: 5 },
    },
    ranking: {
      home: { rank: 2, rankAvgOpponents5: 38, rankAvgOpponents10: 45,
        vsTop10: { wins: 6, played: 9 }, vsTop20: { wins: 14, played: 18 }, vsTop50: { wins: 28, played: 32 } },
      away: { rank: 1, rankAvgOpponents5: 31, rankAvgOpponents10: 40,
        vsTop10: { wins: 7, played: 10 }, vsTop20: { wins: 16, played: 20 }, vsTop50: { wins: 30, played: 34 } },
    },
    serve: {
      home: { firstServePct: 64, pointsWon1stServe: 76, pointsWon2ndServe: 54, serviceGamesWon: 88, holdPct: 86, bpSaved: 67, bpConverted: 44 },
      away: { firstServePct: 62, pointsWon1stServe: 74, pointsWon2ndServe: 56, serviceGamesWon: 86, holdPct: 85, bpSaved: 65, bpConverted: 46 },
    },
    predictionSections: buildTennisPredictions(alcaraz, sinner, "clay"),
  },
];

export const SPORT_LABEL: Record<Sport, string> = {
  football: "Fútbol",
  tennis: "Tenis",
};

export const STAT_LABEL: Record<string, string> = {
  goals: "Goles",
  shots: "Remates",
  shotsOnTarget: "Remates a puerta",
  corners: "Córners",
  yellowCards: "Tarjetas",
  foulsCommitted: "Faltas cometidas",
  foulsDrawn: "Faltas recibidas",
  passes: "Pases",
  possession: "Posesión %",
  aces: "Aces",
  doubleFaults: "Dobles faltas",
  games: "Juegos ganados",
  sets: "Sets ganados",
  breaks: "Breaks",
};
