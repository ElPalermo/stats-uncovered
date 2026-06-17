import { useBetSlip, computeSlip } from "@/lib/bet-slip-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, X, HelpCircle, Layers } from "lucide-react";

function levelBadge(level: "low" | "medium" | "high") {
  const map = {
    low: { label: "🟢 Baja", cls: "bg-success/10 text-success" },
    medium: { label: "🟡 Media", cls: "bg-warning/10 text-warning" },
    high: { label: "🔴 Alta", cls: "bg-destructive/10 text-destructive" },
  } as const;
  const v = map[level];
  return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${v.cls}`}>{v.label}</span>;
}

export function BetSlipPanel() {
  const { picks, open, setOpen, removePick, clear, setOdds } = useBetSlip();
  const math = computeSlip(picks);

  return (
    <TooltipProvider delayDuration={150}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
            aria-label="Abrir combinada"
          >
            <Layers className="h-4 w-4" />
            Combinada
            {picks.length > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-[11px] font-bold text-primary">
                {picks.length}
              </span>
            )}
          </button>
        </SheetTrigger>

        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border bg-card/95 px-5 py-4">
            <SheetTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Constructor de combinadas
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-3 p-5">
            {picks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Pulsa "Añadir a combinada" en cualquier predicción para empezar.
              </p>
            ) : (
              picks.map((p) => (
                <div key={p.key} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                        {p.matchLabel} · {p.sectionTitle}
                      </div>
                      <div className="mt-1 truncate text-sm font-medium">{p.pickLabel}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                          {p.probability}%
                        </span>
                        <span>({p.sampleSource === "last10" ? "L10" : "L5"})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removePick(p.key)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Quitar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-[11px] text-muted-foreground">Cuota</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="1.85"
                      value={p.odds ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setOdds(p.key, v ? Number(v) : undefined);
                      }}
                      className="h-7 w-24 text-xs"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {picks.length > 0 && (
            <div className="sticky bottom-0 space-y-2 border-t border-border bg-card/95 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Probabilidad matemática</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground" aria-label="Ayuda">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      La probabilidad matemática asume independencia total entre mercados. La probabilidad corregida intenta compensar relaciones estadísticas entre selecciones para ofrecer una estimación más realista.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-semibold tabular-nums">{math.pMath.toFixed(2)}%</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Probabilidad corregida</span>
                <span className="font-semibold tabular-nums text-primary">{math.pCorrected.toFixed(2)}%</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Correlación · penalización</span>
                <div className="flex items-center gap-1.5">
                  {levelBadge(math.level)}
                  <span className="tabular-nums">−{(math.factor * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cuota mínima rentable</span>
                <span className="font-semibold tabular-nums">{math.minOdds.toFixed(2)}</span>
              </div>

              {math.totalOdds !== undefined && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cuota total combinada</span>
                    <span className="font-semibold tabular-nums">{math.totalOdds.toFixed(2)}</span>
                  </div>
                  <div className={`flex items-center justify-center rounded-md py-2 text-sm font-semibold ${
                    math.isValueBet ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}>
                    {math.isValueBet ? "🟢 Value Bet" : "🔴 Sin valor"}
                  </div>
                </>
              )}

              <Button variant="outline" size="sm" className="w-full" onClick={clear}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Vaciar combinada
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
