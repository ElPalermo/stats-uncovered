// Trace utilities: every engine step records inputs, formula and result.

export interface TraceStep {
  label: string;
  formula: string;
  inputs: Record<string, number>;
  result: number;
}

export class TraceBuilder {
  private steps: TraceStep[] = [];

  add(step: TraceStep): number {
    this.steps.push(step);
    return step.result;
  }

  build(): TraceStep[] {
    return this.steps;
  }
}

export const round = (n: number, decimals = 4): number => {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
};
