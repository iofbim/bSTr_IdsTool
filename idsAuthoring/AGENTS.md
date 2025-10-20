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

## Alignment Report (Developer Guide)

This section tracks how the current implementation aligns with IDS/Documentation/ImplementersDocumentation/developer-guide.md and what remains to fully meet the scope.

### Authoring — Musts

- Valid IDS read/write: PARTIAL
  - Current export/import lives in `src/lib/ids/xml.ts` and is explicitly a "minimal mapping" that does not fully implement the official IDS 1.0 XSD. It supports both simplified and namespaced parsing helpers but round-trip, ordering, and complete coverage are not guaranteed.
  - Action: Replace/extend the XML mapping to fully align with the XSD (respect ids: namespaces, idsValue structure, xs:sequence order, optionality, instructions/identifier, all facets). Add round‑trip tests using official examples.

- No proprietary extensions: OK
  - No non-IDS fields are written to XML; UI state remains outside the saved IDS.

- No data loss on load/save: PARTIAL
  - Simplified mapping risks dropping unknown/less-used fields (e.g., restrictions in idsValue). 
  - Action: Implement lossless parsing/emission for all XSD-backed elements/attributes; include restrictions (enumeration/pattern) and preserve ordering.

- Respect xs:sequence order: UNKNOWN/PARTIAL
  - The builder emits objects in code-defined order; not verified against the exact XSD sequences.
  - Action: Align emission order to the XSD and add tests that diff element order against samples.

### Authoring — Recommended UX

- Entity IFC class: OK
  - Autocomplete from `useIfcCatalog()`; datalist in facets.

- Entity predefined type: OK (with free text)
  - Suggestions from `ifcPredefs[CLASS]` with datalist; users can enter custom types; behavior matches guide.

- Attribute facet guidance by entity: GAP
  - No restriction/suggestions based on nominated IFC class; no datatype guidance.
  - Action: Use `lib/ifc/catalog` attribute metadata to suggest valid attribute names and default datatypes.

- Property facet guidance by entity/predef: GAP
  - No Pset/Qto recommendation/restriction yet; datatypes not inferred.
  - Action: Integrate a Pset source (bSDD or local JSON of Pset/Qto definitions). Suggest valid property sets/names for standard sets; infer default datatypes (IfcLabel/IfcInteger/IfcReal) from user value type.

- Unit conversion tools: GAP
  - Action: Add unit selection and conversion helpers for value inputs where units apply.

- Classification suggestions: PARTIAL/OK
  - bSDD search is integrated (proxy routes) and UI pickers exist; consider preloading standard systems list for UX.

- Material facet recommendations: GAP
  - No recommended categories list (concrete, steel, aluminium, etc.).
  - Action: Provide a datalist of recommended categories.

- Data type regex conformance: GAP
  - No enforcement of XML base-type regex from DataTypes.md.
  - Action: Add client-side validators for simpleValue and restriction enumerations per DataTypes.md.

### Checking — Musts

- Conformance with official IFC/IDS test suite: PARTIAL
  - UI exposes a Validate flow; server route runs IfcTester (if installed) but there is no automated test harness integration or CI validation against `TestCases`.
  - Action: Add a test command/script to run the official test suite locally (and optionally in CI), surfacing pass/fail summaries.

### Checking — Recommended

- Save auditing results as BCF-XML or connect to OpenCDE: GAP (Backlog)
  - Action: Add export-to-BCF feature (MVP: download JSON/BCF-XML of IfcTester output).

- Unsupported IFC version UX: PARTIAL
  - IFC version is captured; warn in validation if version unsupported by backend.
  - Action: Detect IfcTester/ifcopenshell support and display a targeted warning.

- Optional requirements handling: OK (delegated)
  - IfcTester handles optional/prohibited semantics; ensure UI messaging matches.

### Immediate Action Plan (Prioritized)

1) XML/XSD compliance and lossless round‑trip (High)
   - Complete namespaced mapping, idsValue support, restrictions, sequence order.
   - Add round-trip tests with official sample IDS files.

2) Test suite integration (High)
   - Script to run official `TestCases` and summarize. Wire into Validate panel.

3) Attribute/Property guidance engine (High)
   - Use IFC catalog/pset metadata to suggest and constrain inputs; infer datatypes.

4) Units support (Medium)
   - Unit pickers + conversion utilities for numeric inputs with units.

5) Material recommendations (Low)
   - Datalist with recommended categories.

6) Data type regex validation (Medium)
   - Client validators aligned with DataTypes.md.

7) Polish/tech debt (Ongoing)
   - Resolve DS type errors (`Input`, `Select`, `Panel`), improve a11y, and remove temporary lint relaxations.

### Notes on Current Implementation

- bSDD: Proxied search/class endpoints and pickers are in place for Entities and Classifications.
- Predefined types: Now free-text with datalist suggestions per guide.
- Validation: IfcTester integration via server route; gracefully warns if not installed.
- Export: Downloads `.ids` (not `.ids.xml`).
