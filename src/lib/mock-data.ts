export type Sport = "football" | "tennis" | "basketball";

export interface StatsBlock {
  /** Estadísticas a favor (lo que el equipo/jugador genera). */
  for: Record<string, number>;
  /** Estadísticas en contra (lo que le hacen sus rivales). */
  against: Record<string, number>;
}

export interface TeamForm {
  name: string;
  last5: { wins: number; draws: number; losses: number };
  last15: { wins: number; draws: number; losses: number };
  avg5: StatsBlock;
  avg15: StatsBlock;
}

export interface TieredThreshold {
  line: number;
  overPct: number;
}

export interface CompareEntry {
  metric: string;
  homePct: number;
  awayPct: number;
}

export type PredictionSection =
  | { kind: "tiered"; group: string; id: string; title: string; thresholds: TieredThreshold[] }
  | { kind: "compare"; group: string; id: string; title: string; entries: CompareEntry[] }
  | { kind: "items"; group: string; id: string; title: string; items: { label: string; pct: number }[] };

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
  sources?: string[];
  predictionSections: PredictionSection[];
}

const now = new Date("2026-06-14T12:00:00.000Z");
const iso = (h: number, m = 0) => {
  const d = new Date(now);
  d.setUTCHours(now.getUTCHours() + h, m, 0, 0);
  return d.toISOString();
};

