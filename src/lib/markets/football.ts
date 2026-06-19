// Mercados de fútbol derivados desde el engine + Poisson como helper.
// La probabilidad del 1X2 viene del engine (fuente única de verdad);
// los Over/Under se derivan con Poisson sobre las stats base.

import type {
  CorrelationTag,
  PredictionSection,
  RefereeStats,
  TeamForm,
  TieredThreshold,
} from "../mock-data";
import { computeFootball } from "../engine/football";
import { toFootballMatchInput } from "../engine/adapters";
import { blend, overProb, pct, sample } from "./poisson";

type FK =
  | "goals"
  | "shots"
  | "shotsOnTarget"
  | "corners"
  | "yellowCards"
  | "foulsCommitted"
  | "foulsDrawn"
  | "passes";

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

export function buildFootballPredictions(
  home: TeamForm,
  away: TeamForm,
  referee?: RefereeStats,
): PredictionSection[] {
  const H10 = home.avg10.for,
    Ha10 = home.avg10.against;
  const A10 = away.avg10.for,
    Aa10 = away.avg10.against;
  const H5 = home.avg5.for,
    Ha5 = home.avg5.against;
  const A5 = away.avg5.for,
    Aa5 = away.avg5.against;

  const lamH = (k: FK, w: "5" | "10") =>
    w === "10" ? blend(H10[k], Aa10[k]) : blend(H5[k], Aa5[k]);
  const lamA = (k: FK, w: "5" | "10") =>
    w === "10" ? blend(A10[k], Ha10[k]) : blend(A5[k], Ha5[k]);
  const lamT = (k: FK, w: "5" | "10") => lamH(k, w) + lamA(k, w);

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

  sections.push(
    tieredFixed(
      "Totales partido",
      "tot-goals",
      "Total goles",
      lamT("goals", "5"),
      lamT("goals", "10"),
      [0.5, 1.5, 2.5, 3.5, 4.5, 5.5],
      "goals",
      { l5: lamH("goals", "5"), l10: lamH("goals", "10") },
      { l5: lamA("goals", "5"), l10: lamA("goals", "10") },
    ),
  );
  sections.push(
    tieredFixed(
      "Totales partido",
      "tot-cards",
      "Total tarjetas amarillas",
      lamTadj("yellowCards", "5"),
      lamTadj("yellowCards", "10"),
      [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5],
      "cards",
      { l5: lamHadj("yellowCards", "5"), l10: lamHadj("yellowCards", "10") },
      { l5: lamAadj("yellowCards", "5"), l10: lamAadj("yellowCards", "10") },
    ),
  );
  sections.push(
    tieredRange(
      "Totales partido",
      "tot-sot",
      "Total remates a puerta",
      lamT("shotsOnTarget", "5"),
      lamT("shotsOnTarget", "10"),
      1,
      "shotsOnTarget",
      { l5: lamH("shotsOnTarget", "5"), l10: lamH("shotsOnTarget", "10") },
      { l5: lamA("shotsOnTarget", "5"), l10: lamA("shotsOnTarget", "10") },
    ),
  );
  sections.push(
    tieredRange(
      "Totales partido",
      "tot-shots",
      "Total remates",
      lamT("shots", "5"),
      lamT("shots", "10"),
      1,
      "shots",
      { l5: lamH("shots", "5"), l10: lamH("shots", "10") },
      { l5: lamA("shots", "5"), l10: lamA("shots", "10") },
    ),
  );
  sections.push(
    tieredRange(
      "Totales partido",
      "tot-corners",
      "Total córners",
      lamT("corners", "5"),
      lamT("corners", "10"),
      1,
      "corners",
      { l5: lamH("corners", "5"), l10: lamH("corners", "10") },
      { l5: lamA("corners", "5"), l10: lamA("corners", "10") },
    ),
  );
  sections.push(
    tieredRange(
      "Totales partido",
      "tot-fouls",
      "Total faltas",
      lamTadj("foulsCommitted", "5"),
      lamTadj("foulsCommitted", "10"),
      1,
      "fouls",
      { l5: lamHadj("foulsCommitted", "5"), l10: lamHadj("foulsCommitted", "10") },
      { l5: lamAadj("foulsCommitted", "5"), l10: lamAadj("foulsCommitted", "10") },
    ),
  );
  sections.push(
    tieredRange(
      "Totales partido",
      "tot-passes",
      "Total pases",
      lamT("passes", "5"),
      lamT("passes", "10"),
      25,
      "passes",
    ),
  );

  // ----- Resultado 1X2: viene del engine (fuente única de verdad) -----
  // Engine devuelve probabilidad de victoria local (5–95). El empate se
  // estima desde la histórica reciente y se renormaliza para que la suma = 1.
  const engineRes = computeFootball(toFootballMatchInput(home, away));
  const pHome = engineRes.probability / 100;

  const drawShare = (() => {
    const hT = home.last10.wins + home.last10.draws + home.last10.losses || 1;
    const aT = away.last10.wins + away.last10.draws + away.last10.losses || 1;
    return Math.max(
      0.12,
      Math.min(0.32, (home.last10.draws / hT + away.last10.draws / aT) / 2),
    );
  })();

  const rest = Math.max(0, 1 - pHome);
  const pDraw = Math.min(rest, drawShare * (1 - Math.abs(pHome - 0.5)));
  const pAway = Math.max(0, rest - pDraw);
  // last5: usamos la última forma para deformar levemente (sin segundo modelo).
  const f5Diff =
    home.last5.wins / Math.max(1, home.last5.wins + home.last5.losses) -
    away.last5.wins / Math.max(1, away.last5.wins + away.last5.losses);
  const pHome5 = Math.max(0.05, Math.min(0.95, pHome + f5Diff * 0.1));
  const rest5 = 1 - pHome5;
  const pDraw5 = Math.min(rest5, drawShare * (1 - Math.abs(pHome5 - 0.5)));
  const pAway5 = Math.max(0, rest5 - pDraw5);

  sections.push({
    kind: "items",
    group: "Doble oportunidad / Resultado",
    id: "dc",
    title: "Doble oportunidad",
    correlationTag: "result",
    items: [
      {
        label: "1X (Local o empate)",
        pct: { last5: pct(pHome5 + pDraw5), last10: pct(pHome + pDraw) },
      },
      {
        label: "12 (Sin empate)",
        pct: { last5: pct(pHome5 + pAway5), last10: pct(pHome + pAway) },
      },
      {
        label: "X2 (Empate o visitante)",
        pct: { last5: pct(pDraw5 + pAway5), last10: pct(pDraw + pAway) },
      },
    ],
  });
  sections.push({
    kind: "items",
    group: "Doble oportunidad / Resultado",
    id: "ml",
    title: "Resultado (1X2)",
    correlationTag: "result",
    items: [
      { label: `${home.name} gana`, pct: { last5: pct(pHome5), last10: pct(pHome) } },
      { label: "Empate", pct: { last5: pct(pDraw5), last10: pct(pDraw) } },
      { label: `${away.name} gana`, pct: { last5: pct(pAway5), last10: pct(pAway) } },
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

  sections.push({
    kind: "compare",
    group: "¿Quién tendrá más?",
    id: "more",
    title: "Comparativa por métrica",
    entries: [
      cmp(
        "Córners",
        lamH("corners", "5"),
        lamA("corners", "5"),
        lamH("corners", "10"),
        lamA("corners", "10"),
      ),
      cmp(
        "Tarjetas",
        lamHadj("yellowCards", "5"),
        lamAadj("yellowCards", "5"),
        lamHadj("yellowCards", "10"),
        lamAadj("yellowCards", "10"),
      ),
      cmp(
        "Remates a puerta",
        lamH("shotsOnTarget", "5"),
        lamA("shotsOnTarget", "5"),
        lamH("shotsOnTarget", "10"),
        lamA("shotsOnTarget", "10"),
      ),
      cmp(
        "Faltas cometidas",
        lamHadj("foulsCommitted", "5"),
        lamAadj("foulsCommitted", "5"),
        lamHadj("foulsCommitted", "10"),
        lamAadj("foulsCommitted", "10"),
      ),
      cmp("Pases", lamH("passes", "5"), lamA("passes", "5"), lamH("passes", "10"), lamA("passes", "10")),
    ],
  });

  return sections;
}
