export type Sport = "football" | "tennis" | "basketball" | "f1";

export interface TeamForm {
  name: string;
  logo?: string;
  last15: { wins: number; draws: number; losses: number };
  avgStats: Record<string, number>;
}

export interface TieredTotal {
  metric: string; // label, e.g. "Total goles"
  unit?: string;
  thresholds: { line: number; overPct: number }[];
}

export interface CompareMore {
  metric: string;
  homePct: number;
  awayPct: number;
}

export interface DoubleChance {
  label: string; // "1X", "X2", "12"
  pct: number;
}

export interface FootballPredictions {
  totals: TieredTotal[];
  doubleChance: DoubleChance[];
  more: CompareMore[];
  btts: number; // % both teams to score
}

export interface Match {
  id: string;
  sport: Sport;
  league: string;
  status: "live" | "upcoming" | "finished";
  minute?: number;
  startTime: string;
  home: TeamForm;
  away: TeamForm;
  scoreHome?: number;
  scoreAway?: number;
  /** Para deportes no-fútbol (legacy simple). */
  predictions?: { label: string; value: number; unit?: string }[];
  /** Solo fútbol: predicciones derivadas por umbrales. */
  footballPredictions?: FootballPredictions;
  /** Fuentes de las que se promedió la información. */
  sources?: string[];
}

const now = new Date();
const iso = (h: number, m = 0) => {
  const d = new Date(now);
  d.setHours(now.getHours() + h, m, 0, 0);
  return d.toISOString();
};

