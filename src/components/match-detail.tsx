import type { Match, FootballPredictions } from "@/lib/mock-data";
import { SPORT_LABEL, STAT_LABEL } from "@/lib/mock-data";
import { X } from "lucide-react";
import { useEffect } from "react";

function StatRow({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away || 1;
  const hp = (home / total) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="tabular-nums font-medium">{home}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{away}</span>
      </div>
      <div className="flex h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-primary" style={{ width: `${hp}%` }} />
        <div className="bg-chart-2" style={{ width: `${100 - hp}%` }} />
      </div>
    </div>
  );
}

function PercentBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function TieredCard({ metric, thresholds }: { metric: string; thresholds: { line: number; overPct: number }[] }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 text-sm font-medium">{metric}</div>
      <div className="space-y-2">
        {thresholds.map((t) => (
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
    </div>
  );
}

function CompareCard({ metric, homePct, awayPct, home, away }: { metric: string; homePct: number; awayPct: number; home: string; away: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 text-sm font-medium">{metric}</div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-primary" style={{ width: `${homePct}%` }} />
        <div className="bg-chart-2" style={{ width: `${awayPct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="truncate"><span className="tabular-nums font-semibold text-primary">{homePct}%</span> <span className="text-muted-foreground">{home}</span></span>
        <span className="truncate text-right"><span className="text-muted-foreground">{away}</span> <span className="tabular-nums font-semibold text-chart-2">{awayPct}%</span></span>
      </div>
    </div>
  );
}

function FootballPredictionsView({ preds, home, away }: { preds: FootballPredictions; home: string; away: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Totales por umbral (Over/Under)</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {preds.totals.map((t) => (
            <TieredCard key={t.metric} metric={t.metric} thresholds={t.thresholds} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Doble oportunidad</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {preds.doubleChance.map((d) => (
            <div key={d.label} className="rounded-lg border border-border p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm">{d.label}</span>
                <span className="text-xl font-semibold tabular-nums text-primary">{d.pct}%</span>
              </div>
              <div className="mt-2"><PercentBar value={d.pct} /></div>
            </div>
          ))}
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm">Ambos marcan (BTTS)</span>
              <span className="text-xl font-semibold tabular-nums text-primary">{preds.btts}%</span>
            </div>
            <div className="mt-2"><PercentBar value={preds.btts} /></div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">¿Quién tendrá más?</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {preds.more.map((m) => (
            <CompareCard key={m.metric} metric={m.metric} homePct={m.homePct} awayPct={m.awayPct} home={home} away={away} />
          ))}
        </div>
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

  const statKeys = Object.keys(match.home.avgStats);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
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
              Medias · últimos 15 partidos
            </h3>
            <div className="space-y-3 rounded-lg border border-border p-4">
              {statKeys.map((k) => (
                <StatRow
                  key={k}
                  label={STAT_LABEL[k] ?? k}
                  home={match.home.avgStats[k]}
                  away={match.away.avgStats[k]}
                />
              ))}
            </div>
          </section>

          <section id="predictions">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Predicciones
            </h3>
            {match.footballPredictions ? (
              <FootballPredictionsView preds={match.footballPredictions} home={match.home.name} away={match.away.name} />
            ) : match.predictions && match.predictions.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {match.predictions.map((p) => (
                  <div key={p.label} className="rounded-lg border border-border p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-foreground">{p.label}</span>
                      <span className="text-2xl font-semibold tabular-nums text-primary">
                        {p.value}<span className="text-sm text-muted-foreground">{p.unit}</span>
                      </span>
                    </div>
                    <div className="mt-3"><PercentBar value={p.value} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sin predicciones disponibles.</div>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Forma reciente
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[match.home, match.away].map((t) => (
                <div key={t.name} className="rounded-lg border border-border p-4">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="mt-3 flex items-baseline gap-3 text-xs text-muted-foreground">
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
