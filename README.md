# bSTr IDS Tool (IDS Editor)

Web-based IDS editor with bSDD-assisted authoring.

- Import/export IDS XML; validation stub via IfcTester (Python).
- bSDD integration (REST by default; GraphQL optional):
  - Entity and Classification facets have class pickers.
  - Attribute facet: pick a class, then select a property to fill `name`, `datatype`, `uri`.
  - Property facet: pick a class, select a Property Set, then a property to fill `propertySet`, `name`, `datatype`, `uri`. If a class exposes no sets, a flat property list is shown.

## Running locally

```
cd web
npm install
npm run dev
```

Open http://localhost:3000

## API routes

- `GET /api/bsdd/search?term=...&dict=...&limit=...` — class search (REST default; GraphQL optional)
- `GET /api/bsdd/class?Uri=...` — class detail (REST; GraphQL optional)
- `GET /api/bsdd/class/properties?ClassUri=...` — class properties (optional `PropertySet`, `SearchText`, `languageCode`)
- `POST /api/validate` — runs IfcTester (IfcOpenShell) to validate against IDS XML

## App configuration (.env.local)

```
# Transport (rest | graphql)
BSDD_TRANSPORT=rest

# GraphQL (optional; POST only)
# BSDD_GQL_URL=https://test.bsdd.buildingsmart.org/graphql
# BSDD_GQL_URL=https://api.bsdd.buildingsmart.org/graphqls/
# BSDD_GQL_TOKEN=...

# Client-visible knobs
NEXT_PUBLIC_BSDD_MAX_LIMIT=500
NEXT_PUBLIC_BSDD_PAGE_SIZE=50
NEXT_PUBLIC_BSDD_LANG=EN

# IfcTester validation (set your Python path)
# PYTHON=C:\Users\<you>\AppData\Local\Programs\Python\Python312\python.exe
```

Notes:
- GraphQL `dictionary.classSearch` requires `languageCode`.
- REST `Class/Properties` supports `languageCode`.

## Samples

- `public/samples/sample.ids.xml` — minimal IDS example.
- IFC: bring your own `.ifc` file to test validation.

## Validation prerequisites (Python)

The `/api/validate` route uses IfcTester (IfcOpenShell). If imports fail, ensure the correct Python and packages:

```
"%PYTHON%" -m pip install -U ifcopenshell ifctester
```

On Windows PowerShell, test with:

```
& $Env:PYTHON -c "import importlib, ifcopenshell; importlib.import_module('ifctester.ids'); print('IfcTester IDS OK; IfcOpenShell', ifcopenshell.__version__)"
```

Restart `npm run dev` after adjusting `.env.local` or installing packages.

## bSDD GraphQL (optional)

This app can query bSDD via REST (default) or GraphQL for class search/details.

- Configure transport via `.env.local`:

```
BSDD_TRANSPORT=graphql
# Optional: test/prod endpoints and token
# BSDD_GQL_URL=https://test.bsdd.buildingsmart.org/graphql
# BSDD_GQL_URL=https://api.bsdd.buildingsmart.org/graphqls/
# BSDD_GQL_TOKEN=...
```

- Interfaces live under `src/lib/bsdd/*`:
  - `providers/graphql.ts` — GraphQL provider (search per dictionary, class detail)
  - `graphqlClient.ts` — minimal fetch-based GraphQL client
  - `provider.ts` — shared interface

- Route `app/api/bsdd/search` uses GraphQL when `BSDD_TRANSPORT=graphql` and dictionaries are provided; otherwise falls back to REST.

## Dev References

- bSDD (official upstream in repo root):
  - `bSDD/Documentation/bSDD API.md` — REST endpoints and concepts
  - `bSDD/Documentation/bSDD and GraphQL.md` — GraphQL endpoints and examples
  - `bSDD/Documentation/bSDD OpenAPI.yaml` — OpenAPI for REST

- IDS (official upstream in repo root):
  - `IDS/Schema/ids.xsd` — IDS 1.0 XML Schema
  - `IDS/Documentation/ImplementersDocumentation` — examples and test cases

## Design System

Wrapper components are under `src/components/ds/*`. Swap these to your design system when available.
