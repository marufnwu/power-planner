# DECISIONS.md

Decisions made during development that weren't explicitly specified.

## Stack Adaptation
- **Decision:** Used React + Vite + Tailwind instead of Next.js as the project template uses Vite.
- **Reason:** The project scaffolding uses Vite. Adapted the spec to work with client-side routing (react-router-dom) instead of App Router.

## State Management
- **Decision:** URL state uses lz-string compression with a simple `?s=<encoded>&v=1` format.
- **Reason:** Matches the spec's "full state" approach. Schema version field allows future migrations.

## Engine Architecture
- **Decision:** Engine is pure TypeScript in `/src/lib/engine/`, no React imports.
- **Reason:** Matches spec requirement. Can be unit-tested independently.

## Simulation Simplification
- **Decision:** Single-day simulation with time-series chart rather than full multi-day convergence in MVP.
- **Reason:** Phase 2 feature. The closed-form calculations (runtime, recharge) are accurate for the MVP use case.

## Default Scenario
- **Decision:** SAKO E-SUN 1.2KVA with `verified: false` and editable defaults. 3 fans + 3 lights + router as default loads.
- **Reason:** Matches spec §5.1. No invented datasheet values.

## Currency
- **Decision:** BDT (৳) as default currency, but all values are editable.
- **Reason:** Bangladesh-first as specified. Users can change currency in project state.

## Warning System
- **Decision:** Implemented critical/warn/info severity levels with actionable fix suggestions.
- **Reason:** Matches spec §7. Every warning has a `suggestedFix`.

## Battery Comparison
- **Decision:** Show all 4 battery options side by side in results (LiFePO4 100/150/200Ah + Tubular 200Ah).
- **Reason:** Matches spec §5.1 comparison requirement.

## Learn Hub
- **Decision:** 10 articles covering core topics. Expandable accordion UI.
- **Reason:** MVP scope. Spec mentions ~20 for Phase 2/3.

## No Arbitrary Scores
- **Decision:** No star ratings, no "best choice" badges, no scoring algorithm.
- **Reason:** Explicitly required by spec §0.3 and §0.6.

## Unverified Defaults
- **Decision:** Every catalog item has `verified: false` and shows a yellow badge.
- **Reason:** Required by spec §0.3. Nothing is presented as fact without datasheet verification.

## Chart Library
- **Decision:** Used Recharts for the SoC timeline chart.
- **Reason:** Already available in project dependencies. Spec says "switch to uPlot only if performance requires."

## Mobile-first
- **Decision:** Sticky summary bar on mobile, responsive grid layouts, touch-friendly inputs.
- **Reason:** Spec §1 requires mobile-first.

## Print/PDF
- **Decision:** CSS print stylesheet + `window.print()`. No server-side PDF in MVP.
- **Reason:** Matches Phase 1 spec. Server-side PDF is Phase 3.

## i18n
- **Decision:** English only in MVP. Structure supports Bangla later.
- **Reason:** Phase 3 feature. The `locale` field exists in Project type for future use.
