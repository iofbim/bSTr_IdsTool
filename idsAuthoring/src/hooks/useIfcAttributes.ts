"use client";
import React from "react";

type IfcAttr = { name?: string; type?: string; enumValues?: string[] };

let _cache: Record<string, IfcAttr[]> | null = null;

async function loadIfcAttributesForClass(className: string): Promise<IfcAttr[]> {
  if (!className) return [];
  if (_cache) return _cache[className] || [];
  try {
    const res = await fetch("/data/ifc_classes_with_attrs_and_psetprops.json", { cache: "force-cache" });
    const json = (await res.json()) as {
      classes?: Record<string, { attributes?: { explicit?: IfcAttr[] } }>;
    };
    const map: Record<string, IfcAttr[]> = {};
    for (const [k, info] of Object.entries(json.classes || {})) {
      map[k] = (info.attributes?.explicit || []).map((a) => ({
        name: a.name,
        type: a.type,
        enumValues: Array.isArray(a.enumValues) ? a.enumValues : undefined,
      }));
    }
    _cache = map;
    return map[className] || [];
  } catch {
    return [];
  }
}

export function useIfcAttributes(ifcClass?: string) {
  const [attrs, setAttrs] = React.useState<IfcAttr[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    if (!ifcClass) {
      setAttrs([]);
      return;
    }
    setLoading(true);
    loadIfcAttributesForClass(ifcClass)
      .then((list) => mounted && setAttrs(list))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [ifcClass]);

  return { attrs, loading };
}
