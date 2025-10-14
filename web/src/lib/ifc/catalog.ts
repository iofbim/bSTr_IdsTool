export type IfcPredefMap = Record<string, string[]>; // UPPERCASE class -> UPPERCASE predefined types

type LocalIfcJson = {
  classes: Record<
    string,
    {
      name: string;
      attributes?: {
        explicit?: Array<{
          name?: string;
          type?: string;
          enumValues?: string[];
        }>;
      };
    }
  >;
};

export async function loadIfcPredefsFiltered(): Promise<{ classes: string[]; predefs: IfcPredefMap }> {
  const localRes = await fetch("/data/ifc_classes_with_attrs_and_psetprops.json", { cache: "force-cache" });
  const local = (await localRes.json()) as LocalIfcJson;

  const rawPredefs: IfcPredefMap = {};
  for (const [className, info] of Object.entries(local.classes || {})) {
    const exps = info.attributes?.explicit || [];
    const pt = exps.find((a) => (a.name || "").toLowerCase() === "predefinedtype".toLowerCase());
    const values = (pt?.enumValues || []).map((v) => String(v).toUpperCase());
    rawPredefs[className.toUpperCase()] = values;
  }

  // Fetch bSDD IFC4.3 class names via server proxy
  const bsddRes = await fetch("/api/bsdd/ifc43/classes", { cache: "force-cache" });
  const bsddJson = (await bsddRes.json()) as { classes?: string[] };
  const bsddSet = new Set((bsddJson.classes || []).map((n) => n.toUpperCase()));

  const filteredEntries = Object.entries(rawPredefs).filter(([k]) => bsddSet.has(k));
  const sortedClasses = filteredEntries.map(([k]) => k).sort();
  const predefs: IfcPredefMap = {};
  for (const [k, v] of filteredEntries) predefs[k] = v;

  return { classes: sortedClasses, predefs };
}