/* ---------- Poisson helpers ---------- */
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
const poissonPmf = (k: number, lambda: number) =>
  (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
const overProb = (line: number, lambda: number) => {
  const cutoff = Math.floor(line);
  let cdf = 0;
  for (let k = 0; k <= cutoff; k++) cdf += poissonPmf(k, lambda);
  return Math.max(0, Math.min(1, 1 - cdf));
};
const pct = (p: number) => Math.round(p * 100);

/** Genera líneas Over/Under filtradas para que el % caiga en [35, 95]. */
function tieredRange(group: string, id: string, title: string, lambda: number, step: number): PredictionSection {
  const all: TieredThreshold[] = [];
  let line = step >= 1 ? 0.5 : step / 2;
  for (let i = 0; i < 200; i++) {
    const p = pct(overProb(line, lambda));
    all.push({ line: Number(line.toFixed(2)), overPct: p });
    line += step;
    if (line > lambda * 4 + 10) break;
  }
  const thresholds = all.filter((t) => t.overPct >= 35 && t.overPct <= 95);
  return { kind: "tiered", group, id, title, thresholds };
}

/** Líneas fijas. */
function tieredFixed(group: string, id: string, title: string, lambda: number, lines: number[]): PredictionSection {
  return {
    kind: "tiered",
    group,
    id,
    title,
    thresholds: lines.map((line) => ({ line, overPct: pct(overProb(line, lambda)) })),
  };
}

function cmp(metric: string, h: number, a: number): CompareEntry {
  const total = h + a || 1;
  const raw = h / total;
  const smoothed = 0.5 + (raw - 0.5) * 0.85;
  return { metric, homePct: pct(smoothed), awayPct: pct(1 - smoothed) };
}

/** Lambda estimada combinando "a favor" del equipo y "en contra" del rival. */
function blend(forVal: number, againstVal: number) {
  return (forVal + againstVal) / 2;
}

/* ---------- FÚTBOL ---------- */
type FK = "goals" | "shots" | "shotsOnTarget" | "corners" | "yellowCards" | "foulsCommitted" | "foulsDrawn" | "passes";

function buildFootballPredictions(home: TeamForm, away: TeamForm): PredictionSection[] {
  const H = home.avg15.for, Ha = home.avg15.against;
  const A = away.avg15.for, Aa = away.avg15.against;
  const lam = (k: FK) => blend(H[k], Aa[k]) + blend(A[k], Ha[k]);
  const lamH = (k: FK) => blend(H[k], Aa[k]);
  const lamA = (k: FK) => blend(A[k], Ha[k]);

  const sections: PredictionSection[] = [];
  // Totales
  sections.push(tieredFixed("Totales partido", "tot-goals", "Total goles", lam("goals"), [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]));
  sections.push(tieredFixed("Totales partido", "tot-cards", "Total tarjetas", lam("yellowCards"), [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5]));
  sections.push(tieredRange("Totales partido", "tot-sot", "Total remates a puerta", lam("shotsOnTarget"), 1));
  sections.push(tieredRange("Totales partido", "tot-shots", "Total remates", lam("shots"), 1));
  sections.push(tieredRange("Totales partido", "tot-corners", "Total córners", lam("corners"), 1));
  sections.push(tieredRange("Totales partido", "tot-fouls", "Total faltas", lam("foulsCommitted"), 1));
  sections.push(tieredRange("Totales partido", "tot-passes", "Total pases", lam("passes"), 25));

  // Totales por equipo
  (["goals", "shotsOnTarget", "shots", "corners", "yellowCards"] as FK[]).forEach((k) => {
    const label: Record<string, string> = { goals: "goles", shotsOnTarget: "remates a puerta", shots: "remates", corners: "córners", yellowCards: "tarjetas" };
    const stepMap: Record<string, number> = { goals: 1, shotsOnTarget: 1, shots: 1, corners: 1, yellowCards: 1 };
    sections.push(tieredRange("Totales por equipo", `tot-h-${k}`, `${home.name} · ${label[k]}`, lamH(k), stepMap[k]));
    sections.push(tieredRange("Totales por equipo", `tot-a-${k}`, `${away.name} · ${label[k]}`, lamA(k), stepMap[k]));
  });

  // Doble oportunidad
  const hForm = home.last15, aForm = away.last15;
  const hTot = hForm.wins + hForm.draws + hForm.losses;
  const aTot = aForm.wins + aForm.draws + aForm.losses;
  const hW = hForm.wins / hTot, hD = hForm.draws / hTot, hL = hForm.losses / hTot;
  const aW = aForm.wins / aTot, aD = aForm.draws / aTot;
  const pHome = (hW * 0.6 + (1 - aW) * 0.4) * 0.9;
  const pAway = (aW * 0.6 + hL * 0.4) * 0.85;
  const pDraw = (hD + aD) / 2 + 0.05;
  const s = pHome + pAway + pDraw;
  const PH = pHome / s, PD = pDraw / s, PA = pAway / s;
  sections.push({
    kind: "items",
    group: "Doble oportunidad / Resultado",
    id: "dc",
    title: "Doble oportunidad",
    items: [
      { label: "1X (Local o empate)", pct: pct(PH + PD) },
      { label: "12 (Sin empate)", pct: pct(PH + PA) },
      { label: "X2 (Empate o visitante)", pct: pct(PD + PA) },
    ],
  });
  sections.push({
    kind: "items",
    group: "Doble oportunidad / Resultado",
    id: "btts",
    title: "Ambos marcan",
    items: [
      { label: "Sí marcan ambos", pct: pct((1 - Math.exp(-lamH("goals"))) * (1 - Math.exp(-lamA("goals")))) },
      { label: "No marcan ambos", pct: 100 - pct((1 - Math.exp(-lamH("goals"))) * (1 - Math.exp(-lamA("goals")))) },
    ],
  });

  // Comparativas
  sections.push({
    kind: "compare",
    group: "¿Quién tendrá más?",
    id: "more",
    title: "Comparativa por métrica",
    entries: [
      cmp("Córners", lamH("corners"), lamA("corners")),
      cmp("Tarjetas", lamH("yellowCards"), lamA("yellowCards")),
      cmp("Remates a puerta", lamH("shotsOnTarget"), lamA("shotsOnTarget")),
      cmp("Faltas cometidas", lamH("foulsCommitted"), lamA("foulsCommitted")),
      cmp("Pases", lamH("passes"), lamA("passes")),
    ],
  });

  return sections;
}

/* ---------- TENIS ---------- */
function buildTennisPredictions(home: TeamForm, away: TeamForm): PredictionSection[] {
  const H = home.avg15.for, Ha = home.avg15.against;
  const A = away.avg15.for, Aa = away.avg15.against;
  const lamTotal = (k: string) => blend(H[k], Aa[k]) + blend(A[k], Ha[k]);
  const lamH = (k: string) => blend(H[k], Aa[k]);
  const lamA = (k: string) => blend(A[k], Ha[k]);

  const sections: PredictionSection[] = [];
  sections.push(tieredRange("Aces", "aces-total", "Total aces (partido)", lamTotal("aces"), 1));
  sections.push(tieredRange("Aces", "aces-h", `Aces · ${home.name}`, lamH("aces"), 1));
  sections.push(tieredRange("Aces", "aces-a", `Aces · ${away.name}`, lamA("aces"), 1));

  sections.push(tieredRange("Dobles faltas", "df-total", "Total dobles faltas", lamTotal("doubleFaults"), 1));
  sections.push(tieredRange("Dobles faltas", "df-h", `Dobles faltas · ${home.name}`, lamH("doubleFaults"), 1));
  sections.push(tieredRange("Dobles faltas", "df-a", `Dobles faltas · ${away.name}`, lamA("doubleFaults"), 1));

  sections.push(tieredRange("Juegos", "games-total", "Total juegos (partido)", lamTotal("games"), 1));
  sections.push(tieredRange("Juegos", "games-h", `Juegos ganados · ${home.name}`, lamH("games"), 1));
  sections.push(tieredRange("Juegos", "games-a", `Juegos ganados · ${away.name}`, lamA("games"), 1));

  // Sets (al mejor de 3): probabilidad de que vaya a 3 sets
  const setsLam = lamTotal("sets"); // ~2.4 típicamente
  sections.push({
    kind: "items",
    group: "Sets",
    id: "sets",
    title: "Sets del partido",
    items: [
      { label: "Over 2.5 sets (3 sets)", pct: pct(overProb(2.5, setsLam)) },
      { label: "Under 2.5 sets (2-0)", pct: 100 - pct(overProb(2.5, setsLam)) },
    ],
  });

  sections.push(tieredRange("Breaks", "breaks-total", "Total breaks (partido)", lamTotal("breaks"), 1));
  sections.push(tieredRange("Breaks", "breaks-h", `Breaks · ${home.name}`, lamH("breaks"), 1));
  sections.push(tieredRange("Breaks", "breaks-a", `Breaks · ${away.name}`, lamA("breaks"), 1));

  // Ganador
  const hW = home.last15.wins / 15, aW = away.last15.wins / 15;
  const s = hW + aW || 1;
  sections.push({
    kind: "items",
    group: "Ganador",
    id: "winner",
    title: "Ganador del partido",
    items: [
      { label: home.name, pct: pct(hW / s) },
      { label: away.name, pct: pct(aW / s) },
    ],
  });

  sections.push({
    kind: "compare",
    group: "¿Quién tendrá más?",
    id: "tennis-more",
    title: "Comparativa por métrica",
    entries: [
      cmp("Aces", lamH("aces"), lamA("aces")),
      cmp("Dobles faltas", lamH("doubleFaults"), lamA("doubleFaults")),
      cmp("Breaks", lamH("breaks"), lamA("breaks")),
      cmp("Juegos ganados", lamH("games"), lamA("games")),
    ],
  });

  return sections;
}

/* ---------- BALONCESTO ---------- */
function buildBasketballPredictions(home: TeamForm, away: TeamForm): PredictionSection[] {
  const H = home.avg15.for, Ha = home.avg15.against;
  const A = away.avg15.for, Aa = away.avg15.against;
  const lamTotal = (k: string) => blend(H[k], Aa[k]) + blend(A[k], Ha[k]);
  const lamH = (k: string) => blend(H[k], Aa[k]);
  const lamA = (k: string) => blend(A[k], Ha[k]);

  const sections: PredictionSection[] = [];

  // Mercados principales
  sections.push(tieredRange("Puntos", "pts-total", "Total puntos partido", lamTotal("points"), 1));
  sections.push(tieredRange("Puntos", "pts-h", `Total puntos · ${home.name}`, lamH("points"), 1));
  sections.push(tieredRange("Puntos", "pts-a", `Total puntos · ${away.name}`, lamA("points"), 1));
  sections.push(tieredRange("Puntos", "pts-1h", "1ª parte · total puntos", lamTotal("points") * 0.5, 1));
  sections.push(tieredRange("Puntos", "pts-q1", "1er cuarto · total puntos", lamTotal("points") * 0.25, 1));

  sections.push(tieredRange("Triples", "3p-total", "Total triples partido", lamTotal("threes"), 1));
  sections.push(tieredRange("Triples", "3p-h", `Triples · ${home.name}`, lamH("threes"), 1));
  sections.push(tieredRange("Triples", "3p-a", `Triples · ${away.name}`, lamA("threes"), 1));

  sections.push(tieredRange("Rebotes", "reb-total", "Total rebotes partido", lamTotal("rebounds"), 1));
  sections.push(tieredRange("Rebotes", "reb-h", `Rebotes · ${home.name}`, lamH("rebounds"), 1));
  sections.push(tieredRange("Rebotes", "reb-a", `Rebotes · ${away.name}`, lamA("rebounds"), 1));

  sections.push(tieredRange("Asistencias", "ast-total", "Total asistencias", lamTotal("assists"), 1));
  sections.push(tieredRange("Asistencias", "ast-h", `Asistencias · ${home.name}`, lamH("assists"), 1));
  sections.push(tieredRange("Asistencias", "ast-a", `Asistencias · ${away.name}`, lamA("assists"), 1));

  if (H.turnovers !== undefined) {
    sections.push(tieredRange("Pérdidas y faltas", "to-total", "Total pérdidas", lamTotal("turnovers"), 1));
    sections.push(tieredRange("Pérdidas y faltas", "fouls-total", "Total faltas", lamTotal("fouls"), 1));
  }

  // Ganador
  const hW = home.last15.wins / 15, aW = away.last15.wins / 15;
  const s = hW + aW || 1;
  sections.push({
    kind: "items",
    group: "Ganador / Hándicap",
    id: "ml",
    title: "Ganador del partido (sin empate)",
    items: [
      { label: home.name, pct: pct(hW / s) },
      { label: away.name, pct: pct(aW / s) },
    ],
  });

  // Hándicap simple
  const diff = lamH("points") - lamA("points");
  const handLines = [-7.5, -5.5, -3.5, -1.5, 1.5, 3.5, 5.5, 7.5];
  sections.push({
    kind: "items",
    group: "Ganador / Hándicap",
    id: "handicap",
    title: `Hándicap puntos · ${home.name}`,
    items: handLines.map((l) => {
      // probabilidad de cubrir = sigmoide sobre (diff - l)
      const p = 1 / (1 + Math.exp(-(diff - l) / 4));
      return { label: `${home.name} ${l > 0 ? "+" : ""}${l}`, pct: pct(p) };
    }).filter((x) => x.pct >= 35 && x.pct <= 95),
  });

  sections.push({
    kind: "compare",
    group: "¿Quién tendrá más?",
    id: "bb-more",
    title: "Comparativa por métrica",
    entries: [
      cmp("Puntos", lamH("points"), lamA("points")),
      cmp("Triples", lamH("threes"), lamA("threes")),
      cmp("Rebotes", lamH("rebounds"), lamA("rebounds")),
      cmp("Asistencias", lamH("assists"), lamA("assists")),
    ],
  });

  return sections;
}

/* ---------- Helpers de equipos ---------- */
const SOURCES = ["Sofascore", "FotMob", "WhoScored", "FBref"];

function ft(name: string, last5: TeamForm["last5"], last15: TeamForm["last15"], f15: Record<string, number>, a15: Record<string, number>, f5?: Record<string, number>, a5?: Record<string, number>): TeamForm {
  return {
    name,
    last5,
    last15,
    avg5: { for: f5 ?? f15, against: a5 ?? a15 },
    avg15: { for: f15, against: a15 },
  };
}

/* ---------- Equipos fútbol ---------- */
const realMadrid = ft("Real Madrid",
  { wins: 4, draws: 1, losses: 0 },
  { wins: 11, draws: 2, losses: 2 },
  { goals: 2.4, shots: 15.2, shotsOnTarget: 6.1, corners: 6.1, yellowCards: 2.1, foulsCommitted: 11.4, foulsDrawn: 12.8, passes: 612 },
  { goals: 0.9, shots: 9.2,  shotsOnTarget: 3.1, corners: 3.8, yellowCards: 1.9, foulsCommitted: 11.0, foulsDrawn: 10.6, passes: 410 },
  { goals: 2.8, shots: 16.4, shotsOnTarget: 6.8, corners: 6.6, yellowCards: 2.0, foulsCommitted: 10.8, foulsDrawn: 13.2, passes: 640 },
  { goals: 0.6, shots: 8.4,  shotsOnTarget: 2.6, corners: 3.4, yellowCards: 1.8, foulsCommitted: 10.6, foulsDrawn: 10.2, passes: 398 },
);
const sevilla = ft("Sevilla",
  { wins: 2, draws: 1, losses: 2 },
  { wins: 7, draws: 4, losses: 4 },
  { goals: 1.2, shots: 11.1, shotsOnTarget: 3.9, corners: 4.8, yellowCards: 2.8, foulsCommitted: 13.1, foulsDrawn: 11.0, passes: 484 },
  { goals: 1.4, shots: 12.6, shotsOnTarget: 4.4, corners: 5.2, yellowCards: 2.0, foulsCommitted: 11.6, foulsDrawn: 12.8, passes: 462 },
);
const barcelona = ft("FC Barcelona",
  { wins: 4, draws: 1, losses: 0 },
  { wins: 10, draws: 3, losses: 2 },
  { goals: 2.6, shots: 17.4, shotsOnTarget: 6.8, corners: 7.2, yellowCards: 2.0, foulsCommitted: 10.8, foulsDrawn: 12.2, passes: 678 },
  { goals: 1.1, shots: 9.8,  shotsOnTarget: 3.3, corners: 4.0, yellowCards: 2.1, foulsCommitted: 11.4, foulsDrawn: 10.4, passes: 420 },
);
const atletico = ft("Atlético Madrid",
  { wins: 3, draws: 2, losses: 0 },
  { wins: 9, draws: 4, losses: 2 },
  { goals: 1.7, shots: 12.8, shotsOnTarget: 4.6, corners: 5.0, yellowCards: 2.6, foulsCommitted: 13.6, foulsDrawn: 12.0, passes: 498 },
  { goals: 0.9, shots: 9.4,  shotsOnTarget: 3.0, corners: 4.2, yellowCards: 2.0, foulsCommitted: 11.0, foulsDrawn: 11.6, passes: 432 },
);
const mancity = ft("Manchester City",
  { wins: 5, draws: 0, losses: 0 },
  { wins: 12, draws: 2, losses: 1 },
  { goals: 2.8, shots: 18.1, shotsOnTarget: 7.2, corners: 7.6, yellowCards: 1.9, foulsCommitted: 10.2, foulsDrawn: 11.1, passes: 702 },
  { goals: 0.8, shots: 8.6,  shotsOnTarget: 2.9, corners: 3.6, yellowCards: 1.6, foulsCommitted: 10.0, foulsDrawn: 10.2, passes: 388 },
);
const arsenal = ft("Arsenal",
  { wins: 4, draws: 1, losses: 0 },
  { wins: 10, draws: 3, losses: 2 },
  { goals: 2.1, shots: 14.5, shotsOnTarget: 5.5, corners: 6.0, yellowCards: 2.2, foulsCommitted: 11.0, foulsDrawn: 11.8, passes: 588 },
  { goals: 1.0, shots: 9.4,  shotsOnTarget: 3.1, corners: 3.9, yellowCards: 1.8, foulsCommitted: 10.6, foulsDrawn: 10.8, passes: 416 },
);

/* ---------- Equipos tenis ---------- */
const alcaraz = ft("Carlos Alcaraz",
  { wins: 5, draws: 0, losses: 0 },
  { wins: 13, draws: 0, losses: 2 },
  { aces: 8.4, doubleFaults: 2.1, games: 13.2, sets: 2.4, breaks: 3.1 },
  { aces: 4.6, doubleFaults: 2.6, games: 9.1,  sets: 2.4, breaks: 1.8 },
);
const sinner = ft("Jannik Sinner",
  { wins: 4, draws: 0, losses: 1 },
  { wins: 12, draws: 0, losses: 3 },
  { aces: 7.1, doubleFaults: 2.6, games: 12.6, sets: 2.4, breaks: 2.8 },
  { aces: 5.0, doubleFaults: 2.4, games: 9.4,  sets: 2.4, breaks: 2.0 },
);

/* ---------- Equipos baloncesto ---------- */
const rmBasket = ft("Real Madrid Baloncesto",
  { wins: 4, draws: 0, losses: 1 },
  { wins: 12, draws: 0, losses: 3 },
  { points: 86.2, rebounds: 35.1, assists: 19.4, threes: 11.3, turnovers: 12.4, fouls: 18.1 },
  { points: 78.4, rebounds: 32.6, assists: 16.8, threes: 9.4,  turnovers: 13.1, fouls: 19.2 },
);
const fcbBasket = ft("FC Barcelona Bàsquet",
  { wins: 3, draws: 0, losses: 2 },
  { wins: 11, draws: 0, losses: 4 },
  { points: 83.5, rebounds: 33.8, assists: 20.1, threes: 10.6, turnovers: 11.8, fouls: 17.6 },
  { points: 79.1, rebounds: 33.2, assists: 17.4, threes: 9.8,  turnovers: 12.6, fouls: 18.8 },
);

/* ---------- Construcción de partidos ---------- */
export const MATCHES: Match[] = [
  {
    id: "1", sport: "football", league: "LaLiga", status: "live", minute: 67, startTime: iso(-1, -7),
    scoreHome: 2, scoreAway: 1, sources: SOURCES,
    home: realMadrid, away: sevilla,
    predictionSections: buildFootballPredictions(realMadrid, sevilla),
  },
  {
    id: "2", sport: "football", league: "LaLiga", status: "upcoming", startTime: iso(2, 30), sources: SOURCES,
    home: barcelona, away: atletico,
    predictionSections: buildFootballPredictions(barcelona, atletico),
  },
  {
    id: "6", sport: "football", league: "Premier League", status: "finished", startTime: iso(-5),
    scoreHome: 3, scoreAway: 2, sources: SOURCES,
    home: mancity, away: arsenal,
    predictionSections: buildFootballPredictions(mancity, arsenal),
  },
  {
    id: "3", sport: "tennis", league: "ATP Madrid Open", status: "live", startTime: iso(-2),
    scoreHome: 1, scoreAway: 1, sources: ["Sofascore", "Tennis Abstract", "ATP", "Ultimate Tennis Stats"],
    home: alcaraz, away: sinner,
    predictionSections: buildTennisPredictions(alcaraz, sinner),
  },
  {
    id: "4", sport: "basketball", league: "Liga ACB", status: "upcoming", startTime: iso(4),
    sources: ["Sofascore", "ACB.com", "RealGM", "Basketball-Reference"],
    home: rmBasket, away: fcbBasket,
    predictionSections: buildBasketballPredictions(rmBasket, fcbBasket),
  },
];

export const SPORT_LABEL: Record<Sport, string> = {
  football: "Fútbol",
  tennis: "Tenis",
  basketball: "Baloncesto",
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
  firstServePct: "1er servicio %",
  points: "Puntos",
  rebounds: "Rebotes",
  assists: "Asistencias",
  threes: "Triples",
  turnovers: "Pérdidas",
  fouls: "Faltas",
};
