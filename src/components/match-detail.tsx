import type { Match, PredictionSection, SampleProb, StatsBlock, TieredThreshold } from "@/lib/mock-data";
import { SPORT_LABEL, STAT_LABEL } from "@/lib/mock-data";
import { Plus, X, Check, HelpCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBetSlip, type SlipPick } from "@/lib/bet-slip-store";
import { RefereeModule } from "./referee-module";

const fmt = (v: number) => `${Math.round(v)}%`;

function SampleBadges({ p, accent = "primary" }: { p: SampleProb; accent?: "primary" | "muted" }) {
  const cls = accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="flex items-center gap-1 text-[11px] tabular-nums">
      <span className="rounded bg-muted px-1 py-0.5 text-muted-foreground">L5</span>
      <span className={`font-semibold ${cls}`}>{fmt(p.last5)}</span>
      <span className="rounded bg-primary/10 px-1 py-0.5 font-semibold text-primary">L10</span>
      <span className={`font-semibold ${cls}`}>{fmt(p.last10)}</span>
    </div>
  );
}

function AddButton({ disabled, active, onClick }: { disabled?: boolean; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-success bg-success/10 text-success"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      {active ? "En combinada" : "Añadir"}
    </button>
  );
}

function PercentBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function SurfaceLine({ surface }: { surface: TieredThreshold["surface"] }) {
  if (!surface) return null;
  const entries = Object.entries(surface) as [string, SampleProb][];
  if (entries.length === 0) return null;
  const labelMap: Record<string, string> = { hard: "Hard", clay: "Tierra", grass: "Hierba" };
  return (
    <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-muted-foreground">
      {entries.map(([s, p]) => (
        <span key={s} className="rounded bg-accent/40 px-1.5 py-0.5">
          {labelMap[s] ?? s}: L5 {fmt(p.last5)} · L10 {fmt(p.last10)}
        </span>
      ))}
    </div>
  );
}

function TieredRow({
  match, section, t,
}: { match: Match; section: PredictionSection & { kind: "tiered" }; t: TieredThreshold }) {
  const slip = useBetSlip();
  const key = `${match.id}::${section.id}::over-${t.line}`;
  const active = slip.has(key);
  const pick: SlipPick = {
    key,
    matchId: match.id,
    matchLabel: `${match.home.name} vs ${match.away.name}`,
    sectionTitle: section.title,
    pickLabel: `Over ${t.line}`,
    probability: t.overPct.last10,
    sampleSource: "last10",
    correlationTag: section.correlationTag,
  };

  return (
    <div className="space-y-1 rounded-md border border-border/60 p-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Over {t.line}</span>
        <div className="flex items-center gap-2">
          <SampleBadges p={t.overPct} />
          <AddButton active={active} onClick={() => (active ? slip.removePick(key) : slip.addPick(pick))} />
        </div>
      </div>
      <PercentBar value={t.overPct.last10} />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Under {t.line}</span>
        <span className="tabular-nums">L5 {fmt(100 - t.overPct.last5)} · L10 {fmt(100 - t.overPct.last10)}</span>
      </div>
      {(t.homePct || t.awayPct) && (
        <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-muted-foreground">
          {t.homePct && (
            <div className="truncate">
              {match.home.name}: L5 {fmt(t.homePct.last5)} · L10 {fmt(t.homePct.last10)}
            </div>
          )}
          {t.awayPct && (
            <div className="truncate text-right">
              {match.away.name}: L5 {fmt(t.awayPct.last5)} · L10 {fmt(t.awayPct.last10)}
            </div>
          )}
        </div>
      )}
      <SurfaceLine surface={t.surface} />
    </div>
  );
}

