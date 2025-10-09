# bSTr IDS Tool

- IDS editor with import/export (XML) and validation stub.
- API routes:
  - `GET /api/bsdd/search?term=...` – proxy to bSDD search.
  - `POST /api/validate` – attempts validation via Python IfcOpenShell IDS.

## Running locally

```
npm run dev
```

## Samples

- `public/samples/sample.ids.xml` – minimal IDS example.
- IFC: bring your own `.ifc` file to test validation.

## Design System

Wrapper components are under `src/components/ds/*`. Swap these to your iob_design_system components when available.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Validation prerequisites (Python)

The `/api/validate` route spawns a local Python to run the IDS validator from IfcTester. If you see an error like:

- `IfcTester IDS not available`
- `cannot import name 'ids' from 'ifctester'` (or similar)

then either the API is picking up a different Python than the one you installed packages into, or `ifctester` is missing.

Do this once locally:

1) Point the app to your exact Python executable by adding a `.env.local` next to this README with:

```
PYTHON=C:\\Users\\<you>\\AppData\\Local\\Programs\\Python\\Python312\\python.exe
```

2) Ensure `ifcopenshell` and `ifctester` are installed:

```
"%PYTHON%" -m pip install -U ifcopenshell ifctester
```

On Windows PowerShell, you can test with:

```
& $Env:PYTHON -c "import importlib, ifcopenshell; importlib.import_module('ifctester.ids'); print('IfcTester IDS OK; IfcOpenShell', ifcopenshell.__version__)"
```

If the import fails, install/upgrade and retry:

```
& $Env:PYTHON -m pip install --upgrade ifcopenshell ifctester
```

Finally, restart `npm run dev` so Next.js picks up the new env and packages.
