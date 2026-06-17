# Plan de Mejoras — Análisis Avanzado de Partidos

Esta es una iteración muy grande. La divido en **5 fases** para entregar valor incremental y que puedas validar paso a paso. Todo seguirá funcionando sobre los datos mock actuales (estructura preparada para enchufar API-Sports más adelante sin tocar la UI).

---

## Fase 1 — Refactor base de datos y muestras 5/10

**Objetivo:** que cada porcentaje muestre claramente origen (Últimos 5 / Últimos 10) y eliminar la muestra de 15.

- `src/lib/mock-data.ts`:
  - Sustituir `last5` / `last15` por `last5` / `last10` en `StatsBlock` (for/against).
  - Generar las medias 5 y 10 para ambos equipos en fútbol y para ambos jugadores en tenis.
  - Cada predicción Over/Under se calcula **dos veces** (5 y 10) y se almacenan ambos %.
- Tipos nuevos: `SampleProb = { last5: number; last10: number }`.

## Fase 2 — Fútbol: mercados + módulo Árbitro

- Mercados ampliados: goles (0.5–3.5), BTTS, tarjetas, córners, remates totales, remates a puerta, ataques peligrosos, posesión. Cada uno con desglose Local/Visitante × (Últimos 5 / Últimos 10).
- **Nuevo módulo Árbitro** en `match-detail.tsx`:
  - Datos del árbitro (mock por ahora): tarjetas amarillas, rojas y faltas en últimos 5/10 arbitrajes (total + media).
  - Comparación con la media de la competición → badge de desviación % (🔴/🟡/🟢).
  - Perfil automático: Permisivo / Normal / Tarjetero / Estricto según umbrales.
  - El factor árbitro pondera las predicciones de tarjetas y faltas (peso configurable, ~30%).

## Fase 3 — Constructor de Combinadas (fútbol y tenis)

- Estado global con Zustand: `useBetSlipStore` (selecciones, addPick, removePick, clear).
- Botón **"Añadir a combinada"** en cada fila de predicción.
- Panel lateral flotante (`Sheet` de shadcn) siempre accesible con badge contador.
- Cálculos en tiempo real:
  - **P matemática** = ∏ pᵢ
  - **Correlación**: tabla de pares de mercados con penalización (alta 10–15%, media 5–10%, baja 0–2%). Factor total = suma capada al 30%.
  - **P corregida** = P × (1 − factorCorrelación)
  - **Cuota mínima rentable** = 1 / Pcorregida
  - Input manual de cuota real → **Value Bet** si Pcorregida × cuota > 1.
  - Indicador correlación 🟢/🟡/🔴 + icono de ayuda con tooltip explicativo.

## Fase 4 — Tenis ampliado

- Estructura `TennisPlayerStats` con muestras 5/10 **generales** + por superficie (Hard/Clay/Grass) cuando exista volumen.
- Mercados: Aces (3.5/5.5/8.5...), Dobles faltas, Breaks realizados/concedidos, Juegos totales (18.5–26.5), Juegos por jugador, Sets totales, "Gana al menos un set", Resultado exacto (2-0, 2-1, 3-0, 3-1, 3-2), Tie-break.
- Estadísticas avanzadas servicio: % 1er servicio, puntos ganados 1º/2º, juegos saque ganados, BP salvados/convertidos.
- H2H general + por superficie. Forma reciente, fatiga (minutos, partidos 7/14 días, sets). Ranking propio + medio rivales + rendimiento Top 10/20/50.
- Mismas correlaciones específicas de tenis (aces↔juegos saque, breaks↔sets, etc.).

## Fase 5 — Ranking automático e Índice de Confianza

- **Índice de Confianza global (0-100)** por partido: combina forma, datos disponibles, árbitro (fútbol), superficie/H2H (tenis), correlación.
- **Top 5 apuestas individuales** del partido ordenadas por (Pcorregida × valor × confianza).
- **Top 5 combinadas sugeridas** generadas heurísticamente combinando mercados de baja correlación con P > 75%.
- Visible en una pestaña "Oportunidades" en `match-detail.tsx`.

## Pospuesto (Fase 6 — requiere backend)

El sistema de **histórico, validación y aprendizaje** (puntos 12 y 26) requiere Lovable Cloud para persistir resultados reales y recalibrar correlaciones. Lo dejo fuera de esta tanda y lo activo cuando me lo confirmes — implica habilitar la base de datos.

---

## Detalles técnicos

- Archivos nuevos: `src/lib/correlations.ts`, `src/lib/bet-slip-store.ts`, `src/lib/referee-data.ts`, `src/components/bet-slip-panel.tsx`, `src/components/referee-module.tsx`, `src/components/opportunities-tab.tsx`.
- Editados: `src/lib/mock-data.ts` (refactor profundo), `src/components/match-detail.tsx`, `src/components/match-card.tsx`, `src/routes/__root.tsx` (montar BetSlipPanel global).
- Dependencias nuevas: `zustand` para el estado del slip.
- Toda la UI en español, acordeones existentes se mantienen.

---

## Preguntas antes de arrancar

1. ¿Voy fase a fase parando para que valides cada una, o tiro las 5 del tirón?
2. ¿Activo Lovable Cloud ahora para preparar la Fase 6 (histórico) o lo dejamos para después?
3. ¿Te vale que el árbitro siga con datos mock realistas hasta que conectemos API-Sports, o prefieres dejar la sección vacía con placeholder hasta tener API?