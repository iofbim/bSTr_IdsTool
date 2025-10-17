import { NextRequest } from "next/server";
import { gqlFetch } from "@/lib/bsdd/graphqlClient";

const IFC43 = "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3";

export async function GET(_req: NextRequest) {
  try {
    const query = `query ($uri: String!) {
      dictionary(uri: $uri) {
        uri
        classSearch(languageCode: "EN") {
          code
          name
          uri
        }
      }
    }`;
    const data = await gqlFetch<{ dictionary?: { classSearch?: { code?: string; name?: string; uri?: string }[] } }>({
      query,
      variables: { uri: IFC43 },
    });
    const arr = data?.dictionary?.classSearch || [];
    const names = Array.from(
      new Set(
        arr
          .map((c) => (c.code || c.name || "").toString().trim())
          .filter(Boolean)
      )
    ).sort();
    return Response.json({ classes: names }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}


