# Agent Guide (idsAuthoring)

Scope: applies to the `idsAuthoring` app only.

## Purpose

Author and validate IDS (Information Delivery Specification) documents with a standardized UI powered by the iofbim design system.

## Current State (Refactor In Progress)

- Introduced `IdsContext` for shared state:
  - File: `src/contexts/IdsContext.tsx`
  - Centralizes IDS root data, bSDD library selections, IFC catalogs, and Import/Export/Validate flows.
- App provider wiring:
  - File: `src/app/layout.tsx` wraps the app with `IdsProvider` (under `LanguageProvider`).
- Extracted top panels from `page.tsx`:
  - Header: `src/components/ids/HeaderPanel.tsx`
  - Import/Export/Validate (hosts dialogs): `src/components/ids/ImportExportPanel.tsx`
  - bSDD Libraries: `src/components/ids/BsddLibrariesPanel.tsx`
- Remaining work: the Sections/Specifications editor is still in `src/app/page.tsx`. It will be split out next into dedicated components.

## Design System Usage

- Prefer `ds` wrappers:
  - `Button`, `Input`, `Select`, `Textarea`, `Dialog`, `Panel`.
- Keep sizes consistent via `size` props (sm/md/lg) and classes (`ds-input`, `ds-btn`).
- Maintain existing visual design; refactors should not change layout/spacing without explicit request.

## Temporary Lint Relaxation

- `src/app/page.tsx` has a temporary ESLint disable header for rules:
  - `@typescript-eslint/no-explicit-any`
  - `@typescript-eslint/no-unused-vars`
  - `@next/next/no-img-element`
- This relaxation MUST be reversed after the refactor is complete. Replace `any` with concrete types, remove unused code, and switch to `next/image` where appropriate.

## Near-Term TODOs

1. Extract Sections/Specifications UI into components under `src/components/ids/`:
   - `SectionsEditor` (lists sections; add/remove)
   - `SectionCard` (title/description + spec list)
   - `SpecificationCard` (name/optionality/identifier/instructions/ifc version/description)
   - Facet components (Applicability/Requirements): Entities, Classifications, Attributes, Properties, Materials, PartOf
2. Replace remaining native inputs/selects with `ds` components to standardize sizes and spacing.
3. Type cleanup: eliminate `any` usage across app and API routes; add/fix types in `page.tsx` and extracted components; remove the temporary ESLint disables.
4. Consider lifting bSDD picker open/target state into `IdsContext` if it simplifies composition.
5. Optional: convert `<img>` to `next/image` where feasible for performance.

## Facet Alignment (ids.xsd)

- When extracting or modifying the facet blocks (Applicability and Requirements), ensure 1:1 alignment with the official IDS XSD (ids.xsd):
  - Do not add functionality that is not present in the schema.
  - Do not miss functionality that the schema supports.
- Before merging facet changes, perform a thorough check against ids.xsd to verify element/attribute names, allowed values, cardinality, and nesting.
- Capture any gaps or divergences in this AGENTS.md and resolve them before re‑enabling strict linting.

## Conventions

- Use `useIds()` inside components instead of prop-drilling IDS state and actions when possible.
- Keep functions and types colocated with context if they are shared (e.g., `newEntity`, `newProperty`).
- Keep patches focused; avoid broad changes unrelated to a task.
