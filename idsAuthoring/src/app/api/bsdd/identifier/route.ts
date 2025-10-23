import { NextRequest } from "next/server";

// Temporary fallback proxy to fetch JSON for a class identifier URI
// NOTE: bSDD notes this JSON via identifier is deprecated; used here only as a fallback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uri = searchParams.get("uri") || "";
  if (!uri) return Response.json({ error: "Missing uri" }, { status: 400 });
  try {
    const r = await fetch(uri, {
      headers: { Accept: "application/json" },
      // Do not cache aggressively; allow refresh as content may change
      next: { revalidate: 60 },
    });
    if (!r.ok) return Response.json({ error: "Upstream error", status: r.status }, { status: 502 });
    const data = await r.json();
    return Response.json(data, { status: 200 });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