/* ---------- Poisson helpers para % over/under ---------- */
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
const poissonPmf = (k: number, lambda: number) =>
  (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
/** P(X > line) para X ~ Poisson(lambda). line se asume *.5 → suma k <= floor(line). */
const overProb = (line: number, lambda: number) => {
  const cutoff = Math.floor(line);
  let cdf = 0;
  for (let k = 0; k <= cutoff; k++) cdf += poissonPmf(k, lambda);
  return Math.max(0, Math.min(1, 1 - cdf));
};
const pct = (p: number) => Math.round(p * 100);

/** Genera umbrales centrados en la media. */
function tieredAround(metric: string, lambda: number, step = 1, count = 5, startOffset = -2): TieredTotal {
  const base = Math.max(0, Math.round(lambda) + startOffset);
  const thresholds = Array.from({ length: count }, (_, i) => {
    const line = base + step * i + 0.5;
    return { line, overPct: pct(overProb(line, lambda)) };
  });
  return { metric, thresholds };
}

/* ---------- Stats base por equipo (medias últimos 15) ---------- */
type FootStats = {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  yellowCards: number;
  foulsCommitted: number;
  foulsDrawn: number;
  passes: number;
};

function buildFootballPredictions(home: FootStats, away: FootStats, hForm: TeamForm["last15"], aForm: TeamForm["last15"]): FootballPredictions {
  const totals: TieredTotal[] = [
    tieredAround("Total goles", home.goals + away.goals, 1, 6, -2),
    tieredAround("Total remates a puerta", home.shotsOnTarget + away.shotsOnTarget, 1, 5, -2),
    tieredAround("Total remates", home.shots + away.shots, 2, 5, -4),
    tieredAround("Total córners", home.corners + away.corners, 1, 5, -2),
    tieredAround("Total tarjetas", home.yellowCards + away.yellowCards, 1, 5, -2),
    tieredAround("Total faltas", home.foulsCommitted + away.foulsCommitted, 2, 5, -4),
    tieredAround("Total pases", home.passes + away.passes, 50, 5, -100),
  ];

  // Doble oportunidad derivada de forma
  const hTot = hForm.wins + hForm.draws + hForm.losses;
  const aTot = aForm.wins + aForm.draws + aForm.losses;
  const hW = hForm.wins / hTot, hD = hForm.draws / hTot, hL = hForm.losses / hTot;
  const aW = aForm.wins / aTot, aD = aForm.draws / aTot;
  // Aproximación normalizada
  const pHome = (hW * 0.6 + (1 - aW) * 0.4) * 0.9;
  const pAway = (aW * 0.6 + hL * 0.4) * 0.85;
  const pDraw = ((hD + aD) / 2 + 0.05);
  const s = pHome + pAway + pDraw;
  const PH = pHome / s, PD = pDraw / s, PA = pAway / s;
  const doubleChance: DoubleChance[] = [
    { label: "1X (Local o empate)", pct: pct(PH + PD) },
    { label: "12 (Sin empate)", pct: pct(PH + PA) },
    { label: "X2 (Empate o visitante)", pct: pct(PD + PA) },
  ];

  // Mayor número de
  const more: CompareMore[] = [
    cmp("Más córners", home.corners, away.corners),
    cmp("Más tarjetas", home.yellowCards, away.yellowCards),
    cmp("Más remates a puerta", home.shotsOnTarget, away.shotsOnTarget),
    cmp("Más faltas cometidas", home.foulsCommitted, away.foulsCommitted),
    cmp("Más pases", home.passes, away.passes),
  ];

  // BTTS aproximado: P(home>=1) * P(away>=1)
  const btts = pct((1 - Math.exp(-home.goals)) * (1 - Math.exp(-away.goals)));

  return { totals, doubleChance, more, btts };
}

function cmp(metric: string, h: number, a: number): CompareMore {
  const total = h + a || 1;
  // suavizado hacia 50/50
  const raw = h / total;
  const smoothed = 0.5 + (raw - 0.5) * 0.85;
  return { metric, homePct: pct(smoothed), awayPct: pct(1 - smoothed) };
}

/* ---------- Partidos ---------- */
const SOURCES = ["Sofascore", "FotMob", "WhoScored", "FBref"];

const realMadrid: FootStats = { goals: 2.4, shots: 15.2, shotsOnTarget: 6.1, corners: 6.1, yellowCards: 2.1, foulsCommitted: 11.4, foulsDrawn: 12.8, passes: 612 };
const sevilla: FootStats = { goals: 1.2, shots: 11.1, shotsOnTarget: 3.9, corners: 4.8, yellowCards: 2.8, foulsCommitted: 13.1, foulsDrawn: 11.0, passes: 484 };
const barcelona: FootStats = { goals: 2.6, shots: 17.4, shotsOnTarget: 6.8, corners: 7.2, yellowCards: 2.0, foulsCommitted: 10.8, foulsDrawn: 12.2, passes: 678 };
const atletico: FootStats = { goals: 1.7, shots: 12.8, shotsOnTarget: 4.6, corners: 5.0, yellowCards: 2.6, foulsCommitted: 13.6, foulsDrawn: 12.0, passes: 498 };
const mancity: FootStats = { goals: 2.8, shots: 18.1, shotsOnTarget: 7.2, corners: 7.6, yellowCards: 1.9, foulsCommitted: 10.2, foulsDrawn: 11.1, passes: 702 };
const arsenal: FootStats = { goals: 2.1, shots: 14.5, shotsOnTarget: 5.5, corners: 6.0, yellowCards: 2.2, foulsCommitted: 11.0, foulsDrawn: 11.8, passes: 588 };

function footMatch(opts: {
  id: string; league: string; status: Match["status"]; startTime: string; minute?: number;
  scoreHome?: number; scoreAway?: number;
  homeName: string; awayName: string;
  hStats: FootStats; aStats: FootStats;
  hForm: TeamForm["last15"]; aForm: TeamForm["last15"];
}): Match {
  return {
    id: opts.id,
    sport: "football",
    league: opts.league,
    status: opts.status,
    minute: opts.minute,
    startTime: opts.startTime,
    scoreHome: opts.scoreHome,
    scoreAway: opts.scoreAway,
    sources: SOURCES,
    home: { name: opts.homeName, last15: opts.hForm, avgStats: opts.hStats as unknown as Record<string, number> },
    away: { name: opts.awayName, last15: opts.aForm, avgStats: opts.aStats as unknown as Record<string, number> },
    footballPredictions: buildFootballPredictions(opts.hStats, opts.aStats, opts.hForm, opts.aForm),
  };
}

export const MATCHES: Match[] = [
  footMatch({
    id: "1", league: "LaLiga", status: "live", minute: 67, startTime: iso(-1, -7),
    scoreHome: 2, scoreAway: 1,
    homeName: "Real Madrid", awayName: "Sevilla",
    hStats: realMadrid, aStats: sevilla,
    hForm: { wins: 11, draws: 2, losses: 2 }, aForm: { wins: 7, draws: 4, losses: 4 },
  }),
  footMatch({
    id: "2", league: "LaLiga", status: "upcoming", startTime: iso(2, 30),
    homeName: "FC Barcelona", awayName: "Atlético Madrid",
    hStats: barcelona, aStats: atletico,
    hForm: { wins: 10, draws: 3, losses: 2 }, aForm: { wins: 9, draws: 4, losses: 2 },
  }),
  footMatch({
    id: "6", league: "Premier League", status: "finished", startTime: iso(-5),
    scoreHome: 3, scoreAway: 2,
    homeName: "Manchester City", awayName: "Arsenal",
    hStats: mancity, aStats: arsenal,
    hForm: { wins: 12, draws: 2, losses: 1 }, aForm: { wins: 10, draws: 3, losses: 2 },
  }),
  // ----- Otros deportes (legacy) -----
  {
    id: "3", sport: "tennis", league: "ATP Madrid Open", status: "live", startTime: iso(-2),
    scoreHome: 1, scoreAway: 1,
    home: { name: "Carlos Alcaraz", last15: { wins: 13, draws: 0, losses: 2 }, avgStats: { aces: 8.4, doubleFaults: 2.1, firstServePct: 68, breakPts: 4.2 } },
    away: { name: "Jannik Sinner", last15: { wins: 12, draws: 0, losses: 3 }, avgStats: { aces: 7.1, doubleFaults: 2.6, firstServePct: 65, breakPts: 3.8 } },
    predictions: [
      { label: "Over 22.5 games", value: 72, unit: "%" },
      { label: "Over 14.5 aces (match)", value: 66, unit: "%" },
      { label: "Match to 3 sets", value: 58, unit: "%" },
      { label: "Alcaraz to win", value: 54, unit: "%" },
    ],
  },
  {
    id: "4", sport: "basketball", league: "Liga ACB", status: "upcoming", startTime: iso(4),
    home: { name: "Real Madrid Baloncesto", last15: { wins: 12, draws: 0, losses: 3 }, avgStats: { points: 86.2, rebounds: 35.1, assists: 19.4, threes: 11.3 } },
    away: { name: "FC Barcelona Bàsquet", last15: { wins: 11, draws: 0, losses: 4 }, avgStats: { points: 83.5, rebounds: 33.8, assists: 20.1, threes: 10.6 } },
    predictions: [
      { label: "Over 165.5 points", value: 61, unit: "%" },
      { label: "Over 21.5 threes", value: 57, unit: "%" },
      { label: "Home -3.5", value: 52, unit: "%" },
      { label: "First half over 82.5", value: 64, unit: "%" },
    ],
  },
  {
    id: "5", sport: "f1", league: "Spanish Grand Prix", status: "upcoming", startTime: iso(20),
    home: { name: "Max Verstappen", last15: { wins: 9, draws: 0, losses: 6 }, avgStats: { polePct: 60, podiumPct: 87, avgFinish: 2.1, dnfPct: 7 } },
    away: { name: "Lando Norris", last15: { wins: 4, draws: 0, losses: 11 }, avgStats: { polePct: 27, podiumPct: 67, avgFinish: 3.4, dnfPct: 13 } },
    predictions: [
      { label: "Verstappen podium", value: 84, unit: "%" },
      { label: "Safety car", value: 62, unit: "%" },
      { label: "Norris top 5", value: 78, unit: "%" },
      { label: "Sub 1:18 pole", value: 55, unit: "%" },
    ],
  },
];

export const SPORT_LABEL: Record<Sport, string> = {
  football: "Fútbol",
  tennis: "Tenis",
  basketball: "Baloncesto",
  f1: "Fórmula 1",
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
  firstServePct: "1er servicio %",
  breakPts: "Break points",
  points: "Puntos",
  rebounds: "Rebotes",
  assists: "Asistencias",
  threes: "Triples",
  polePct: "% Poles",
  podiumPct: "% Podios",
  avgFinish: "Pos. media",
  dnfPct: "% DNF",
};
