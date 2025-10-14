import { NextRequest } from "next/server";
import { GraphqlBsddProvider } from "@/lib/bsdd/providers/graphql";
import { BSDD_TRANSPORT } from "@/lib/bsdd/provider";

// bSDD search proxy (per SwaggerHub v1): /api/Class/Search/v1
// Accepts query: term, limit, dict (repeatable)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const term = searchParams.get("term") || "";
  const limit = Number(searchParams.get("limit") || 10);

  if (!term || term.length < 2) {
    return Response.json({ results: [] }, { status: 200 });
  }

  try {
    // If configured for GraphQL and dictionaries are provided, use the GraphQL provider
    const dicts = searchParams.getAll("dict").filter(Boolean);
    if (BSDD_TRANSPORT === "graphql" && dicts.length) {
      const provider = new GraphqlBsddProvider();
      const results = await provider.searchClasses(term, dicts, limit);
      return Response.json({ results, total: results.length });
    }

    const url = new URL("https://api.bsdd.buildingsmart.org/api/Class/Search/v1");
    url.searchParams.set("SearchText", term);
    url.searchParams.set("Limit", String(limit));
    // Optional dictionary filters
    for (const d of dicts) {
      if (d) url.searchParams.append("DictionaryUris", d);
    }

    const r = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!r.ok) {
      return Response.json({ error: "bSDD upstream error", status: r.status }, { status: 502 });
    }
    const data = (await r.json()) as { classes?: unknown[]; totalCount?: number };
    const res = Array.isArray((data as any).classes) ? (data as any).classes : [];
    return Response.json({ results: res, total: data.totalCount ?? res.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
