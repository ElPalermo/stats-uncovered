import type { Match, PredictionSection, StatsBlock } from "@/lib/mock-data";
import { SPORT_LABEL, STAT_LABEL } from "@/lib/mock-data";
import { X } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function PercentBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function StatRow({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away || 1;
  const hp = (home / total) * 100;
  return (
    <div className="space-y-1.5">
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
    <div className="space-y-3 rounded-lg border border-border p-4">
      {keys.map((k) => (
        <StatRow key={k} label={STAT_LABEL[k] ?? k} home={home[k] ?? 0} away={away[k] ?? 0} />
      ))}
    </div>
  );
}

function SectionBody({ section }: { section: PredictionSection }) {
  if (section.kind === "tiered") {
    if (section.thresholds.length === 0) {
      return <div className="text-xs text-muted-foreground">Sin líneas dentro del rango 35–95%.</div>;
    }
    return (
      <div className="space-y-2">
        {section.thresholds.map((t) => (
          <div key={t.line} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Over {t.line}</span>
              <span className="tabular-nums font-semibold text-primary">{t.overPct}%</span>
            </div>
            <PercentBar value={t.overPct} />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Under {t.line}</span>
              <span className="tabular-nums">{100 - t.overPct}%</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (section.kind === "items") {
    return (
      <div className="space-y-2">
        {section.items.map((it) => (
          <div key={it.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{it.label}</span>
              <span className="tabular-nums font-semibold text-primary">{it.pct}%</span>
            </div>
            <PercentBar value={it.pct} />
          </div>
        ))}
      </div>
    );
  }
  // compare
  return (
    <div className="space-y-3">
      {section.entries.map((e) => (
        <div key={e.metric} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="tabular-nums font-semibold text-primary">{e.homePct}%</span>
            <span className="text-muted-foreground">{e.metric}</span>
            <span className="tabular-nums font-semibold text-chart-2">{e.awayPct}%</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="bg-primary" style={{ width: `${e.homePct}%` }} />
            <div className="bg-chart-2" style={{ width: `${e.awayPct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PredictionGroups({ sections }: { sections: PredictionSection[] }) {
  const grouped = useMemo(() => {
    const g = new Map<string, PredictionSection[]>();
    for (const s of sections) {
      if (!g.has(s.group)) g.set(s.group, []);
      g.get(s.group)!.push(s);
    }
    return Array.from(g.entries());
  }, [sections]);

  return (
    <div className="space-y-6">
      {grouped.map(([group, items]) => (
        <div key={group}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h4>
          <Accordion type="multiple" className="rounded-lg border border-border px-4">
            {items.map((s) => (
              <AccordionItem key={s.id} value={s.id} className="border-b last:border-b-0">
                <AccordionTrigger>{s.title}</AccordionTrigger>
                <AccordionContent>
                  <SectionBody section={s} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}

function StatsAccordion({ home, away }: { home: { avg5: StatsBlock; avg15: StatsBlock; name: string }; away: { avg5: StatsBlock; avg15: StatsBlock; name: string } }) {
  return (
    <Accordion type="multiple" className="rounded-lg border border-border px-4" defaultValue={["for15"]}>
      <AccordionItem value="for15" className="border-b">
        <AccordionTrigger>A favor · últimos 15 partidos</AccordionTrigger>
        <AccordionContent>
          <StatsBlockView home={home.avg15.for} away={away.avg15.for} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="for5" className="border-b">
        <AccordionTrigger>A favor · últimos 5 partidos</AccordionTrigger>
        <AccordionContent>
          <StatsBlockView home={home.avg5.for} away={away.avg5.for} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="against15" className="border-b">
        <AccordionTrigger>En contra · últimos 15 partidos</AccordionTrigger>
        <AccordionContent>
          <StatsBlockView home={home.avg15.against} away={away.avg15.against} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="against5" className="border-b last:border-b-0">
        <AccordionTrigger>En contra · últimos 5 partidos</AccordionTrigger>
        <AccordionContent>
          <StatsBlockView home={home.avg5.against} away={away.avg5.against} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function MatchDetail({ match, onClose }: { match: Match; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {SPORT_LABEL[match.sport]} · {match.league}
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              {match.home.name} <span className="text-muted-foreground">vs</span> {match.away.name}
            </h2>
            {match.sources && (
              <div className="mt-1 text-[11px] text-muted-foreground">
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

        <div className="space-y-8 p-6">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estadísticas medias
            </h3>
            <StatsAccordion home={match.home} away={match.away} />
          </section>

          <section id="predictions">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Predicciones
            </h3>
            <PredictionGroups sections={match.predictionSections} />
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Forma reciente
            </h3>
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
                  <div className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">Últimos 15</div>
                  <div className="mt-1 flex items-baseline gap-3 text-xs text-muted-foreground">
                    <span><span className="text-base font-semibold text-success">{t.last15.wins}</span> G</span>
                    <span><span className="text-base font-semibold text-warning">{t.last15.draws}</span> E</span>
                    <span><span className="text-base font-semibold text-destructive">{t.last15.losses}</span> P</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
