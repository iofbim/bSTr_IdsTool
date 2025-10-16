import { NextRequest } from "next/server";

// Proxy to bSDD REST: /api/Class/Properties/v1
// Params we accept and forward (see bSDD OpenAPI):
// - ClassUri (required)
// - PropertySet (optional)
// - PropertyCode (optional)
// - SearchText (optional; cannot be used with PropertySet or PropertyCode)
// - Offset, Limit (optional)
// - languageCode (optional)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classUri = searchParams.get("classUri") || searchParams.get("ClassUri") || "";
  if (!classUri) return Response.json({ error: "Missing ClassUri" }, { status: 400 });

  const url = new URL("https://api.bsdd.buildingsmart.org/api/Class/Properties/v1");
  url.searchParams.set("ClassUri", classUri);
  const passthrough = [
    "PropertySet",
    "PropertyCode",
    "SearchText",
    "Offset",
    "Limit",
    "languageCode",
  ];
  for (const key of passthrough) {
    const v = searchParams.get(key) || searchParams.get(key.toLowerCase());
    if (v) url.searchParams.set(key, v);
  }

  try {
    const r = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!r.ok) {
      return Response.json({ error: "bSDD upstream error", status: r.status }, { status: 502 });
    }
    const data = await r.json();
    return Response.json(data, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
