"use client";

import { useEffect, useState } from "react";
import type { IfcPredefMap } from "@/lib/ifc/catalog";
import { loadIfcPredefsFiltered } from "@/lib/ifc/catalog";

export function useIfcCatalog() {
  const [classes, setClasses] = useState<string[] | null>(null);
  const [predefs, setPredefs] = useState<IfcPredefMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    loadIfcPredefsFiltered()
      .then(({ classes, predefs }) => {
        if (!mounted) return;
        setClasses(classes);
        setPredefs(predefs);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return { classes, predefs, loading, error };
}

