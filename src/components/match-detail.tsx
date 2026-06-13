import type { Match } from "@/lib/mock-data";
import { SPORT_LABEL } from "@/lib/mock-data";
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
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-lg"
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
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-8 p-6">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Average stats · last 15 matches
            </h3>
            <div className="space-y-3 rounded-lg border border-border p-4">
              {statKeys.map((k) => (
                <StatRow
                  key={k}
                  label={k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                  home={match.home.avgStats[k]}
                  away={match.away.avgStats[k]}
                />
              ))}
            </div>
          </section>

          <section id="predictions">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Predictions
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {match.predictions.map((p) => (
                <div key={p.label} className="rounded-lg border border-border p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-foreground">{p.label}</span>
                    <span className="text-2xl font-semibold tabular-nums text-primary">
                      {p.value}<span className="text-sm text-muted-foreground">{p.unit}</span>
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${p.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent form
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[match.home, match.away].map((t) => (
                <div key={t.name} className="rounded-lg border border-border p-4">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="mt-3 flex items-baseline gap-3 text-xs text-muted-foreground">
                    <span><span className="text-base font-semibold text-success">{t.last15.wins}</span> W</span>
                    <span><span className="text-base font-semibold text-warning">{t.last15.draws}</span> D</span>
                    <span><span className="text-base font-semibold text-destructive">{t.last15.losses}</span> L</span>
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
