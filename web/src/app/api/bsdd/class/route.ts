import { NextRequest } from "next/server";
import { BSDD_TRANSPORT } from "@/lib/bsdd/provider";
import { GraphqlBsddProvider } from "@/lib/bsdd/providers/graphql";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uri = searchParams.get("uri") || searchParams.get("Uri") || "";
  if (!uri) return Response.json({ error: "Missing uri" }, { status: 400 });

  try {
    if (BSDD_TRANSPORT === "graphql") {
      const provider = new GraphqlBsddProvider();
      const cls = await provider.getClass(uri);
      if (!cls) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json(cls, { status: 200 });
    }

    // Fallback to REST
    const url = new URL("https://api.bsdd.buildingsmart.org/api/Class/v1");
    url.searchParams.set("Uri", uri);
    const r = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!r.ok) return Response.json({ error: "bSDD upstream error", status: r.status }, { status: 502 });
    const data = await r.json();
    return Response.json(data, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

