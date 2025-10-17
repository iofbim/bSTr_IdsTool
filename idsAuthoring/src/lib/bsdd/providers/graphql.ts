// References
// - bSDD/Documentation/bSDD and GraphQL.md (GraphQL endpoints, examples)
// - bSDD/Documentation/bSDD API.md (REST parity and concepts)
import { gqlFetch } from "../graphqlClient";
import type { BsddProvider } from "../provider";
import type { Library, BsddClass, BsddClassDetail } from "../types";
import { BSDD_LANG } from "@/config/bsdd";

function extractDictionaryUriFromClassUri(classUri: string): string | null {
  try {
    const u = new URL(classUri);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === "class");
    if (idx > 0) {
      const base = [u.protocol.replace(":", ""), "", u.host, ...parts.slice(0, idx)].join("/");
      return base;
    }
  } catch {}
  return null;
}

export class GraphqlBsddProvider implements BsddProvider {
  async fetchLibraries(includeTest: boolean): Promise<Library[]> {
    // The public doc doesn't explicitly expose a dictionaries list query.
    // Fall back to REST for now by returning an empty list; callers can merge with REST if desired.
    return [];
  }

  async searchClasses(term: string, dicts: string[], limit = 20): Promise<BsddClass[]> {
    const trimmed = (term || "").trim();
    if (!trimmed || trimmed.length < 2) return [];
    if (!dicts || dicts.length === 0) {
      // GraphQL examples search within a dictionary; without dicts, skip.
      return [];
    }

    // Build a single operation with multiple aliased dictionary queries
    // to search each dictionary in one roundtrip.
    // Per bSDD/Documentation/bSDD and GraphQL.md, dictionary.classSearch requires searchText and languageCode.
    // Introspection on test endpoint confirms NON_NULL args for both (see languages list for valid codes).
    const fields: string[] = [];
    const variables: Record<string, unknown> = {
      searchText: trimmed,
      languageCode: BSDD_LANG,
    };
    dicts.forEach((uri, i) => {
      const alias = `d${i}`;
      const varName = `u${i}`;
      (variables as any)[varName] = uri;
      fields.push(`
        ${alias}: dictionary(uri: $${varName}) {
          uri
          name
          classSearch(searchText: $searchText, languageCode: $languageCode) {
            name
            code
            uri
          }
        }
      `);
    });

    // Query built with aliases to fetch from multiple dictionaries in one POST (GET not supported).
    const query = `query Search($searchText: String!, $languageCode: String!, ${dicts
      .map((_, i) => `$u${i}: String!`)
      .join(", ")}) {
      ${fields.join("\n")}
    }`;

    const data = await gqlFetch<Record<string, { uri: string; name?: string; classSearch: any[] }>>({
      query,
      variables,
    });

    const results: BsddClass[] = [];
    for (const key of Object.keys(data || {})) {
      const block = (data as any)[key];
      const arr = Array.isArray(block?.classSearch) ? block.classSearch : [];
      for (const r of arr) {
        results.push({
          name: String(r.name || r.code || "Class"),
          referenceCode: r.code || undefined,
          uri: String(r.uri || ""),
          dictionaryUri: String(block?.uri || ""),
          dictionaryName: block?.name,
        });
      }
    }
        const termLc = trimmed.toLowerCase();
    const filtered = results.filter((it) => {
      const nameLc = (it.name || '').toLowerCase();
      const codeLc = (it.referenceCode || '').toLowerCase();
      if (codeLc.startsWith('pset_') || codeLc.startsWith('qto_')) return false;
      if (nameLc.startsWith('property set') || nameLc.startsWith('quantity set')) return false;
      if (!(nameLc.includes(termLc) || codeLc.includes(termLc))) return false;
      return true;
    });

    const score = (it: BsddClass) => {
      const nameLc = (it.name || '').toLowerCase();
      const codeLc = (it.referenceCode || '').toLowerCase();
      let s = 0;
      if (codeLc === termLc) s += 1000;
      if (nameLc === termLc) s += 900;
      if (codeLc.startsWith(termLc)) s += 500;
      if (nameLc.startsWith(termLc)) s += 400;
      if (codeLc.includes(termLc)) s += 200;
      if (nameLc.includes(termLc)) s += 100;
      if (codeLc.startsWith('ifc')) s += 50; // prefer IFC entities
      return s;
    };

    filtered.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
    return filtered.slice(0, limit);
  }

  async getClass(uri: string): Promise<BsddClassDetail | null> {
    const dictUri = extractDictionaryUriFromClassUri(uri);
    if (!dictUri) return null;
    // Query built with aliases to fetch from multiple dictionaries in one POST (GET not supported).
    const query = `query ($dictionaryUri: String!, $uri: String!, $languageCode: String!) {
      dictionary(uri: $dictionaryUri) {
        uri
        class(uri: $uri, languageCode: $languageCode, includeChildren: false) {
          name
          code
          uri
        }
      }
    }`;
    const data = await gqlFetch<{ dictionary?: { class?: any } }>({
      query,
      variables: { dictionaryUri: dictUri, uri, languageCode: BSDD_LANG },
    });
    const c = data?.dictionary?.class;
    if (!c) return null;
    return {
      name: String(c.name || c.code || "Class"),
      referenceCode: c.code || undefined,
      uri: String(c.uri || uri),
      dictionaryUri: dictUri,
      description: undefined,
    };
  }
}


