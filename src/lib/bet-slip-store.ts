import { create } from "zustand";
import { computeCorrelationFactor, type CorrelationLevel } from "./correlations";
import type { CorrelationTag } from "./mock-data";

export interface SlipPick {
  /** Clave única (match + section + label) */
  key: string;
  matchId: string;
  matchLabel: string;
  sectionTitle: string;
  pickLabel: string;
  /** Probabilidad usada (default last10) en %. */
  probability: number;
  /** Origen: "last5" | "last10" */
  sampleSource: "last5" | "last10";
  correlationTag?: CorrelationTag;
  /** Cuota real introducida por el usuario. */
  odds?: number;
}

interface BetSlipState {
  open: boolean;
  picks: SlipPick[];
  setOpen: (v: boolean) => void;
  toggle: () => void;
  addPick: (p: SlipPick) => void;
  removePick: (key: string) => void;
  clear: () => void;
  setOdds: (key: string, odds: number | undefined) => void;
  has: (key: string) => boolean;
}

export const useBetSlip = create<BetSlipState>((set, get) => ({
  open: false,
  picks: [],
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
  addPick: (p) =>
    set((s) => (s.picks.find((x) => x.key === p.key) ? s : { picks: [...s.picks, p], open: true })),
  removePick: (key) => set((s) => ({ picks: s.picks.filter((p) => p.key !== key) })),
  clear: () => set({ picks: [] }),
  setOdds: (key, odds) =>
    set((s) => ({ picks: s.picks.map((p) => (p.key === key ? { ...p, odds } : p)) })),
  has: (key) => !!get().picks.find((p) => p.key === key),
}));

export interface SlipMath {
  pMath: number;
  pCorrected: number;
  factor: number;
  level: CorrelationLevel;
  minOdds: number;
  totalOdds?: number;
  isValueBet?: boolean;
}

export function computeSlip(picks: SlipPick[]): SlipMath {
  if (picks.length === 0) {
    return { pMath: 0, pCorrected: 0, factor: 0, level: "low", minOdds: 0 };
  }
  const pMath = picks.reduce((acc, p) => acc * (p.probability / 100), 1);
  const { factor, level } = computeCorrelationFactor(picks.map((p) => p.correlationTag));
  const pCorrected = pMath * (1 - factor);
  const minOdds = pCorrected > 0 ? 1 / pCorrected : 0;
  const allOdds = picks.every((p) => p.odds && p.odds > 1);
  const totalOdds = allOdds ? picks.reduce((acc, p) => acc * (p.odds as number), 1) : undefined;
  const isValueBet = totalOdds !== undefined ? pCorrected * totalOdds > 1 : undefined;
  return {
    pMath: pMath * 100,
    pCorrected: pCorrected * 100,
    factor,
    level,
    minOdds,
    totalOdds,
    isValueBet,
  };
}
