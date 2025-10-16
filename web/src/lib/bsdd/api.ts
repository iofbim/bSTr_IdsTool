"use client";

import type { Library, BsddClass, BsddClassDetail } from "./types";

export async function fetchLibraries(includeTest: boolean): Promise<Library[]> {
  const res = await fetch(`/api/bsdd/libraries?includeTest=${includeTest ? "1" : "0"}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { libraries?: Library[] };
  return data.libraries ?? [];
}

export async function searchClasses(
  term: string,
  dicts: string[],
  limit = 20
): Promise<BsddClass[]> {
  if (!term || term.length < 2) return [];
  const params = new URLSearchParams({ term, limit: String(limit) });
  for (const d of dicts) params.append("dict", d);
  const res = await fetch(`/api/bsdd/search?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: any[] };
  return (data.results || []).map((r) => ({
    name: String(r.name || r.referenceCode || "Class"),
    referenceCode: r.referenceCode,
    uri: String(r.uri || ""),
    dictionaryUri: r.dictionaryUri,
    dictionaryName: r.dictionaryName,
  }));
}

export type SearchResponse = {
  results: BsddClass[];
  total: number | null;
  mode: "rest" | "graphql" | null;
};

export async function searchClassesWithTotal(
  term: string,
  dicts: string[],
  limit = 20
): Promise<SearchResponse> {
  if (!term || term.length < 2) return { results: [], total: null, mode: null };
  const params = new URLSearchParams({ term, limit: String(limit) });
  for (const d of dicts) params.append("dict", d);
  const res = await fetch(`/api/bsdd/search?${params.toString()}`);
  if (!res.ok) return { results: [], total: null, mode: null };
  const data = (await res.json()) as { results?: any[]; total?: number; mode?: string };
  const results = (data.results || []).map((r) => ({
    name: String(r.name || r.referenceCode || "Class"),
    referenceCode: r.referenceCode,
    uri: String(r.uri || ""),
    dictionaryUri: r.dictionaryUri,
    dictionaryName: r.dictionaryName,
  }));
  const total = typeof data.total === "number" ? data.total : null;
  const mode = data.mode === "graphql" ? "graphql" : data.mode === "rest" ? "rest" : null;
  return { results, total, mode };
}

export async function getClass(uri: string): Promise<BsddClassDetail | null> {
  if (!uri) return null;
  const params = new URLSearchParams({ Uri: uri });
  const res = await fetch(`/api/bsdd/class?${params.toString()}`);
  if (!res.ok) return null;
  try {
    const obj = (await res.json()) as any;
    return {
      name: String(obj.name || obj.referenceCode || "Class"),
      referenceCode: obj.referenceCode,
      uri: String(obj.uri || uri),
      dictionaryUri: obj.dictionaryUri,
      description: obj.description,
    };
  } catch {
    return null;
  }
}

export type ClassPropertyBinding = {
  propertySet?: string;
  propertyName?: string;
  propertyCode?: string;
  propertyUri?: string;
  dataType?: string;
  allowedValues?: { code?: string; value?: string }[];
  units?: string[];
};

export async function fetchClassProperties(
  classUri: string,
  opts: { propertySet?: string; searchText?: string; offset?: number; limit?: number; languageCode?: string } = {}
): Promise<ClassPropertyBinding[]> {
  if (!classUri) return [];
  const params = new URLSearchParams({ classUri });
  if (opts.propertySet) params.set("PropertySet", opts.propertySet);
  if (opts.searchText) params.set("SearchText", opts.searchText);
  if (typeof opts.offset === "number") params.set("Offset", String(opts.offset));
  if (typeof opts.limit === "number") params.set("Limit", String(opts.limit));
  if (opts.languageCode) params.set("languageCode", opts.languageCode);
  const res = await fetch(`/api/bsdd/class/properties?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  // The exact contract fields vary; normalize defensively
  const list: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data?.properties) ? data.properties : Array.isArray(data) ? data : [];
  return list.map((row) => {
    const ps = row.propertySet || row.propertyset || row.pset || undefined;
    const prop = row.property || row;
    const code = prop.propertyCode || prop.code || prop.referenceCode || undefined;
    const name = prop.propertyName || prop.name || undefined;
    const uri = prop.propertyUri || prop.uri || undefined;
    const dt = prop.dataType || prop.datatype || row.dataType || undefined;
    const allowed = prop.allowedValues || row.allowedValues || [];
    const units = prop.units || row.units || undefined;
    return {
      propertySet: ps,
      propertyCode: code,
      propertyName: name,
      propertyUri: uri,
      dataType: dt,
      allowedValues: Array.isArray(allowed) ? allowed : [],
      units: Array.isArray(units) ? units : undefined,
    } as ClassPropertyBinding;
  });
}
