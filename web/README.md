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
