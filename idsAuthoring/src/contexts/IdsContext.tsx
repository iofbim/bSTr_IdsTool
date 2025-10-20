"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useBsddLibraries } from "@/hooks/useBsdd";
import { useIfcCatalog } from "@/hooks/useIfcCatalog";
import { exportToIDSXML, parseIDSXML } from "@/lib/ids/xml";
import type {
  IDSRoot,
  IDSSection,
  IDSSpecification,
  IDSOptionality,
  IDSClassificationRequirement,
  IDSAttributeRequirement,
  IDSPropertyRequirement,
  IDSEntityFacet,
  IDSMaterialRequirement,
  IDSIfcVersion,
} from "@/lib/ids/types";
import { IDS_IFC_VERSIONS } from "@/lib/ids/types";

function newProperty(): IDSPropertyRequirement {
  return {
    id: `prop-${Math.random().toString(36).slice(2)}`,
    name: "",
    datatype: "",
    operator: "present",
    value: "",
  };
}

function newClassification(): IDSClassificationRequirement {
  return { id: `cls-${Math.random().toString(36).slice(2)}`, system: "", value: "" } as IDSClassificationRequirement;
}

function newAttribute(): IDSAttributeRequirement {
  return {
    id: `attr-${Math.random().toString(36).slice(2)}`,
    name: "",
    operator: "present",
    value: "",
  };
}

function newEntity(): IDSEntityFacet {
  return { id: `ent-${Math.random().toString(36).slice(2)}`, ifcClass: "", predefinedType: "" };
}

function newMaterial(): IDSMaterialRequirement {
  return { id: `mat-${Math.random().toString(36).slice(2)}`, value: "", operator: "present" };
}

function newSpecification(): IDSSpecification {
  return {
    id: `spec-${Math.random().toString(36).slice(2)}`,
    name: "",
    title: "New Specification",
    description: "",
    ifcVersion: "IFC4" as IDSIfcVersion,
    optionality: "required",
    applicability: { ifcClass: "", entities: [], classifications: [], attributes: [], properties: [], materials: [], partOf: [] },
    requirements: { entities: [], classifications: [], attributes: [], properties: [], materials: [], partOf: [], cardinality: "required" },
  };
}

function newSection(): IDSSection {
  return {
    id: `section-${Math.random().toString(36).slice(2)}`,
    title: "New Section",
    description: "",
    specifications: [newSpecification()],
  };
}

type EntityTarget = { scope: "applicability" | "requirements"; sectionId: string; specId: string; entityId: string } | null;
type ClassifTarget = { scope: "applicability" | "requirements"; sectionId: string; specId: string; classifId: string } | null;

type IdsContextValue = {
  ids: IDSRoot;
  setIds: React.Dispatch<React.SetStateAction<IDSRoot>>;
  xml: string;
  base: string;
  libraries: ReturnType<typeof useBsddLibraries>["libraries"];
  ifcClasses: ReturnType<typeof useIfcCatalog>["classes"];
  ifcPredefs: ReturnType<typeof useIfcCatalog>["predefs"];
  selectedLibs: string[];
  setSelectedLibs: React.Dispatch<React.SetStateAction<string[]>>;
  classifLibs: string[];
  setClassifLibs: React.Dispatch<React.SetStateAction<string[]>>;
  includeTestDicts: boolean;
  setIncludeTestDicts: React.Dispatch<React.SetStateAction<boolean>>;
  dictQuery: string;
  setDictQuery: React.Dispatch<React.SetStateAction<string>>;
  exportOpen: boolean;
  setExportOpen: (v: boolean) => void;
  xmlPreview: string;
  setXmlPreview: (v: string) => void;
  validateOpen: boolean;
  setValidateOpen: (v: boolean) => void;
  validation: string;
  setValidation: (v: string) => void;
  entityPickOpen: boolean;
  setEntityPickOpen: (v: boolean) => void;
  entityInitialQuery: string;
  setEntityInitialQuery: (v: string) => void;
  entityTarget: EntityTarget;
  setEntityTarget: (t: EntityTarget) => void;
  classifPickOpen: boolean;
  setClassifPickOpen: (v: boolean) => void;
  classifInitialQuery: string;
  setClassifInitialQuery: (v: string) => void;
  classifTarget: ClassifTarget;
  setClassifTarget: (t: ClassifTarget) => void;
  openEntityPicker: (initial: string, target: NonNullable<EntityTarget>) => void;
  openClassifPicker: (initial: string, target: NonNullable<ClassifTarget>) => void;
  addSection: () => void;
  removeSection: (sid: string) => void;
  addSpecification: (sid: string) => void;
  removeSpecification: (sid: string, specId: string) => void;
  addProperty: (sid: string, specId: string) => void;
  removeProperty: (sid: string, specId: string, pid: string) => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onExport: () => void;
  downloadIDS: () => void;
  onValidate: (ifcFile: File) => Promise<void>;
  applyEntityClassUriLookup: (
    scope: "applicability" | "requirements",
    sectionId: string,
    specId: string,
    entityId: string,
    ifcClass: string | undefined
  ) => Promise<void>;
  applyEntityPredefinedType: (
    scope: "applicability" | "requirements",
    sectionId: string,
    specId: string,
    entityId: string,
    ifcClass: string | undefined,
    predef: string | undefined
  ) => Promise<void>;
  pickClassificationFromBsdd: (
    scope: "applicability" | "requirements",
    sectionId: string,
    specId: string,
    classifId: string,
    system?: string,
    codeOrValue?: string,
    name?: string
  ) => Promise<void>;
};

