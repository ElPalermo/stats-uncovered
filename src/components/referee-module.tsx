import { useMemo } from "react";
import type { Match, RefereeStats } from "@/lib/mock-data";

function profile(refMul: number): { label: string; color: string } {
  // refMul = avgárbitro / mediaLiga
  if (refMul >= 1.3) return { label: "🔴 Muy tarjetero", color: "text-destructive" };
  if (refMul >= 1.1) return { label: "🟡 Tarjetero", color: "text-warning" };
  if (refMul <= 0.85) return { label: "🟢 Permisivo", color: "text-success" };
  return { label: "🟡 Normal", color: "text-muted-foreground" };
}

function devBadge(refAvg: number, leagueAvg: number) {
  const dev = ((refAvg - leagueAvg) / leagueAvg) * 100;
  const rounded = Math.round(dev);
  const sign = rounded > 0 ? "+" : "";
  let cls = "bg-muted text-muted-foreground";
  if (dev >= 15) cls = "bg-destructive/10 text-destructive";
  else if (dev <= -15) cls = "bg-success/10 text-success";
  else if (Math.abs(dev) >= 5) cls = "bg-warning/10 text-warning";
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}>
      {sign}{rounded}%
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function RefereeModule({ referee }: { referee: RefereeStats }) {
  const avg5y = referee.last5.yellow / Math.max(1, referee.last5.matches);
  const avg10y = referee.last10.yellow / Math.max(1, referee.last10.matches);
  const avg5r = referee.last5.red / Math.max(1, referee.last5.matches);
  const avg10r = referee.last10.red / Math.max(1, referee.last10.matches);
  const avg5f = referee.last5.fouls / Math.max(1, referee.last5.matches);
  const avg10f = referee.last10.fouls / Math.max(1, referee.last10.matches);
  const mul = useMemo(() => avg10y / referee.leagueAvg.yellow, [avg10y, referee.leagueAvg.yellow]);
  const p = profile(mul);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Árbitro</div>
          <div className="text-sm font-semibold">{referee.name}</div>
        </div>
        <span className={`text-xs font-semibold ${p.color}`}>{p.label}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Tarjetas amarillas */}
        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <div className="text-xs font-semibold">Tarjetas amarillas</div>
          <Row label="Últimos 5 · total" value={referee.last5.yellow} />
          <Row label="Últimos 5 · media" value={avg5y.toFixed(2)} />
          <Row label="Últimos 10 · total" value={referee.last10.yellow} />
          <Row label="Últimos 10 · media" value={avg10y.toFixed(2)} />
          <Row label="Media liga" value={referee.leagueAvg.yellow.toFixed(2)} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">vs liga (L10)</span>
            {devBadge(avg10y, referee.leagueAvg.yellow)}
          </div>
        </div>

        {/* Rojas */}
        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <div className="text-xs font-semibold">Tarjetas rojas</div>
          <Row label="Últimos 5 · total" value={referee.last5.red} />
          <Row label="Últimos 5 · media" value={avg5r.toFixed(2)} />
          <Row label="Últimos 10 · total" value={referee.last10.red} />
          <Row label="Últimos 10 · media" value={avg10r.toFixed(2)} />
          <Row label="Media liga" value={referee.leagueAvg.red.toFixed(2)} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">vs liga (L10)</span>
            {devBadge(avg10r, referee.leagueAvg.red)}
          </div>
        </div>

        {/* Faltas */}
        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <div className="text-xs font-semibold">Faltas señaladas</div>
          <Row label="Últimos 5 · total" value={referee.last5.fouls} />
          <Row label="Últimos 5 · media" value={avg5f.toFixed(1)} />
          <Row label="Últimos 10 · total" value={referee.last10.fouls} />
          <Row label="Últimos 10 · media" value={avg10f.toFixed(1)} />
          <Row label="Media liga" value={referee.leagueAvg.fouls.toFixed(1)} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">vs liga (L10)</span>
            {devBadge(avg10f, referee.leagueAvg.fouls)}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Las predicciones de tarjetas y faltas se ponderan automáticamente con la desviación de este árbitro respecto a la media de la competición.
      </p>
    </div>
  );
}
