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

const sample = (p5: number, p10: number): SampleProb => ({
  last5: pct(p5),
  last10: pct(p10),
});

const blend = (forVal: number, againstVal: number) => (forVal + againstVal) / 2;

/* ---------- Líneas ---------- */
/** Genera líneas Over/Under filtradas para que el % (last10) caiga en [35, 95]. */
function tieredRange(
  group: string,
  id: string,
  title: string,
  lam5: number,
  lam10: number,
  step: number,
  correlationTag?: CorrelationTag,
  homeLams?: { l5: number; l10: number },
  awayLams?: { l5: number; l10: number },
): PredictionSection {
  const all: TieredThreshold[] = [];
  let line = step >= 1 ? 0.5 : step / 2;
  for (let i = 0; i < 200; i++) {
    const p10 = overProb(line, lam10);
    const p5 = overProb(line, lam5);
    const t: TieredThreshold = { line: Number(line.toFixed(2)), overPct: sample(p5, p10) };
    if (homeLams) t.homePct = sample(overProb(line, homeLams.l5), overProb(line, homeLams.l10));
    if (awayLams) t.awayPct = sample(overProb(line, awayLams.l5), overProb(line, awayLams.l10));
    all.push(t);
    line += step;
    if (line > lam10 * 4 + 10) break;
  }
  const thresholds = all.filter((t) => t.overPct.last10 >= 35 && t.overPct.last10 <= 95);
  return { kind: "tiered", group, id, title, thresholds, correlationTag };
}

/** Líneas fijas. */
function tieredFixed(
  group: string,
  id: string,
  title: string,
  lam5: number,
  lam10: number,
  lines: number[],
  correlationTag?: CorrelationTag,
  homeLams?: { l5: number; l10: number },
  awayLams?: { l5: number; l10: number },
): PredictionSection {
  return {
    kind: "tiered",
    group,
    id,
    title,
    correlationTag,
    thresholds: lines.map((line) => {
      const t: TieredThreshold = {
        line,
        overPct: sample(overProb(line, lam5), overProb(line, lam10)),
      };
      if (homeLams) t.homePct = sample(overProb(line, homeLams.l5), overProb(line, homeLams.l10));
      if (awayLams) t.awayPct = sample(overProb(line, awayLams.l5), overProb(line, awayLams.l10));
      return t;
    }),
  };
}

function cmp(metric: string, h5: number, a5: number, h10: number, a10: number): CompareEntry {
  const sm = (h: number, a: number) => {
    const t = h + a || 1;
    const raw = h / t;
    return 0.5 + (raw - 0.5) * 0.85;
  };
  return {
    metric,
    homePct: sample(sm(h5, a5), sm(h10, a10)),
    awayPct: sample(1 - sm(h5, a5), 1 - sm(h10, a10)),
  };
}

/* =====================================================================
   FÚTBOL
   ===================================================================== */
type FK = "goals" | "shots" | "shotsOnTarget" | "corners" | "yellowCards" | "foulsCommitted" | "foulsDrawn" | "passes";