const IdsContext = createContext<IdsContextValue | undefined>(undefined);

export function IdsProvider({ children }: { children: React.ReactNode }) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [ids, setIds] = useState<IDSRoot>({
    header: {
      title: "Untitled IDS",
      description: "",
      author: "",
      date: "",
      version: "0.1.0",
      copyright: "",
      purpose: "",
      milestone: "",
    },
    sections: [newSection()],
  });

  const [exportOpen, setExportOpen] = useState(false);
  const [xmlPreview, setXmlPreview] = useState("");
  const [validateOpen, setValidateOpen] = useState(false);
  const [validation, setValidation] = useState<string>("");
  const [selectedLibs, setSelectedLibs] = useState<string[]>([]);
  const [classifLibs, setClassifLibs] = useState<string[]>([]);
  const [includeTestDicts, setIncludeTestDicts] = useState<boolean>(false);
  const [dictQuery, setDictQuery] = useState<string>("");
  const { libraries } = useBsddLibraries(includeTestDicts);
  const { classes: ifcClasses, predefs: ifcPredefs } = useIfcCatalog();
  const didInitLibs = useRef(false);
  useEffect(() => {
    if (didInitLibs.current) return;
    const ifcId = "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3";
    setSelectedLibs((prev) => (prev && prev.length > 0 ? prev : [ifcId]));
    didInitLibs.current = true;
  }, [libraries]);

  const xml = useMemo(() => exportToIDSXML(ids), [ids]);

  function validateForExport(data: IDSRoot): string[] {
    const issues: string[] = [];
    if (!data.header.title || !data.header.title.trim()) issues.push("Header title is required.");
    for (const s of data.sections || []) {
      for (const sp of s.specifications || []) {
        const nm = (sp.name ?? sp.title ?? '').trim();
        if (!nm) issues.push('Specification name is required.');
        if (!sp.ifcVersion || !(IDS_IFC_VERSIONS as readonly string[]).includes(sp.ifcVersion as any)) {
          issues.push('Specification IFC version must be one of: ' + (IDS_IFC_VERSIONS as readonly string[]).join(', '));
        }
      }
    }
    return issues;
  }

  const pickClassificationFromBsdd = useCallback(
    async (
      scope: "applicability" | "requirements",
      sectionId: string,
      specId: string,
      classifId: string,
      system?: string,
      codeOrValue?: string,
      name?: string
    ) => {
      try {
        const candidates = [codeOrValue, name, `${name || ""} ${codeOrValue || ""}`.trim(), system, `${system || ""} ${name || ""}`.trim()]
          .map((v) => (v || "").trim())
          .filter((v, i, a) => v.length >= 2 && a.indexOf(v) === i);
        if (candidates.length === 0) return;

        let hit: any = null;
        for (const term of candidates) {
          const params = new URLSearchParams({ term, limit: "1" });
          for (const d of classifLibs || []) params.append("dict", d);
          const res = await fetch(`${base}/api/bsdd/search?${params.toString()}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data.results) && data.results.length) {
            hit = data.results[0];
            break;
          }
        }
        if (!hit) return;

        const cls = {
          system: hit.dictionaryUri || hit.dictionaryName || system || "",
          value: hit.referenceCode || hit.name || codeOrValue || "",
          uri: hit.uri || "",
        } as Partial<IDSClassificationRequirement> & { uri?: string };

        setIds((prev) => ({
          ...prev,
          sections: (prev.sections || []).map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  specifications: s.specifications.map((sp) =>
                    sp.id === specId
                      ? scope === "applicability"
                        ? {
                            ...sp,
                            applicability: {
                              ...sp.applicability!,
                              classifications: (sp.applicability?.classifications || []).map((cc) =>
                                cc.id === classifId ? { ...cc, ...cls } : cc
                              ),
                            },
                          }
                        : {
                            ...sp,
                            requirements: {
                              ...sp.requirements,
                              classifications: (sp.requirements.classifications || []).map((cc) =>
                                cc.id === classifId ? { ...cc, ...cls } : cc
                              ),
                            },
                          }
                      : sp
                  ),
                }
              : s
          ),
        }));
      } catch {
        // ignore
      }
    },
    [classifLibs, base]
  );

  const addSection = useCallback(() => {
    setIds((prev) => ({ ...prev, sections: [...(prev.sections || []), newSection()] }));
  }, []);

  const removeSection = useCallback((sid: string) => {
    setIds((prev) => ({ ...prev, sections: (prev.sections || []).filter((s) => s.id !== sid) }));
  }, []);

  const addSpecification = useCallback((sid: string) => {
    setIds((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) => (s.id === sid ? { ...s, specifications: [...s.specifications, newSpecification()] } : s)),
    }));
  }, []);

  const removeSpecification = useCallback((sid: string, specId: string) => {
    setIds((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) => (s.id === sid ? { ...s, specifications: s.specifications.filter((sp) => sp.id !== specId) } : s)),
    }));
  }, []);

  const addProperty = useCallback((sid: string, specId: string) => {
    setIds((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) =>
        s.id === sid
          ? {
              ...s,
              specifications: s.specifications.map((sp) =>
                sp.id === specId
                  ? { ...sp, requirements: { ...sp.requirements, properties: [...sp.requirements.properties, newProperty()] } }
                  : sp
              ),
            }
          : s
      ),
    }));
  }, []);

  const removeProperty = useCallback((sid: string, specId: string, pid: string) => {
    setIds((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) =>
        s.id === sid
          ? {
              ...s,
              specifications: s.specifications.map((sp) =>
                sp.id === specId
                  ? { ...sp, requirements: { ...sp.requirements, properties: sp.requirements.properties.filter((p) => p.id !== pid) } }
                  : sp
              ),
            }
          : s
      ),
    }));
  }, []);

  const onImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseIDSXML(file);
      setIds(imported);
    } catch (err) {
      alert(`Failed to import IDS: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const onExport = useCallback(() => {
    const issues = validateForExport(ids);
    if (issues.length) {
      alert(issues.join("\n"));
      return;
    }
    setXmlPreview(xml);
    setExportOpen(true);
  }, [xml, ids]);

  const downloadIDS = useCallback(() => {
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ids.header.title || "ids"}.ids`;
    a.click();
    URL.revokeObjectURL(url);
  }, [xml, ids.header.title]);

  const applyEntityClassUriLookup = useCallback(
    async (
      scope: "applicability" | "requirements",
      sectionId: string,
      specId: string,
      entityId: string,
      ifcClass: string | undefined
    ) => {
      const cls = (ifcClass || "").trim();
      if (!cls) return;
      try {
        const IFC43 = "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3";
        setSelectedLibs((prev) => (prev && prev.includes(IFC43) ? prev : [...(prev || []), IFC43]));

        const term = cls.toUpperCase();
        const params = new URLSearchParams({ term, limit: "1" });
        params.append("dict", "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3");
        const res = await fetch(`${base}/api/bsdd/search?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        const hit = Array.isArray(data.results) && data.results.length ? data.results[0] : null;
        const uri = hit?.uri ? String(hit.uri) : undefined;
        if (!uri) return;
        setIds((prev) => ({
          ...prev,
          sections: (prev.sections || []).map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  specifications: s.specifications.map((sp) =>
                    sp.id === specId
                      ? scope === "applicability"
                        ? {
                            ...sp,
                            applicability: {
                              ...sp.applicability!,
                              entities: (sp.applicability?.entities || []).map((ee) => (ee.id === entityId ? { ...ee, uri } : ee)),
                            },
                          }
                        : {
                            ...sp,
                            requirements: {
                              ...sp.requirements,
                              entities: (sp.requirements.entities || []).map((ee) => (ee.id === entityId ? { ...ee, uri } : ee)),
                            },
                          }
                      : sp
                  ),
                }
              : s
          ),
        }));
      } catch {
        // ignore
      }
    },
    [base]
  );

  const applyEntityPredefinedType = useCallback(
    async (
      scope: "applicability" | "requirements",
      sectionId: string,
      specId: string,
      entityId: string,
      ifcClass: string | undefined,
      predef: string | undefined
    ) => {
      setIds((prev) => ({
        ...prev,
        sections: (prev.sections || []).map((s) =>
          s.id === sectionId
            ? {
                ...s,
                specifications: s.specifications.map((sp) =>
                  sp.id === specId
                    ? scope === "applicability"
                      ? {
                          ...sp,
                          applicability: {
                            ...sp.applicability!,
                            entities: (sp.applicability?.entities || []).map((ee) => (ee.id === entityId ? { ...ee, predefinedType: predef || "" } : ee)),
                          },
                        }
                      : {
                          ...sp,
                          requirements: {
                            ...sp.requirements,
                            entities: (sp.requirements.entities || []).map((ee) => (ee.id === entityId ? { ...ee, predefinedType: predef || "" } : ee)),
                          },
                        }
                    : sp
                ),
              }
            : s
        ),
      }));

      const cls = (ifcClass || "").trim();
      const pt = (predef || "").trim();
      if (!cls || !pt) return;

      try {
        const trySearch = async (term: string) => {
          const params = new URLSearchParams({ term, limit: "1" });
          for (const d of selectedLibs) params.append("dict", d);
          const res = await fetch(`${base}/api/bsdd/search?${params.toString()}`);
          if (!res.ok) return undefined as string | undefined;
          const data = await res.json();
          const hit = Array.isArray(data.results) && data.results.length ? data.results[0] : null;
          return hit?.uri ? String(hit.uri) : undefined;
        };

        let uri = await trySearch(`${cls.toUpperCase()}${pt.toUpperCase()}`);
        if (!uri) uri = await trySearch(cls.toUpperCase());
        if (!uri) return;
        setIds((prev) => ({
          ...prev,
          sections: (prev.sections || []).map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  specifications: s.specifications.map((sp) =>
                    sp.id === specId
                      ? scope === "applicability"
                        ? {
                            ...sp,
                            applicability: {
                              ...sp.applicability!,
                              entities: (sp.applicability?.entities || []).map((ee) => (ee.id === entityId ? { ...ee, uri } : ee)),
                            },
                          }
                        : {
                            ...sp,
                            requirements: {
                              ...sp.requirements,
                              entities: (sp.requirements.entities || []).map((ee) => (ee.id === entityId ? { ...ee, uri } : ee)),
                            },
                          }
                      : sp
                  ),
                }
              : s
          ),
        }));
      } catch {
        // ignore
      }
    },
    [selectedLibs, base]
  );

  const onValidate = useCallback(async (ifcFile: File) => {
    const issues = validateForExport(ids);
    if (issues.length) { alert(issues.join("\n")); return; }
    const form = new FormData();
    form.append("idsXml", new Blob([xml], { type: "application/xml" }), "spec.ids");
    form.append("ifc", ifcFile);
    const res = await fetch(`${base}/api/validate`, { method: "POST", body: form });
    const data = await res.json();
    setValidation(JSON.stringify(data, null, 2));
    setValidateOpen(true);
  }, [xml, base, ids]);


  // bSDD picker states
  const [entityPickOpen, setEntityPickOpen] = useState(false);
  const [entityInitialQuery, setEntityInitialQuery] = useState("");
  const [entityTarget, setEntityTarget] = useState<EntityTarget>(null);
  const [classifPickOpen, setClassifPickOpen] = useState(false);
  const [classifInitialQuery, setClassifInitialQuery] = useState("");
  const [classifTarget, setClassifTarget] = useState<ClassifTarget>(null);

  const openEntityPicker = useCallback((initial: string, target: NonNullable<EntityTarget>) => {
    setEntityInitialQuery(initial || "");
    setEntityTarget(target);
    setEntityPickOpen(true);
  }, []);

  const openClassifPicker = useCallback((initial: string, target: NonNullable<ClassifTarget>) => {
    setClassifInitialQuery(initial || "");
    setClassifTarget(target);
    setClassifPickOpen(true);
  }, []);

  const value: IdsContextValue = {
    ids,
    setIds,
    xml,
    base,
    libraries,
    ifcClasses,
    ifcPredefs,
    selectedLibs,
    setSelectedLibs,
    classifLibs,
    setClassifLibs,
    includeTestDicts,
    setIncludeTestDicts,
    dictQuery,
    setDictQuery,
    exportOpen,
    setExportOpen,
    xmlPreview,
    setXmlPreview,
    validateOpen,
    setValidateOpen,
    validation,
    setValidation,
    entityPickOpen,
    setEntityPickOpen,
    entityInitialQuery,
    setEntityInitialQuery,
    entityTarget,
    setEntityTarget,
    classifPickOpen,
    setClassifPickOpen,
    classifInitialQuery,
    setClassifInitialQuery,
    classifTarget,
    setClassifTarget,
    openEntityPicker,
    openClassifPicker,
    addSection,
    removeSection,
    addSpecification,
    removeSpecification,
    addProperty,
    removeProperty,
    onImport,
    onExport,
    downloadIDS,
    onValidate,
    applyEntityClassUriLookup,
    applyEntityPredefinedType,
    pickClassificationFromBsdd,
  };

  return <IdsContext.Provider value={value}>{children}</IdsContext.Provider>;
}

export function useIds() {
  const ctx = useContext(IdsContext);
  if (!ctx) throw new Error("useIds must be used within IdsProvider");
  return ctx;
}

export { newAttribute, newClassification, newEntity, newMaterial, newProperty };