function SectionBody({ match, section }: { match: Match; section: PredictionSection }) {
  const slip = useBetSlip();
  if (section.kind === "tiered") {
    if (section.thresholds.length === 0) {
      return <div className="text-xs text-muted-foreground">Sin líneas dentro del rango 35–95%.</div>;
    }
    return (
      <div className="space-y-2">
        {section.thresholds.map((t) => (
          <TieredRow key={t.line} match={match} section={section} t={t} />
        ))}
      </div>
    );
  }
  if (section.kind === "items") {
    return (
      <div className="space-y-2">
        {section.items.map((it) => {
          const key = `${match.id}::${section.id}::${it.label}`;
          const active = slip.has(key);
          const pick: SlipPick = {
            key,
            matchId: match.id,
            matchLabel: `${match.home.name} vs ${match.away.name}`,
            sectionTitle: section.title,
            pickLabel: it.label,
            probability: it.pct.last10,
            sampleSource: "last10",
            correlationTag: section.correlationTag,
          };
          return (
            <div key={it.label} className="space-y-1 rounded-md border border-border/60 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{it.label}</span>
                <div className="flex items-center gap-2">
                  <SampleBadges p={it.pct} />
                  <AddButton active={active} onClick={() => (active ? slip.removePick(key) : slip.addPick(pick))} />
                </div>
              </div>
              <PercentBar value={it.pct.last10} />
            </div>
          );
        })}
      </div>
    );
  }
  // compare
  return (
    <div className="space-y-3">
      {section.entries.map((e) => (
        <div key={e.metric} className="space-y-1.5 rounded-md border border-border/60 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{e.metric}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="space-y-0.5">
              <div className="truncate text-muted-foreground">{match.home.name}</div>
              <SampleBadges p={e.homePct} />
            </div>
            <div className="space-y-0.5 text-right">
              <div className="truncate text-muted-foreground">{match.away.name}</div>
              <div className="flex justify-end"><SampleBadges p={e.awayPct} /></div>
            </div>
          </div>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="bg-primary" style={{ width: `${e.homePct.last10}%` }} />
            <div className="bg-chart-2" style={{ width: `${e.awayPct.last10}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PredictionGroups({ match }: { match: Match }) {
  const grouped = useMemo(() => {
    const g = new Map<string, PredictionSection[]>();
    for (const s of match.predictionSections) {
      if (!g.has(s.group)) g.set(s.group, []);
      g.get(s.group)!.push(s);
    }
    return Array.from(g.entries());
  }, [match.predictionSections]);

  return (
    <Accordion type="multiple" className="space-y-3">
      {grouped.map(([group, items]) => (
        <AccordionItem
          key={group}
          value={group}
          className="rounded-lg border border-border bg-card px-4"
        >
          <AccordionTrigger className="text-sm font-semibold">{group}</AccordionTrigger>
          <AccordionContent>
            <Accordion type="multiple" className="rounded-md border border-border/60 px-3">
              {items.map((s) => (
                <AccordionItem key={s.id} value={s.id} className="border-b last:border-b-0">
                  <AccordionTrigger className="text-xs font-medium">{s.title}</AccordionTrigger>
                  <AccordionContent>
                    <SectionBody match={match} section={s} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function StatRow({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away || 1;
  const hp = (home / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="tabular-nums font-medium">{Number.isInteger(home) ? home : home.toFixed(1)}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{Number.isInteger(away) ? away : away.toFixed(1)}</span>
      </div>
      <div className="flex h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-primary" style={{ width: `${hp}%` }} />
        <div className="bg-chart-2" style={{ width: `${100 - hp}%` }} />
      </div>
    </div>
  );
}

function StatsBlockView({ home, away }: { home: Record<string, number>; away: Record<string, number> }) {
  const keys = Array.from(new Set([...Object.keys(home), ...Object.keys(away)]));
  return (
    <div className="space-y-3 rounded-md border border-border/60 p-3">
      {keys.map((k) => (
        <StatRow key={k} label={STAT_LABEL[k] ?? k} home={home[k] ?? 0} away={away[k] ?? 0} />
      ))}
    </div>
  );
}

function StatsAccordion({ home, away }: { home: { avg5: StatsBlock; avg10: StatsBlock; name: string }; away: { avg5: StatsBlock; avg10: StatsBlock; name: string } }) {
  return (
    <Accordion type="multiple" className="rounded-lg border border-border bg-card px-4" defaultValue={["for10"]}>
      <AccordionItem value="for10" className="border-b">
        <AccordionTrigger className="text-sm font-medium">A favor · últimos 10 partidos</AccordionTrigger>
        <AccordionContent>
          <StatsBlockView home={home.avg10.for} away={away.avg10.for} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="for5" className="border-b">
        <AccordionTrigger className="text-sm font-medium">A favor · últimos 5 partidos</AccordionTrigger>
        <AccordionContent>
          <StatsBlockView home={home.avg5.for} away={away.avg5.for} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="against10" className="border-b">
        <AccordionTrigger className="text-sm font-medium">En contra · últimos 10 partidos</AccordionTrigger>
        <AccordionContent>
          <StatsBlockView home={home.avg10.against} away={away.avg10.against} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="against5" className="border-b last:border-b-0">
        <AccordionTrigger className="text-sm font-medium">En contra · últimos 5 partidos</AccordionTrigger>
        <AccordionContent>
          <StatsBlockView home={home.avg5.against} away={away.avg5.against} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/* ---------- Tenis ---------- */
function TennisExtras({ match }: { match: Match }) {
  if (match.sport !== "tennis") return null;
  return (
    <Accordion type="multiple" className="space-y-3">
      {match.serve && (
        <AccordionItem value="serve" className="rounded-lg border border-border bg-card px-4">
          <AccordionTrigger className="text-sm font-semibold">Estadísticas de servicio</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {([["firstServePct", "% 1er servicio"], ["pointsWon1stServe", "Puntos ganados 1º"], ["pointsWon2ndServe", "Puntos ganados 2º"], ["serviceGamesWon", "Juegos saque ganados"], ["holdPct", "% mantiene saque"], ["bpSaved", "% BP salvados"], ["bpConverted", "% BP convertidos"]] as const).map(([k, label]) => (
                <div key={k} className="rounded-md border border-border/60 p-2.5">
                  <div className="text-[11px] text-muted-foreground">{label}</div>
                  <div className="mt-1 flex items-center justify-between text-sm font-semibold tabular-nums">
                    <span>{match.serve!.home[k]}%</span>
                    <span className="text-chart-2">{match.serve!.away[k]}%</span>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {match.h2h && (
        <AccordionItem value="h2h" className="rounded-lg border border-border bg-card px-4">
          <AccordionTrigger className="text-sm font-semibold">Enfrentamientos directos (H2H)</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-md border border-border/60 p-2.5">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold tabular-nums">
                  {match.h2h.total.wins1} — {match.h2h.total.wins2}
                </span>
              </div>
              {match.h2h.surface &&
                (Object.entries(match.h2h.surface) as [string, [number, number]][]).map(([s, [w1, w2]]) => (
                  <div key={s} className="flex items-center justify-between rounded-md border border-border/60 p-2.5">
                    <span className="text-muted-foreground capitalize">{s === "hard" ? "Hard" : s === "clay" ? "Tierra" : "Hierba"}</span>
                    <span className="font-semibold tabular-nums">{w1} — {w2}</span>
                  </div>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {match.fatigue && (
        <AccordionItem value="fatigue" className="rounded-lg border border-border bg-card px-4">
          <AccordionTrigger className="text-sm font-semibold">Fatiga y carga</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[match.home, match.away].map((p, i) => {
                const f = i === 0 ? match.fatigue!.home : match.fatigue!.away;
                return (
                  <div key={p.name} className="space-y-1.5 rounded-md border border-border/60 p-2.5">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Minutos L5</span><span className="tabular-nums">{f.minutesL5}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sets L5</span><span className="tabular-nums">{f.setsL5}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Partidos 7d</span><span className="tabular-nums">{f.matches7d}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Partidos 14d</span><span className="tabular-nums">{f.matches14d}</span></div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {match.ranking && (
        <AccordionItem value="ranking" className="rounded-lg border border-border bg-card px-4">
          <AccordionTrigger className="text-sm font-semibold">Ranking y rivales</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[match.home, match.away].map((p, i) => {
                const r = i === 0 ? match.ranking!.home : match.ranking!.away;
                const wr = (w: number, pl: number) => (pl ? `${Math.round((w / pl) * 100)}% (${w}/${pl})` : "—");
                return (
                  <div key={p.name} className="space-y-1.5 rounded-md border border-border/60 p-2.5">
                    <div className="text-sm font-medium">{p.name} <span className="text-muted-foreground">· ATP #{r.rank}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Rivales medios L5</span><span className="tabular-nums">#{r.rankAvgOpponents5}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Rivales medios L10</span><span className="tabular-nums">#{r.rankAvgOpponents10}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">vs Top 10</span><span className="tabular-nums">{wr(r.vsTop10.wins, r.vsTop10.played)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">vs Top 20</span><span className="tabular-nums">{wr(r.vsTop20.wins, r.vsTop20.played)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">vs Top 50</span><span className="tabular-nums">{wr(r.vsTop50.wins, r.vsTop50.played)}</span></div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}

/* ---------- Oportunidades / Índice de confianza ---------- */
function flattenPicks(match: Match): { label: string; prob: number; section: string }[] {
  const out: { label: string; prob: number; section: string }[] = [];
  for (const s of match.predictionSections) {
    if (s.kind === "tiered") {
      for (const t of s.thresholds) out.push({ label: `${s.title} · Over ${t.line}`, prob: t.overPct.last10, section: s.group });
    } else if (s.kind === "items") {
      for (const it of s.items) out.push({ label: `${s.title} · ${it.label}`, prob: it.pct.last10, section: s.group });
    }
  }
  return out;
}

function confidenceScore(match: Match): number {
  const picks = flattenPicks(match);
  const dataQuality = Math.min(1, picks.length / 30);
  // Forma: cuánto se acercan ambos a un %50 (mucha diferencia = más certeza)
  const hT = match.home.last10.wins + match.home.last10.draws + match.home.last10.losses || 1;
  const aT = match.away.last10.wins + match.away.last10.draws + match.away.last10.losses || 1;
  const formGap = Math.abs(match.home.last10.wins / hT - match.away.last10.wins / aT);
  const extra = match.referee ? 0.1 : 0;
  const tennisExtra = match.sport === "tennis" && match.h2h && match.serve ? 0.15 : 0;
  const score = 50 + formGap * 30 + dataQuality * 15 + extra * 100 + tennisExtra * 100;
  return Math.round(Math.min(100, score));
}

function ConfidenceBadge({ score }: { score: number }) {
  let cls = "bg-destructive/10 text-destructive";
  let label = "🔴 Baja confianza";
  if (score >= 80) { cls = "bg-success/10 text-success"; label = "🟢 Muy alta"; }
  else if (score >= 60) { cls = "bg-warning/10 text-warning"; label = "🟡 Media"; }
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${cls}`}>{label} · {score}/100</span>;
}

function OpportunitiesView({ match }: { match: Match }) {
  const picks = flattenPicks(match);
  const top = [...picks].sort((a, b) => b.prob - a.prob).slice(0, 5);

  // Combinadas sugeridas: agrupa picks de grupos diferentes con prob>75 y crea trío
  const high = picks.filter((p) => p.prob >= 75);
  const seen = new Set<string>();
  const unique = high.filter((p) => {
    if (seen.has(p.section)) return false;
    seen.add(p.section);
    return true;
  });
  const combos: { picks: typeof unique; pMath: number }[] = [];
  if (unique.length >= 2) {
    for (let i = 0; i < Math.min(5, unique.length - 1); i++) {
      const chosen = unique.slice(i, i + Math.min(3, unique.length - i));
      if (chosen.length < 2) continue;
      const pMath = chosen.reduce((acc, p) => acc * (p.prob / 100), 1) * 100;
      combos.push({ picks: chosen, pMath });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top 5 individuales</h4>
        <div className="space-y-1.5">
          {top.map((p, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-border/60 bg-card p-2.5 text-xs">
              <span className="truncate">{p.label}</span>
              <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary tabular-nums">{p.prob}%</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Combinadas sugeridas</h4>
        {combos.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No hay suficientes mercados con probabilidad &gt;75% para combinar.
          </div>
        ) : (
          <div className="space-y-2">
            {combos.map((c, i) => (
              <div key={i} className="rounded-md border border-border/60 bg-card p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Combinada #{i + 1}</span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary tabular-nums">
                    {c.pMath.toFixed(1)}%
                  </span>
                </div>
                <ul className="space-y-1 text-xs">
                  {c.picks.map((p, j) => (
                    <li key={j} className="flex justify-between">
                      <span className="truncate">{p.label}</span>
                      <span className="tabular-nums text-muted-foreground">{p.prob}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MatchDetail({ match, onClose }: { match: Match; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const score = confidenceScore(match);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
        <div
          className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-border bg-background shadow-xl sm:rounded-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {SPORT_LABEL[match.sport]} · {match.league}
                {match.surface && ` · ${match.surface === "clay" ? "Tierra" : match.surface === "hard" ? "Hard" : "Hierba"}`}
              </div>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">
                {match.home.name} <span className="text-muted-foreground">vs</span> {match.away.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ConfidenceBadge score={score} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground" aria-label="Ayuda confianza">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Índice global (0–100) calculado a partir de forma reciente, calidad de datos, árbitro y, en tenis, H2H + servicio.
                  </TooltipContent>
                </Tooltip>
              </div>
              {match.sources && (
                <div className="mt-1.5 text-[11px] text-muted-foreground">
                  Promedio de: {match.sources.join(" · ")}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-6 p-6">
            {match.referee && (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Árbitro</h3>
                <RefereeModule referee={match.referee} />
              </section>
            )}

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estadísticas medias</h3>
              <StatsAccordion home={match.home} away={match.away} />
            </section>

            {match.sport === "tennis" && (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos avanzados (tenis)</h3>
                <TennisExtras match={match} />
              </section>
            )}

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Predicciones</h3>
              <PredictionGroups match={match} />
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Oportunidades sugeridas</h3>
              <OpportunitiesView match={match} />
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Forma reciente</h3>
              <div className="grid grid-cols-2 gap-4">
                {[match.home, match.away].map((t) => (
                  <div key={t.name} className="rounded-lg border border-border p-4">
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">Últimos 5</div>
                    <div className="mt-1 flex items-baseline gap-3 text-xs text-muted-foreground">
                      <span><span className="text-base font-semibold text-success">{t.last5.wins}</span> G</span>
                      <span><span className="text-base font-semibold text-warning">{t.last5.draws}</span> E</span>
                      <span><span className="text-base font-semibold text-destructive">{t.last5.losses}</span> P</span>
                    </div>
                    <div className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">Últimos 10</div>
                    <div className="mt-1 flex items-baseline gap-3 text-xs text-muted-foreground">
                      <span><span className="text-base font-semibold text-success">{t.last10.wins}</span> G</span>
                      <span><span className="text-base font-semibold text-warning">{t.last10.draws}</span> E</span>
                      <span><span className="text-base font-semibold text-destructive">{t.last10.losses}</span> P</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
