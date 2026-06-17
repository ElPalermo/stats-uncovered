import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { MatchCard } from "@/components/match-card";
import { MatchDetail } from "@/components/match-detail";
import { BetSlipPanel } from "@/components/bet-slip-panel";
import { MATCHES, SPORT_LABEL, type Match, type Sport } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Statline — Estadísticas y predicciones deportivas" },
      { name: "description", content: "Medias de los últimos 5 y 15 partidos, estadísticas a favor y en contra, y predicciones por umbrales en fútbol, tenis y baloncesto." },
      { property: "og:title", content: "Statline — Estadísticas y predicciones deportivas" },
      { property: "og:description", content: "Medias por equipo, datos a favor y en contra, y predicciones por umbrales (35–95%)." },
    ],
  }),
  component: Index,
});

type Filter = "all" | Sport;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "football", label: SPORT_LABEL.football },
  { id: "tennis", label: SPORT_LABEL.tennis },
];

function Index() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Match | null>(null);

  const matches = useMemo(
    () => MATCHES.filter((m) => filter === "all" || m.sport === filter),
    [filter],
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Partidos y predicciones
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Medias de los últimos 5 y 15 partidos, datos a favor y en contra, y predicciones por umbrales — fútbol, tenis y baloncesto.
          </p>
        </section>

        <section id="matches" className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  filter === f.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No hay partidos para este filtro.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} onSelect={setSelected} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />

      {selected && <MatchDetail match={selected} onClose={() => setSelected(null)} />}
      <BetSlipPanel />
    </div>
  );
}
