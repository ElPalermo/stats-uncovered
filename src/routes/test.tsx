import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  emptyFootballTeam,
  emptyTennisPlayer,
  type FootballTeamInput,
  type TennisPlayerInput,
} from "@/lib/engine/inputs";
import { computeFootball, type FootballResult } from "@/lib/engine/football";
import { computeTennis, type TennisResult } from "@/lib/engine/tennis";
import type { TraceStep } from "@/lib/engine/trace";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [
      { title: "Modo Test · Motor determinista" },
      { name: "description", content: "Página de validación del modelo matemático base (fútbol y tenis)." },
    ],
  }),
  component: TestPage,
});

const FOOTBALL_FIELDS: { key: keyof Omit<FootballTeamInput, "name">; label: string; step?: number }[] = [
  { key: "shots_for_avg", label: "shots_for_avg", step: 0.1 },
  { key: "shots_against_avg", label: "shots_against_avg", step: 0.1 },
  { key: "goals_scored_avg", label: "goals_scored_avg", step: 0.01 },
  { key: "goals_conceded_avg", label: "goals_conceded_avg", step: 0.01 },
  { key: "corners_for_avg", label: "corners_for_avg", step: 0.1 },
  { key: "corners_against_avg", label: "corners_against_avg", step: 0.1 },
  { key: "possession_avg", label: "possession_avg (0–100)", step: 0.1 },
  { key: "form_last5_score", label: "form_last5_score (0–1)", step: 0.01 },
  { key: "form_last10_score", label: "form_last10_score (0–1)", step: 0.01 },
];

const TENNIS_FIELDS: { key: keyof Omit<TennisPlayerInput, "name">; label: string }[] = [
  { key: "serve_hold_rate", label: "serve_hold_rate (0–1)" },
  { key: "break_rate", label: "break_rate (0–1)" },
  { key: "first_serve_win_rate", label: "first_serve_win_rate (0–1)" },
  { key: "return_points_won_rate", label: "return_points_won_rate (0–1)" },
  { key: "surface_win_rate", label: "surface_win_rate (0–1)" },
  { key: "recent_form_score", label: "recent_form_score (0–1)" },
];

function TraceList({ steps }: { steps: TraceStep[] }) {
  return (
    <ol className="space-y-2 text-sm">
      {steps.map((s, i) => (
        <li key={i} className="rounded-md border border-border bg-muted/30 p-3">
          <div className="font-medium">{s.label} = {s.result}</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">{s.formula}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {Object.entries(s.inputs).map(([k, v]) => `${k}=${v}`).join("  ·  ")}
          </div>
        </li>
      ))}
    </ol>
  );
}

function TestPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between py-4">
          <h1 className="text-xl font-semibold">Modo Test · Motor determinista</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Volver</Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto py-6">
        <Tabs defaultValue="football">
          <TabsList>
            <TabsTrigger value="football">Fútbol</TabsTrigger>
            <TabsTrigger value="tennis">Tenis</TabsTrigger>
          </TabsList>
          <TabsContent value="football" className="mt-6">
            <FootballTester />
          </TabsContent>
          <TabsContent value="tennis" className="mt-6">
            <TennisTester />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function FootballTester() {
  const [teamA, setTeamA] = useState<FootballTeamInput>(emptyFootballTeam("Equipo A"));
  const [teamB, setTeamB] = useState<FootballTeamInput>(emptyFootballTeam("Equipo B"));
  const [leagueAverage, setLeagueAverage] = useState<number>(50);

  const result: FootballResult = useMemo(
    () => computeFootball({ teamA, teamB, leagueAverage }),
    [teamA, teamB, leagueAverage],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
      <TeamForm title="Equipo A" team={teamA} onChange={setTeamA} />
      <TeamForm title="Equipo B" team={teamB} onChange={setTeamB} />
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Parámetros de liga</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="league">LeagueAverage</Label>
            <Input id="league" type="number" step={0.1} value={leagueAverage}
              onChange={(e) => setLeagueAverage(Number(e.target.value))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Resultado</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm font-mono">
            <Row label="Attack A" value={result.teamA.attack} />
            <Row label="Defense A" value={result.teamA.defense} />
            <Row label="AdjustedAttack A" value={result.teamA.adjustedAttack} />
            <Row label="TeamStrength A" value={result.teamA.teamStrength} />
            <hr className="my-2 border-border" />
            <Row label="Attack B" value={result.teamB.attack} />
            <Row label="Defense B" value={result.teamB.defense} />
            <Row label="AdjustedAttack B" value={result.teamB.adjustedAttack} />
            <Row label="TeamStrength B" value={result.teamB.teamStrength} />
            <hr className="my-2 border-border" />
            <Row label="MatchDiff" value={result.matchDiff} />
            <Row label="Probability (raw)" value={result.probabilityRaw} />
            <Row label="Probability" value={`${result.probability}%`} highlight />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trace · Equipo A</CardTitle></CardHeader>
          <CardContent><TraceList steps={result.teamA.trace} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trace · Equipo B</CardTitle></CardHeader>
          <CardContent><TraceList steps={result.teamB.trace} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trace · Partido</CardTitle></CardHeader>
          <CardContent><TraceList steps={result.trace} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeamForm({
  title,
  team,
  onChange,
}: {
  title: string;
  team: FootballTeamInput;
  onChange: (t: FootballTeamInput) => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Nombre</Label>
          <Input value={team.name} onChange={(e) => onChange({ ...team, name: e.target.value })} />
        </div>
        {FOOTBALL_FIELDS.map((f) => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            <Input
              type="number"
              step={f.step ?? 0.01}
              value={team[f.key] as number}
              onChange={(e) => onChange({ ...team, [f.key]: Number(e.target.value) })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TennisTester() {
  const [playerA, setPlayerA] = useState<TennisPlayerInput>(emptyTennisPlayer("Jugador A"));
  const [playerB, setPlayerB] = useState<TennisPlayerInput>(emptyTennisPlayer("Jugador B"));

  const result: TennisResult = useMemo(
    () => computeTennis({ playerA, playerB }),
    [playerA, playerB],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
      <PlayerForm title="Jugador A" player={playerA} onChange={setPlayerA} />
      <PlayerForm title="Jugador B" player={playerB} onChange={setPlayerB} />
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Resultado</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm font-mono">
            <Row label="Strength A" value={result.playerA.strength} />
            <Row label="Strength B" value={result.playerB.strength} />
            <Row label="Diff" value={result.diff} />
            <Row label="Probability (raw)" value={result.probabilityRaw} />
            <Row label="Probability" value={`${result.probability}%`} highlight />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trace · Jugador A</CardTitle></CardHeader>
          <CardContent><TraceList steps={result.playerA.trace} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trace · Jugador B</CardTitle></CardHeader>
          <CardContent><TraceList steps={result.playerB.trace} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trace · Partido</CardTitle></CardHeader>
          <CardContent><TraceList steps={result.trace} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlayerForm({
  title,
  player,
  onChange,
}: {
  title: string;
  player: TennisPlayerInput;
  onChange: (p: TennisPlayerInput) => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Nombre</Label>
          <Input value={player.name} onChange={(e) => onChange({ ...player, name: e.target.value })} />
        </div>
        {TENNIS_FIELDS.map((f) => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            <Input
              type="number"
              step={0.01}
              value={player[f.key] as number}
              onChange={(e) => onChange({ ...player, [f.key]: Number(e.target.value) })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${highlight ? "text-primary font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
