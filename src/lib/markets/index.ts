// Punto de entrada del módulo de mercados.
// Todos los mercados se derivan desde el engine (fuente única de verdad)
// más Poisson como helper matemático para Over/Under.

export { buildFootballPredictions } from "./football";
export { buildTennisPredictions } from "./tennis";
