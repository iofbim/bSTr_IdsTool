import { NextRequest } from "next/server";

// bSDD search proxy to avoid CORS issues. Uses async/await and returns a trimmed response.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const term = searchParams.get("term") || "";
  const limit = Number(searchParams.get("limit") || 10);

  if (!term || term.length < 2) {
    return Response.json({ results: [] }, { status: 200 });
  }

  try {
    // Public bSDD v3 API search endpoint; adjust parameters as needed
    const url = new URL("https://api.bsdd.buildingsmart.org/api/Definitions/Search");
    url.searchParams.set("Query", term);
    url.searchParams.set("PageSize", String(limit));

    const r = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!r.ok) {
      return Response.json({ error: "bSDD upstream error", status: r.status }, { status: 502 });
    }
    const data = (await r.json()) as { results?: unknown; Results?: unknown };
    const res = Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.Results)
      ? (data.Results as unknown[])
      : [];
    return Response.json({ results: res });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
