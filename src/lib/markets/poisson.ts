// Poisson helpers: SOLO utilidades matemáticas para derivar líneas Over/Under
// a partir de un λ esperado. No es un sistema de probabilidad independiente:
// los λ que consume vienen siempre de los inputs ya validados por el engine.

import type { SampleProb } from "../mock-data";

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

export const poissonPmf = (k: number, lambda: number) =>
  (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);

export const overProb = (line: number, lambda: number) => {
  const cutoff = Math.floor(line);
  let cdf = 0;
  for (let k = 0; k <= cutoff; k++) cdf += poissonPmf(k, lambda);
  return Math.max(0, Math.min(1, 1 - cdf));
};

export const pct = (p: number) => Math.round(p * 100);

export const sample = (p5: number, p10: number): SampleProb => ({
  last5: pct(p5),
  last10: pct(p10),
});

export const blend = (forVal: number, againstVal: number) => (forVal + againstVal) / 2;