function buildFootballPredictions(home: TeamForm, away: TeamForm, referee?: RefereeStats): PredictionSection[] {
  const H10 = home.avg10.for, Ha10 = home.avg10.against;
  const A10 = away.avg10.for, Aa10 = away.avg10.against;
  const H5 = home.avg5.for, Ha5 = home.avg5.against;
  const A5 = away.avg5.for, Aa5 = away.avg5.against;

  const lamH = (k: FK, w: "5" | "10") => {
    if (w === "10") return blend(H10[k], Aa10[k]);
    return blend(H5[k], Aa5[k]);
  };
  const lamA = (k: FK, w: "5" | "10") => {
    if (w === "10") return blend(A10[k], Ha10[k]);
    return blend(A5[k], Ha5[k]);
  };
  const lamT = (k: FK, w: "5" | "10") => lamH(k, w) + lamA(k, w);

  // Ajuste árbitro: añade peso al lambda esperado de tarjetas y faltas.
  const refMul = (k: FK, lam: number): number => {
    if (!referee) return lam;
    if (k === "yellowCards") {
      const refAvg = referee.last10.yellow / Math.max(1, referee.last10.matches);
      const dev = (refAvg - referee.leagueAvg.yellow) / Math.max(0.5, referee.leagueAvg.yellow);
      return lam * (1 + dev * 0.3);
    }
    if (k === "foulsCommitted" || k === "foulsDrawn") {
      const refAvg = referee.last10.fouls / Math.max(1, referee.last10.matches);
      const dev = (refAvg - referee.leagueAvg.fouls) / Math.max(0.5, referee.leagueAvg.fouls);
      return lam * (1 + dev * 0.25);
    }
    return lam;
  };

  const lamHadj = (k: FK, w: "5" | "10") => refMul(k, lamH(k, w));
  const lamAadj = (k: FK, w: "5" | "10") => refMul(k, lamA(k, w));
  const lamTadj = (k: FK, w: "5" | "10") => lamHadj(k, w) + lamAadj(k, w);

  const sections: PredictionSection[] = [];

  // ----- Totales partido -----
  sections.push(
    tieredFixed(
      "Totales partido", "tot-goals", "Total goles",
      lamT("goals", "5"), lamT("goals", "10"),
      [0.5, 1.5, 2.5, 3.5, 4.5, 5.5],
      "goals",
      { l5: lamH("goals", "5"), l10: lamH("goals", "10") },
      { l5: lamA("goals", "5"), l10: lamA("goals", "10") },
    ),
  );
  sections.push(
    tieredFixed(
      "Totales partido", "tot-cards", "Total tarjetas amarillas",
      lamTadj("yellowCards", "5"), lamTadj("yellowCards", "10"),
      [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5],
      "cards",
      { l5: lamHadj("yellowCards", "5"), l10: lamHadj("yellowCards", "10") },
      { l5: lamAadj("yellowCards", "5"), l10: lamAadj("yellowCards", "10") },
    ),
  );
  sections.push(tieredRange("Totales partido", "tot-sot", "Total remates a puerta",
    lamT("shotsOnTarget", "5"), lamT("shotsOnTarget", "10"), 1, "shotsOnTarget",
    { l5: lamH("shotsOnTarget", "5"), l10: lamH("shotsOnTarget", "10") },
    { l5: lamA("shotsOnTarget", "5"), l10: lamA("shotsOnTarget", "10") }));
  sections.push(tieredRange("Totales partido", "tot-shots", "Total remates",
    lamT("shots", "5"), lamT("shots", "10"), 1, "shots",
    { l5: lamH("shots", "5"), l10: lamH("shots", "10") },
    { l5: lamA("shots", "5"), l10: lamA("shots", "10") }));
  sections.push(tieredRange("Totales partido", "tot-corners", "Total córners",
    lamT("corners", "5"), lamT("corners", "10"), 1, "corners",
    { l5: lamH("corners", "5"), l10: lamH("corners", "10") },
    { l5: lamA("corners", "5"), l10: lamA("corners", "10") }));
  sections.push(tieredRange("Totales partido", "tot-fouls", "Total faltas",
    lamTadj("foulsCommitted", "5"), lamTadj("foulsCommitted", "10"), 1, "fouls",
    { l5: lamHadj("foulsCommitted", "5"), l10: lamHadj("foulsCommitted", "10") },
    { l5: lamAadj("foulsCommitted", "5"), l10: lamAadj("foulsCommitted", "10") }));
  sections.push(tieredRange("Totales partido", "tot-passes", "Total pases",
    lamT("passes", "5"), lamT("passes", "10"), 25, "passes"));

  // ----- Doble oportunidad / Resultado -----
  const buildResult = (w: "5" | "10") => {
    const hF = w === "10" ? home.last10 : home.last5;
    const aF = w === "10" ? away.last10 : away.last5;
    const hT = hF.wins + hF.draws + hF.losses || 1;
    const aT = aF.wins + aF.draws + aF.losses || 1;
    const hW = hF.wins / hT, hD = hF.draws / hT, hL = hF.losses / hT;
    const aW = aF.wins / aT, aD = aF.draws / aT;
    const pH = (hW * 0.6 + (1 - aW) * 0.4) * 0.9;
    const pA = (aW * 0.6 + hL * 0.4) * 0.85;
    const pD = (hD + aD) / 2 + 0.05;
    const s = pH + pA + pD;
    return { H: pH / s, D: pD / s, A: pA / s };
  };
  const r5 = buildResult("5"), r10 = buildResult("10");
  sections.push({
    kind: "items",
    group: "Doble oportunidad / Resultado",
    id: "dc",
    title: "Doble oportunidad",
    correlationTag: "result",
    items: [
      { label: "1X (Local o empate)", pct: sample(r5.H + r5.D, r10.H + r10.D) },
      { label: "12 (Sin empate)", pct: sample(r5.H + r5.A, r10.H + r10.A) },
      { label: "X2 (Empate o visitante)", pct: sample(r5.D + r5.A, r10.D + r10.A) },
    ],
  });
  sections.push({
    kind: "items",
    group: "Doble oportunidad / Resultado",
    id: "ml",
    title: "Resultado (1X2)",
    correlationTag: "result",
    items: [
      { label: `${home.name} gana`, pct: sample(r5.H, r10.H) },
      { label: "Empate", pct: sample(r5.D, r10.D) },
      { label: `${away.name} gana`, pct: sample(r5.A, r10.A) },
    ],
  });
  const btts = (w: "5" | "10") =>
    (1 - Math.exp(-lamH("goals", w))) * (1 - Math.exp(-lamA("goals", w)));
  sections.push({
    kind: "items",
    group: "Doble oportunidad / Resultado",
    id: "btts",
    title: "Ambos marcan (BTTS)",
    correlationTag: "btts",
    items: [
      { label: "Sí", pct: sample(btts("5"), btts("10")) },
      { label: "No", pct: sample(1 - btts("5"), 1 - btts("10")) },
    ],
  });

  // ----- Comparativa -----
  sections.push({
    kind: "compare",
    group: "¿Quién tendrá más?",
    id: "more",
    title: "Comparativa por métrica",
    entries: [
      cmp("Córners", lamH("corners", "5"), lamA("corners", "5"), lamH("corners", "10"), lamA("corners", "10")),
      cmp("Tarjetas", lamHadj("yellowCards", "5"), lamAadj("yellowCards", "5"), lamHadj("yellowCards", "10"), lamAadj("yellowCards", "10")),
      cmp("Remates a puerta", lamH("shotsOnTarget", "5"), lamA("shotsOnTarget", "5"), lamH("shotsOnTarget", "10"), lamA("shotsOnTarget", "10")),
      cmp("Faltas cometidas", lamHadj("foulsCommitted", "5"), lamAadj("foulsCommitted", "5"), lamHadj("foulsCommitted", "10"), lamAadj("foulsCommitted", "10")),
      cmp("Pases", lamH("passes", "5"), lamA("passes", "5"), lamH("passes", "10"), lamA("passes", "10")),
    ],
  });

  return sections;
}

