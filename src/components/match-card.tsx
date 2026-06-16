import type { Match } from "@/lib/mock-data";
import { SPORT_LABEL } from "@/lib/mock-data";

function StatusBadge({ match }: { match: Match }) {
  if (match.status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
        LIVE{match.minute ? ` · ${match.minute}'` : ""}
      </span>
    );
  }
  if (match.status === "finished") {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        FT
      </span>
    );
  }
  const t = new Date(match.startTime);
  const hours = t.getUTCHours().toString().padStart(2, "0");
  const minutes = t.getUTCMinutes().toString().padStart(2, "0");
  return (
    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
      {hours}:{minutes}
    </span>
  );
}

function FormBar({ w, d, l }: { w: number; d: number; l: number }) {
  const total = w + d + l || 1;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="bg-success" style={{ width: `${(w / total) * 100}%` }} />
      <div className="bg-warning" style={{ width: `${(d / total) * 100}%` }} />
      <div className="bg-destructive" style={{ width: `${(l / total) * 100}%` }} />
    </div>
  );
}

function topHighlight(match: Match): { label: string; value: number } | null {
  // Busca la línea de "Total goles / Total puntos" más cercana al 70%.
  const totalsSection = match.predictionSections.find(
    (s) => s.kind === "tiered" && (s.id === "tot-goals" || s.id === "pts-total" || s.id === "games-total"),
  );
  if (totalsSection && totalsSection.kind === "tiered" && totalsSection.thresholds.length) {
    const best = [...totalsSection.thresholds].sort(
      (a, b) => Math.abs(70 - a.overPct) - Math.abs(70 - b.overPct),
    )[0];
    return { label: `${totalsSection.title} · Over ${best.line}`, value: best.overPct };
  }
  return null;
}

export function MatchCard({ match, onSelect }: { match: Match; onSelect: (m: Match) => void }) {
  const top = topHighlight(match);
  return (
    <button
      onClick={() => onSelect(match)}
      className="group flex w-full flex-col gap-4 rounded-lg border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{SPORT_LABEL[match.sport]}</span>
          <span>·</span>
          <span>{match.league}</span>
        </div>
        <StatusBadge match={match} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{match.home.name}</span>
            {match.scoreHome !== undefined && (
              <span className="text-lg font-semibold tabular-nums">{match.scoreHome}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{match.away.name}</span>
            {match.scoreAway !== undefined && (
              <span className="text-lg font-semibold tabular-nums">{match.scoreAway}</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Últimos 15 · local</span>
          <span className="tabular-nums text-foreground">
            {match.home.last15.wins}G {match.home.last15.draws}E {match.home.last15.losses}P
          </span>
        </div>
        <FormBar
          w={match.home.last15.wins}
          d={match.home.last15.draws}
          l={match.home.last15.losses}
        />
      </div>

      {top && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="text-xs text-muted-foreground">Predicción destacada</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground">{top.label}</span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
              {top.value}%
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
