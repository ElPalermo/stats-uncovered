// Mercados de tenis derivados desde el engine + Poisson como helper.
// El ganador del partido viene del engine (fuente única de verdad);
// los Over/Under de aces, juegos, breaks, etc. se derivan con Poisson.

import type {
  CorrelationTag,
  PredictionSection,
  SurfaceProb,
  TeamForm,
  TieredThreshold,
} from "../mock-data";
import { computeTennis } from "../engine/tennis";
import { toTennisMatchInput } from "../engine/adapters";
import { blend, overProb, pct, sample } from "./poisson";

type TK = "aces" | "doubleFaults" | "games" | "sets" | "breaks";

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

function cmp(metric: string, h5: number, a5: number, h10: number, a10: number) {
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

export function buildTennisPredictions(
  home: TeamForm,
  away: TeamForm,
  surface?: "hard" | "clay" | "grass",
): PredictionSection[] {
  const H10 = home.avg10.for,
    Ha10 = home.avg10.against;
  const A10 = away.avg10.for,
    Aa10 = away.avg10.against;
  const H5 = home.avg5.for,
    Ha5 = home.avg5.against;
  const A5 = away.avg5.for,
    Aa5 = away.avg5.against;

  const lamH = (k: TK, w: "5" | "10") =>
    w === "10" ? blend(H10[k], Aa10[k]) : blend(H5[k], Aa5[k]);
  const lamA = (k: TK, w: "5" | "10") =>
    w === "10" ? blend(A10[k], Ha10[k]) : blend(A5[k], Ha5[k]);
  const lamT = (k: TK, w: "5" | "10") => lamH(k, w) + lamA(k, w);

  const hasSurface = (k: TK) =>
    surface &&
    home.surfaceFor?.[surface]?.[k] !== undefined &&
    away.surfaceFor?.[surface]?.[k] !== undefined;
  const surfLamH = (k: TK) => {
    if (!surface || !home.surfaceFor?.[surface]) return undefined;
    return blend(home.surfaceFor[surface]![k] ?? 0, Aa10[k] ?? 0);
  };
  const surfLamA = (k: TK) => {
    if (!surface || !away.surfaceFor?.[surface]) return undefined;
    return blend(away.surfaceFor[surface]![k] ?? 0, Ha10[k] ?? 0);
  };

  const buildTiered = (
    group: string,
    id: string,
    title: string,
    lam5: number,
    lam10: number,
    step: number,
    k: TK,
    homeLams?: { l5: number; l10: number },
    awayLams?: { l5: number; l10: number },
    tag?: CorrelationTag,
  ): PredictionSection => {
    const section = tieredRange(group, id, title, lam5, lam10, step, tag, homeLams, awayLams);
    if (hasSurface(k) && surface) {
      const sH = surfLamH(k)!,
        sA = surfLamA(k)!;
      const sT = sH + sA;
      const isHome = id.endsWith("-h");
      const isAway = id.endsWith("-a");
      if (section.kind === "tiered") {
        section.thresholds = section.thresholds.map((t) => {
          const lamSurf = isHome ? sH : isAway ? sA : sT;
          return {
            ...t,
            surface: {
              [surface]: sample(overProb(t.line, lamSurf * 0.95), overProb(t.line, lamSurf)),
            } as SurfaceProb,
          };
        });
      }
    }
    return section;
  };

  const sections: PredictionSection[] = [];

  sections.push(
    buildTiered(
      "Aces",
      "aces-total",
      "Total aces (partido)",
      lamT("aces", "5"),
      lamT("aces", "10"),
      1,
      "aces",
      { l5: lamH("aces", "5"), l10: lamH("aces", "10") },
      { l5: lamA("aces", "5"), l10: lamA("aces", "10") },
      "aces",
    ),
  );
  sections.push(
    buildTiered(
      "Aces",
      "aces-h",
      `Aces · ${home.name}`,
      lamH("aces", "5"),
      lamH("aces", "10"),
      1,
      "aces",
      undefined,
      undefined,
      "aces",
    ),
  );
  sections.push(
    buildTiered(
      "Aces",
      "aces-a",
      `Aces · ${away.name}`,
      lamA("aces", "5"),
      lamA("aces", "10"),
      1,
      "aces",
      undefined,
      undefined,
      "aces",
    ),
  );

  sections.push(
    buildTiered(
      "Dobles faltas",
      "df-total",
      "Total dobles faltas",
      lamT("doubleFaults", "5"),
      lamT("doubleFaults", "10"),
      1,
      "doubleFaults",
      { l5: lamH("doubleFaults", "5"), l10: lamH("doubleFaults", "10") },
      { l5: lamA("doubleFaults", "5"), l10: lamA("doubleFaults", "10") },
      "doubleFaults",
    ),
  );
  sections.push(
    buildTiered(
      "Dobles faltas",
      "df-h",
      `Dobles faltas · ${home.name}`,
      lamH("doubleFaults", "5"),
      lamH("doubleFaults", "10"),
      1,
      "doubleFaults",
      undefined,
      undefined,
      "doubleFaults",
    ),
  );
  sections.push(
    buildTiered(
      "Dobles faltas",
      "df-a",
      `Dobles faltas · ${away.name}`,
      lamA("doubleFaults", "5"),
      lamA("doubleFaults", "10"),
      1,
      "doubleFaults",
      undefined,
      undefined,
      "doubleFaults",
    ),
  );

  sections.push(
    tieredFixed(
      "Juegos",
      "games-total",
      "Total juegos (partido)",
      lamT("games", "5"),
      lamT("games", "10"),
      [18.5, 20.5, 22.5, 24.5, 26.5],
      "games",
      { l5: lamH("games", "5"), l10: lamH("games", "10") },
      { l5: lamA("games", "5"), l10: lamA("games", "10") },
    ),
  );
  sections.push(
    buildTiered(
      "Juegos",
      "games-h",
      `Juegos ganados · ${home.name}`,
      lamH("games", "5"),
      lamH("games", "10"),
      1,
      "games",
      undefined,
      undefined,
      "games",
    ),
  );
  sections.push(
    buildTiered(
      "Juegos",
      "games-a",
      `Juegos ganados · ${away.name}`,
      lamA("games", "5"),
      lamA("games", "10"),
      1,
      "games",
      undefined,
      undefined,
      "games",
    ),
  );

  const setsLam5 = lamT("sets", "5"),
    setsLam10 = lamT("sets", "10");
  sections.push({
    kind: "items",
    group: "Sets",
    id: "sets",
    title: "Sets del partido",
    correlationTag: "sets",
    items: [
      { label: "Over 1.5 sets", pct: sample(overProb(1.5, setsLam5), overProb(1.5, setsLam10)) },
      {
        label: "Over 2.5 sets (a 3 sets)",
        pct: sample(overProb(2.5, setsLam5), overProb(2.5, setsLam10)),
      },
      {
        label: "Under 2.5 sets (2-0)",
        pct: sample(1 - overProb(2.5, setsLam5), 1 - overProb(2.5, setsLam10)),
      },
    ],
  });

  // ----- Ganador del partido y resultados en sets: viene del engine -----
  const engineRes = computeTennis(toTennisMatchInput(home, away, surface));
  const pHome10 = engineRes.probability / 100;
  // Pequeña deformación con la forma reciente (sin segundo modelo).
  const hW5 = home.last5.wins / Math.max(1, home.last5.wins + home.last5.losses);
  const aW5 = away.last5.wins / Math.max(1, away.last5.wins + away.last5.losses);
  const f5Diff = hW5 - aW5;
  const pHome5 = Math.max(0.05, Math.min(0.95, pHome10 + f5Diff * 0.1));

  const exact = (pH: number, twoZeroFrac: number) => ({
    twoZero: pH * twoZeroFrac,
    twoOne: pH * (1 - twoZeroFrac),
  });
  const homeExact5 = exact(pHome5, 0.6);
  const homeExact10 = exact(pHome10, 0.6);
  const awayExact5 = exact(1 - pHome5, 0.6);
  const awayExact10 = exact(1 - pHome10, 0.6);

  sections.push({
    kind: "items",
    group: "Sets",
    id: "exact-sets",
    title: "Resultado exacto en sets",
    correlationTag: "sets",
    items: [
      {
        label: `${home.name} 2-0`,
        pct: { last5: pct(homeExact5.twoZero), last10: pct(homeExact10.twoZero) },
      },
      {
        label: `${home.name} 2-1`,
        pct: { last5: pct(homeExact5.twoOne), last10: pct(homeExact10.twoOne) },
      },
      {
        label: `${away.name} 2-0`,
        pct: { last5: pct(awayExact5.twoZero), last10: pct(awayExact10.twoZero) },
      },
      {
        label: `${away.name} 2-1`,
        pct: { last5: pct(awayExact5.twoOne), last10: pct(awayExact10.twoOne) },
      },
    ],
  });

  sections.push({
    kind: "items",
    group: "Sets",
    id: "at-least-set",
    title: "Gana al menos un set",
    correlationTag: "sets",
    items: [
      {
        label: `${home.name} ≥1 set`,
        pct: { last5: pct(1 - awayExact5.twoZero), last10: pct(1 - awayExact10.twoZero) },
      },
      {
        label: `${away.name} ≥1 set`,
        pct: { last5: pct(1 - homeExact5.twoZero), last10: pct(1 - homeExact10.twoZero) },
      },
    ],
  });

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

  sections.push(
    buildTiered(
      "Breaks",
      "breaks-total",
      "Total breaks (partido)",
      lamT("breaks", "5"),
      lamT("breaks", "10"),
      1,
      "breaks",
      { l5: lamH("breaks", "5"), l10: lamH("breaks", "10") },
      { l5: lamA("breaks", "5"), l10: lamA("breaks", "10") },
      "breaks",
    ),
  );
  sections.push(
    buildTiered(
      "Breaks",
      "breaks-h",
      `Breaks · ${home.name}`,
      lamH("breaks", "5"),
      lamH("breaks", "10"),
      1,
      "breaks",
      undefined,
      undefined,
      "breaks",
    ),
  );
  sections.push(
    buildTiered(
      "Breaks",
      "breaks-a",
      `Breaks · ${away.name}`,
      lamA("breaks", "5"),
      lamA("breaks", "10"),
      1,
      "breaks",
      undefined,
      undefined,
      "breaks",
    ),
  );

  sections.push({
    kind: "items",
    group: "Ganador",
    id: "winner",
    title: "Ganador del partido",
    correlationTag: "winner",
    items: [
      { label: home.name, pct: { last5: pct(pHome5), last10: pct(pHome10) } },
      { label: away.name, pct: { last5: pct(1 - pHome5), last10: pct(1 - pHome10) } },
    ],
  });

  sections.push({
    kind: "compare",
    group: "¿Quién tendrá más?",
    id: "tennis-more",
    title: "Comparativa por métrica",
    entries: [
      cmp("Aces", lamH("aces", "5"), lamA("aces", "5"), lamH("aces", "10"), lamA("aces", "10")),
      cmp(
        "Dobles faltas",
        lamH("doubleFaults", "5"),
        lamA("doubleFaults", "5"),
        lamH("doubleFaults", "10"),
        lamA("doubleFaults", "10"),
      ),
      cmp(
        "Breaks",
        lamH("breaks", "5"),
        lamA("breaks", "5"),
        lamH("breaks", "10"),
        lamA("breaks", "10"),
      ),
      cmp(
        "Juegos ganados",
        lamH("games", "5"),
        lamA("games", "5"),
        lamH("games", "10"),
        lamA("games", "10"),
      ),
    ],
  });

  return sections;
}
