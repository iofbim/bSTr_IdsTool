"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchLibraries, searchClassesWithTotal } from "@/lib/bsdd/api";
import type { Library, BsddClass } from "@/lib/bsdd/types";

export function useBsddLibraries(includeTest: boolean) {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchLibraries(includeTest)
      .then((libs) => {
        if (mounted) setLibraries(libs);
      })
      .catch((e: unknown) => {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [includeTest]);

  return { libraries, loading, error };
}

export function useBsddClassSearch(term: string, dicts: string[], limit = 20, debounceMs = 250) {
  const [results, setResults] = useState<BsddClass[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [mode, setMode] = useState<"rest" | "graphql" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = useMemo(() => `${term}|${dicts.join(";")}|${limit}`, [term, dicts, limit]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!term || term.trim().length < 2) {
      setResults([]);
      setTotal(null);
      setMode(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const resp = await searchClassesWithTotal(term.trim(), dicts, limit);
        setResults(resp.results);
        setTotal(resp.total ?? null);
        setMode(resp.mode ?? null);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, debounceMs, term, dicts]);

  return { results, total, mode, loading, error };
}
