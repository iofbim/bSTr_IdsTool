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