/* =====================================================================
   TENIS
   ===================================================================== */
type TK = "aces" | "doubleFaults" | "games" | "sets" | "breaks";

function buildTennisPredictions(home: TeamForm, away: TeamForm, surface?: "hard" | "clay" | "grass"): PredictionSection[] {
  const H10 = home.avg10.for, Ha10 = home.avg10.against;
  const A10 = away.avg10.for, Aa10 = away.avg10.against;
  const H5 = home.avg5.for, Ha5 = home.avg5.against;
  const A5 = away.avg5.for, Aa5 = away.avg5.against;

  const lamH = (k: TK, w: "5" | "10") => (w === "10" ? blend(H10[k], Aa10[k]) : blend(H5[k], Aa5[k]));
  const lamA = (k: TK, w: "5" | "10") => (w === "10" ? blend(A10[k], Ha10[k]) : blend(A5[k], Ha5[k]));
  const lamT = (k: TK, w: "5" | "10") => lamH(k, w) + lamA(k, w);

  // Por superficie: si ambos jugadores tienen stats en la superficie, calcula también.
  const hasSurface = (k: TK) =>
    surface && home.surfaceFor?.[surface]?.[k] !== undefined && away.surfaceFor?.[surface]?.[k] !== undefined;
  const surfLamH = (k: TK) => {
    if (!surface || !home.surfaceFor?.[surface]) return undefined;
    return blend(home.surfaceFor[surface]![k] ?? 0, Aa10[k] ?? 0);
  };
  const surfLamA = (k: TK) => {
    if (!surface || !away.surfaceFor?.[surface]) return undefined;
    return blend(away.surfaceFor[surface]![k] ?? 0, Ha10[k] ?? 0);
  };

  const buildTiered = (
    group: string, id: string, title: string,
    lam5: number, lam10: number, step: number, k: TK,
    homeLams?: { l5: number; l10: number }, awayLams?: { l5: number; l10: number },
    tag?: CorrelationTag,
  ): PredictionSection => {
    const section = tieredRange(group, id, title, lam5, lam10, step, tag, homeLams, awayLams);
    if (hasSurface(k) && surface) {
      const sH = surfLamH(k)!, sA = surfLamA(k)!;
      const sT = sH + sA;
      // Decide qué lambda usar para la línea total vs equipo
      const isHome = id.endsWith("-h");
      const isAway = id.endsWith("-a");
      if (section.kind === "tiered") {
        section.thresholds = section.thresholds.map((t) => {
          const lamSurf = isHome ? sH : isAway ? sA : sT;
          return {
            ...t,
            surface: { [surface]: sample(overProb(t.line, lamSurf * 0.95), overProb(t.line, lamSurf)) } as SurfaceProb,
          };
        });
      }
    }
    return section;
  };

  const sections: PredictionSection[] = [];

  // Aces
  sections.push(buildTiered("Aces", "aces-total", "Total aces (partido)", lamT("aces", "5"), lamT("aces", "10"), 1, "aces",
    { l5: lamH("aces", "5"), l10: lamH("aces", "10") }, { l5: lamA("aces", "5"), l10: lamA("aces", "10") }, "aces"));
  sections.push(buildTiered("Aces", "aces-h", `Aces · ${home.name}`, lamH("aces", "5"), lamH("aces", "10"), 1, "aces",
    undefined, undefined, "aces"));
  sections.push(buildTiered("Aces", "aces-a", `Aces · ${away.name}`, lamA("aces", "5"), lamA("aces", "10"), 1, "aces",
    undefined, undefined, "aces"));

  // Dobles faltas
  sections.push(buildTiered("Dobles faltas", "df-total", "Total dobles faltas",
    lamT("doubleFaults", "5"), lamT("doubleFaults", "10"), 1, "doubleFaults",
    { l5: lamH("doubleFaults", "5"), l10: lamH("doubleFaults", "10") },
    { l5: lamA("doubleFaults", "5"), l10: lamA("doubleFaults", "10") }, "doubleFaults"));
  sections.push(buildTiered("Dobles faltas", "df-h", `Dobles faltas · ${home.name}`,
    lamH("doubleFaults", "5"), lamH("doubleFaults", "10"), 1, "doubleFaults", undefined, undefined, "doubleFaults"));
  sections.push(buildTiered("Dobles faltas", "df-a", `Dobles faltas · ${away.name}`,
    lamA("doubleFaults", "5"), lamA("doubleFaults", "10"), 1, "doubleFaults", undefined, undefined, "doubleFaults"));

  // Juegos totales
  sections.push(tieredFixed("Juegos", "games-total", "Total juegos (partido)",
    lamT("games", "5"), lamT("games", "10"),
    [18.5, 20.5, 22.5, 24.5, 26.5], "games",
    { l5: lamH("games", "5"), l10: lamH("games", "10") },
    { l5: lamA("games", "5"), l10: lamA("games", "10") }));
  sections.push(buildTiered("Juegos", "games-h", `Juegos ganados · ${home.name}`,
    lamH("games", "5"), lamH("games", "10"), 1, "games", undefined, undefined, "games"));
  sections.push(buildTiered("Juegos", "games-a", `Juegos ganados · ${away.name}`,
    lamA("games", "5"), lamA("games", "10"), 1, "games", undefined, undefined, "games"));

  // Sets
  const setsLam5 = lamT("sets", "5"), setsLam10 = lamT("sets", "10");
  sections.push({
    kind: "items",
    group: "Sets",
    id: "sets",
    title: "Sets del partido",
    correlationTag: "sets",
    items: [
      { label: "Over 1.5 sets", pct: sample(overProb(1.5, setsLam5), overProb(1.5, setsLam10)) },
      { label: "Over 2.5 sets (a 3 sets)", pct: sample(overProb(2.5, setsLam5), overProb(2.5, setsLam10)) },
      { label: "Under 2.5 sets (2-0)", pct: sample(1 - overProb(2.5, setsLam5), 1 - overProb(2.5, setsLam10)) },
    ],
  });

  // Resultado en sets (best of 3) — heurístico
  const hW5 = home.last5.wins / Math.max(1, home.last5.wins + home.last5.losses);
  const hW10 = home.last10.wins / Math.max(1, home.last10.wins + home.last10.losses);
  const aW5 = away.last5.wins / Math.max(1, away.last5.wins + away.last5.losses);
  const aW10 = away.last10.wins / Math.max(1, away.last10.wins + away.last10.losses);
  const exact = (pH5: number, pH10: number, twoZeroFrac: number) => ({
    twoZero: sample(pH5 * twoZeroFrac, pH10 * twoZeroFrac),
    twoOne: sample(pH5 * (1 - twoZeroFrac), pH10 * (1 - twoZeroFrac)),
  });
  const homeExact = exact(hW5 / (hW5 + aW5 || 1), hW10 / (hW10 + aW10 || 1), 0.6);
  const awayExact = exact(aW5 / (hW5 + aW5 || 1), aW10 / (hW10 + aW10 || 1), 0.6);
  sections.push({
    kind: "items",
    group: "Sets",
    id: "exact-sets",
    title: "Resultado exacto en sets",
    correlationTag: "sets",
    items: [
      { label: `${home.name} 2-0`, pct: homeExact.twoZero },
      { label: `${home.name} 2-1`, pct: homeExact.twoOne },
      { label: `${away.name} 2-0`, pct: awayExact.twoZero },
      { label: `${away.name} 2-1`, pct: awayExact.twoOne },
    ],
  });

  // Gana al menos un set
  sections.push({
    kind: "items",
    group: "Sets",
    id: "at-least-set",
    title: "Gana al menos un set",
    correlationTag: "sets",
    items: [
      { label: `${home.name} ≥1 set`, pct: sample(1 - awayExact.twoZero.last5 / 100, 1 - awayExact.twoZero.last10 / 100) },
      { label: `${away.name} ≥1 set`, pct: sample(1 - homeExact.twoZero.last5 / 100, 1 - homeExact.twoZero.last10 / 100) },
    ],
  });

  // Tie-break
  const tbP5 = Math.min(0.85, 0.25 + (setsLam5 - 2) * 0.5);
  const tbP10 = Math.min(0.85, 0.25 + (setsLam10 - 2) * 0.5);
  sections.push({
    kind: "items",
    group: "Tie-break",
    id: "tb",
    title: "Tie-break en el partido",
    correlationTag: "tieBreak",
    items: [
      { label: "Habrá tie-break", pct: sample(tbP5, tbP10) },
      { label: "Sin tie-break", pct: sample(1 - tbP5, 1 - tbP10) },
    ],
  });

  // Breaks
  sections.push(buildTiered("Breaks", "breaks-total", "Total breaks (partido)",
    lamT("breaks", "5"), lamT("breaks", "10"), 1, "breaks",
    { l5: lamH("breaks", "5"), l10: lamH("breaks", "10") },
    { l5: lamA("breaks", "5"), l10: lamA("breaks", "10") }, "breaks"));
  sections.push(buildTiered("Breaks", "breaks-h", `Breaks · ${home.name}`,
    lamH("breaks", "5"), lamH("breaks", "10"), 1, "breaks", undefined, undefined, "breaks"));
  sections.push(buildTiered("Breaks", "breaks-a", `Breaks · ${away.name}`,
    lamA("breaks", "5"), lamA("breaks", "10"), 1, "breaks", undefined, undefined, "breaks"));

  // Ganador
  const winS = (h: number, a: number) => (h + a > 0 ? h / (h + a) : 0.5);
  sections.push({
    kind: "items",
    group: "Ganador",
    id: "winner",
    title: "Ganador del partido",
    correlationTag: "winner",
    items: [
      { label: home.name, pct: sample(winS(hW5, aW5), winS(hW10, aW10)) },
      { label: away.name, pct: sample(winS(aW5, hW5), winS(aW10, hW10)) },
    ],
  });

  sections.push({
    kind: "compare",
    group: "¿Quién tendrá más?",
    id: "tennis-more",
    title: "Comparativa por métrica",
    entries: [
      cmp("Aces", lamH("aces", "5"), lamA("aces", "5"), lamH("aces", "10"), lamA("aces", "10")),
      cmp("Dobles faltas", lamH("doubleFaults", "5"), lamA("doubleFaults", "5"), lamH("doubleFaults", "10"), lamA("doubleFaults", "10")),
      cmp("Breaks", lamH("breaks", "5"), lamA("breaks", "5"), lamH("breaks", "10"), lamA("breaks", "10")),
      cmp("Juegos ganados", lamH("games", "5"), lamA("games", "5"), lamH("games", "10"), lamA("games", "10")),
    ],
  });

  return sections;
}

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
