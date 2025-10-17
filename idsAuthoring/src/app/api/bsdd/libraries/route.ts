import { NextRequest } from "next/server";

type Library = {
  id: string;
  name: string;
  code?: string;
  version?: string;
};

export async function GET(req: NextRequest) {
  // Always include pinned IFC4.3 dictionary entry via its namespace URI
  const pinnedIfc = {
    id: "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3",
    name: "IFC 4.3 (bSDD)",
    code: "IFC4.3",
    version: "4.3",
  } satisfies Library;

  // Use official bSDD Dictionaries API (OpenAPI v1) per SwaggerHub spec
  // GET /api/Dictionary/v1 with optional Offset/Limit
  try {
    const { searchParams } = new URL(req.url);
    const includeTest = /^(1|true|yes)$/i.test(searchParams.get("includeTest") || "");
    const base = new URL("https://api.bsdd.buildingsmart.org/api/Dictionary/v1");
    base.searchParams.set("Limit", "200");
    if (includeTest) base.searchParams.set("IncludeTestDictionaries", "true");
    const r = await fetch(base.toString(), { next: { revalidate: 3600 } });
    if (r.ok) {
      const data = (await r.json()) as { dictionaries?: unknown };
      const arr = Array.isArray((data as any).dictionaries) ? (data as any).dictionaries as unknown[] : [];
      const libs: Library[] = arr.map((raw) => {
        const d = raw as Record<string, unknown>;
        const uri = String(d["uri"] || "");
        const code = (d["code"] as string) || undefined;
        const version = (d["version"] as string) || undefined;
        const name = String(d["name"] || code || "Dictionary");
        return {
          id: uri || `${code || ""}:${version || ""}`,
          name: version && name ? `${name} ${version}` : name,
          code,
          version,
        };
      });
      // Ensure pinned IFC4.3 is present
      const hasIfc = libs.some((l) => l.id === pinnedIfc.id || /\bifc\b/i.test(l.name));
      const out = hasIfc ? libs : [pinnedIfc, ...libs];
      return Response.json({ libraries: out });
    }
  } catch {}

  // Fallback: return IFC as default, always-on
  const fallback: Library[] = [pinnedIfc];
  return Response.json({ libraries: fallback, fallback: true }, { status: 200 });
}
