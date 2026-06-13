import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { MatchCard } from "@/components/match-card";
import { MatchDetail } from "@/components/match-detail";
import { MATCHES, SPORT_LABEL, type Match, type Sport } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Statline — Sports stats & predictions" },
      { name: "description", content: "Live match listings, team averages from the last 15 matches, and predictive analytics across football, tennis, basketball and Formula 1." },
      { property: "og:title", content: "Statline — Sports stats & predictions" },
      { property: "og:description", content: "Live match listings, team averages and predictive analytics across major sports." },
    ],
  }),
  component: Index,
});

type Filter = "all" | Sport;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All sports" },
  { id: "football", label: SPORT_LABEL.football },
  { id: "tennis", label: SPORT_LABEL.tennis },
  { id: "basketball", label: SPORT_LABEL.basketball },
  { id: "f1", label: SPORT_LABEL.f1 },
];

function Index() {
  const [filter, setFilter] = useState<Filter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "upcoming">("all");
  const [selected, setSelected] = useState<Match | null>(null);

  const matches = useMemo(() => {
    return MATCHES.filter((m) => filter === "all" || m.sport === filter).filter((m) => {
      if (statusFilter === "all") return true;
      return m.status === statusFilter;
    });
  }, [filter, statusFilter]);

  const liveCount = MATCHES.filter((m) => m.status === "live").length;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Today's matches & predictions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Averages from the last 15 matches, model-based percentages, and live scores across the sports that matter — with a focus on Spain.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
            {liveCount} live {liveCount === 1 ? "match" : "matches"} right now
          </div>
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
          <div className="flex gap-1.5">
            {(["all", "live", "upcoming"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
                  statusFilter === s
                    ? "border border-primary/40 bg-primary/10 text-primary"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No matches for this filter.
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
    </div>
  );
}
