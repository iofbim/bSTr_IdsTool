import { NextRequest } from "next/server";

type Library = {
  id: string;
  name: string;
  code?: string;
  version?: string;
};

export async function GET(_req: NextRequest) {
  const candidates = [
    // Guessed endpoints; bSDD API versions sometimes vary. We try several.
    "https://api.bsdd.buildingsmart.org/api/Dictionaries/Search?PageSize=200",
    "https://api.bsdd.buildingsmart.org/api/Dictionary/Search?PageSize=200",
    "https://api.bsdd.buildingsmart.org/api/Dictionary/v3/Search?PageSize=200",
  ];

  for (const url of candidates) {
    try {
      const r = await fetch(url, { next: { revalidate: 3600 } });
      if (!r.ok) continue;
      const data = (await r.json()) as unknown;
      const d: Record<string, unknown> = (data ?? {}) as Record<string, unknown>;
      const items: unknown[] = Array.isArray(d["results"])
        ? (d["results"] as unknown[])
        : Array.isArray(d["Results"])
        ? (d["Results"] as unknown[])
        : Array.isArray(data as unknown[])
        ? (data as unknown[])
        : [];
      if (!items.length) continue;
      const libs: Library[] = items.map((raw) => {
        const d = raw as Record<string, unknown>;
        return ({
          id: String((d["id"] ?? d["guid"] ?? d["Id"] ?? d["Guid"] ?? d["code"] ?? d["Code"] ?? "") as string),
          name: String((d["name"] ?? d["Name"] ?? d["title"] ?? d["Title"] ?? "Unnamed") as string),
          code: (d["code"] ?? d["Code"]) as string | undefined,
          version: (d["version"] ?? d["Version"]) as string | undefined,
        });
      });
      return Response.json({ libraries: libs });
    } catch {}
  }

  // Fallback: return IFC as default, always-on
  const fallback: Library[] = [
    { id: "ifc", name: "IFC (default)", code: "IFC", version: "" },
  ];
  return Response.json({ libraries: fallback, fallback: true }, { status: 200 });
}
