"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";
import { Textarea } from "@/components/ds/Textarea";
import { Select } from "@/components/ds/Select";
import { Dialog } from "@/components/ds/Dialog";
import { useBsddLibraries } from "@/hooks/useBsdd";
import { useIfcCatalog } from "@/hooks/useIfcCatalog";
import BsddClassPicker from "@/components/bsdd/BsddClassPicker";
import { exportToIDSXML, parseIDSXML } from "@/lib/ids/xml";
import AttrBsddHelper from "@/components/bsdd/AttrBsddHelper";
import PropertyBsddHelper from "@/components/bsdd/PropertyBsddHelper";
import type {
  IDSPropertyRequirement,
  IDSRoot,
  IDSSpecification,
  IDSSection,
  IDSOptionality,
  IDSClassificationRequirement,
  IDSAttributeRequirement,
  IDSEntityFacet,
  IDSMaterialRequirement,
} from "@/lib/ids/types";
import { IDS_IFC_VERSIONS, IDS_RELATIONS } from "@/lib/ids/types";

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
  return { id: `cls-${Math.random().toString(36).slice(2)}`, system: "", code: "", name: "" };
}

function newAttribute(): IDSAttributeRequirement {
  return {
    id: `attr-${Math.random().toString(36).slice(2)}`,
    name: "",
    datatype: "",
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
    ifcVersion: "IFC4",
    optionality: "required",
    applicability: { ifcClass: "", entities: [], classifications: [], attributes: [], properties: [], materials: [], partOf: [] },
    // Start with no pre-filled requirement facets
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

export default function Page() {
  const [ids, setIds] = useState<IDSRoot>({
    header: { title: "Untitled IDS", description: "", author: "", date: "", version: "0.1.0" },
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

  // bSDD entity picker state
  const [entityPickOpen, setEntityPickOpen] = useState(false);
  const [entityInitialQuery, setEntityInitialQuery] = useState("");
  const [entityTarget, setEntityTarget] = useState<
    | { scope: "applicability" | "requirements"; sectionId: string; specId: string; entityId: string }
    | null
  >(null);
  const [classifPickOpen, setClassifPickOpen] = useState(false);
  const [classifInitialQuery, setClassifInitialQuery] = useState("");
  const [classifTarget, setClassifTarget] = useState<
    | { scope: "applicability" | "requirements"; sectionId: string; specId: string; classifId: string }
    | null
  >(null);

  const xml = useMemo(() => exportToIDSXML(ids), [ids]);

  const pickClassificationFromBsdd = useCallback(
    async (
      scope: "applicability" | "requirements",
      sectionId: string,
      specId: string,
      classifId: string,
      system?: string,
      code?: string,
      name?: string
    ) => {
      try {
        const candidates = [code, name, `${name || ""} ${code || ""}`.trim(), system, `${system || ""} ${name || ""}`.trim()]
          .map((v) => (v || "").trim())
          .filter((v, i, a) => v.length >= 2 && a.indexOf(v) === i);
        if (candidates.length === 0) return;

        let hit: any = null;
        for (const term of candidates) {
          const params = new URLSearchParams({ term, limit: "1" });
          for (const d of (classifLibs || [])) params.append("dict", d);
          const res = await fetch(`/api/bsdd/search?${params.toString()}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data.results) && data.results.length) {
            hit = data.results[0];
            break;
          }
        }
        if (!hit) return;

        const cls = {
          system: (hit.dictionaryName || hit.dictionaryUri || system || ""),
          code: (hit.referenceCode || code || ""),
          name: (hit.name || name || ""),
          uri: (hit.uri || ""),
        } as Partial<IDSClassificationRequirement> & { uri?: string };

        setIds((prev) => ({
          ...prev,
          sections: (prev.sections || []).map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  specifications: s.specifications.map((sp) =>
                    sp.id === specId
                      ? (scope === "applicability"
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
                        )
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
    [classifLibs]
  );

  // bSDD class search handled by BsddClassPicker component

  const addSection = useCallback(() => {
    setIds((prev) => ({ ...prev, sections: [...(prev.sections || []), newSection()] }));
  }, []);

  const removeSection = useCallback((sid: string) => {
    setIds((prev) => ({ ...prev, sections: (prev.sections || []).filter((s) => s.id !== sid) }));
  }, []);

  const addSpecification = useCallback((sid: string) => {
    setIds((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) =>
        s.id === sid ? { ...s, specifications: [...s.specifications, newSpecification()] } : s
      ),
    }));
  }, []);

  const removeSpecification = useCallback((sid: string, specId: string) => {
    setIds((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) =>
        s.id === sid ? { ...s, specifications: s.specifications.filter((sp) => sp.id !== specId) } : s
      ),
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
                  ? {
                      ...sp,
                      requirements: {
                        ...sp.requirements,
                        properties: sp.requirements.properties.filter((p) => p.id !== pid),
                      },
                    }
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
      const specCount = (imported.sections?.[0]?.specifications?.length ?? 0);
      if (!specCount) {
        // Provide a tiny bit of feedback if the file parsed but produced no specs
        alert("Imported file parsed, but no specifications were found.");
      }
    } catch (err) {
      alert(`Failed to import IDS: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const onExport = useCallback(() => {
    setXmlPreview(xml);
    setExportOpen(true);
  }, [xml]);

  const downloadXML = useCallback(() => {
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ids.header.title || "ids"}.ids.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [xml, ids.header.title]);

  // Lookup URI when class is chosen/confirmed (on blur), using class-only search.
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
        // Ensure IFC4.3 is selected in the bSDD libraries UI
        const IFC43 = "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3";
        setSelectedLibs((prev) => (prev && prev.includes(IFC43) ? prev : [ ...(prev || []), IFC43 ]));

        const term = cls.toUpperCase();
        const params = new URLSearchParams({ term, limit: "1" });
        // Always search in IFC 4.3 when class picked from our dropdown
        params.append("dict", "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3");
        const res = await fetch(`/api/bsdd/search?${params.toString()}`);
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
                              entities: (sp.applicability?.entities || []).map((ee) =>
                                ee.id === entityId ? { ...ee, uri } : ee
                              ),
                            },
                          }
                        : {
                            ...sp,
                            requirements: {
                              ...sp.requirements,
                              entities: (sp.requirements.entities || []).map((ee) =>
                                ee.id === entityId ? { ...ee, uri } : ee
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
    []
  );

  // When user selects a predefined type for an entity, optionally look up
  // the combined IFC class + predefined type variant in bSDD and assign the
  // matched class URI to the entity's uri field.
  const applyEntityPredefinedType = useCallback(
    async (
      scope: "applicability" | "requirements",
      sectionId: string,
      specId: string,
      entityId: string,
      ifcClass: string | undefined,
      predef: string | undefined
    ) => {
      // First update just the predefinedType value locally
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
                            entities: (sp.applicability?.entities || []).map((ee) =>
                              ee.id === entityId ? { ...ee, predefinedType: predef || "" } : ee
                            ),
                          },
                        }
                      : {
                          ...sp,
                          requirements: {
                            ...sp.requirements,
                            entities: (sp.requirements.entities || []).map((ee) =>
                              ee.id === entityId ? { ...ee, predefinedType: predef || "" } : ee
                            ),
                          },
                        }
                    : sp
                ),
              }
            : s
        ),
      }));

      // If we have both class and predef, try bSDD lookup for a specific URI
      const cls = (ifcClass || "").trim();
      const pt = (predef || "").trim();
      if (!cls || !pt) return;

      try {
        // 1) Try combined search term like IFCDOORBOOM_BARRIER (class upper + predef upper)
        const trySearch = async (term: string) => {
          const params = new URLSearchParams({ term, limit: "1" });
          for (const d of selectedLibs) params.append("dict", d);
          const res = await fetch(`/api/bsdd/search?${params.toString()}`);
          if (!res.ok) return undefined as string | undefined;
          const data = await res.json();
          const hit = Array.isArray(data.results) && data.results.length ? data.results[0] : null;
          return hit?.uri ? String(hit.uri) : undefined;
        };

        let uri = await trySearch(`${cls.toUpperCase()}${pt.toUpperCase()}`);

        // 2) Fallback: search by class name only (e.g., IFCDOOR)
        if (!uri) {
          uri = await trySearch(cls.toUpperCase());
        }

        if (!uri) return;
        // Apply the URI to the entity
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
                              entities: (sp.applicability?.entities || []).map((ee) =>
                                ee.id === entityId ? { ...ee, uri } : ee
                              ),
                            },
                          }
                        : {
                            ...sp,
                            requirements: {
                              ...sp.requirements,
                              entities: (sp.requirements.entities || []).map((ee) =>
                                ee.id === entityId ? { ...ee, uri } : ee
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
        // ignore lookup errors, user can edit URI manually
      }
    },
    [selectedLibs]
  );

  const onValidate = useCallback(async (ifcFile: File) => {
    const form = new FormData();
    form.append("idsXml", new Blob([xml], { type: "application/xml" }), "spec.ids");
    form.append("ifc", ifcFile);
    const res = await fetch("/api/validate", { method: "POST", body: form });
    const data = await res.json();
    setValidation(JSON.stringify(data, null, 2));
    setValidateOpen(true);
  }, [xml]);

  // Hook up bSDD search to an input when needed, via /api/bsdd/search

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">bSTr IDS Tool</h1>
      <p className="mt-2 text-gray-600">Create, import, export, and validate IDS specifications.</p>

      <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left column: Header + Import/Export/Validate stacked, fixed total height */}
        <div className="grid gap-3 h-[320px] overflow-hidden">
          <div className="ds-panel p-3">
          {/* <h2 className="text-lg font-semibold">Header</h2> */}
          {/* <label className="mt-2 block text-sm text-gray-700">Title</label> */}
          <Input
            value={ids.header.title}
            onChange={(e) => setIds({ ...ids, header: { ...ids.header, title: e.target.value } })}
          />
          <label className="mt-1 block text-sm text-gray-700">Description</label>
          <Textarea
            rows={1}
            value={ids.header.description || ""}
            onChange={(e) => setIds({ ...ids, header: { ...ids.header, description: e.target.value } })}
          />
          <div className="mt-1 grid grid-cols-3 gap-2">
            <Input
              placeholder="Author"
              value={ids.header.author || ""}
              onChange={(e) => setIds({ ...ids, header: { ...ids.header, author: e.target.value } })}
            />
            <Input
              type="date"
              value={ids.header.date || ""}
              onChange={(e) => setIds({ ...ids, header: { ...ids.header, date: e.target.value } })}
            />
            <Input
              placeholder="Version"
              value={ids.header.version || ""}
              onChange={(e) => setIds({ ...ids, header: { ...ids.header, version: e.target.value } })}
            />
          </div>
          </div>
          <div className="ds-panel p-3">
            <h2 className="text-lg font-semibold">Import / Export / Validate</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <input className="max-w-[12rem]" type="file" accept=".ids,.xml" onChange={onImport} aria-label="Import IDS XML" title="Import IDS XML" />
              <Button onClick={onExport}>Preview IDS</Button>
              <Button variant="secondary" onClick={downloadXML}><img src="/icons/IDS.png" alt="Download XML" className="h-5 w-10 object-contain" /></Button>
              <span className="text-sm text-gray-600">IFC:</span>
              <input
                className="max-w-[12rem]"
                type="file"
                accept=".ifc,.ifczip"
                onChange={(e) => e.target.files && e.target.files[0] && onValidate(e.target.files[0])}
                aria-label="Upload IFC file for validation"
                title="Upload IFC file for validation"
              />
            </div>
          </div>
        </div>

        {/* Right column: bSDD Libraries panel, fixed height */}
        <div className="ds-panel p-4 h-[320px] overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold">bSDD Libraries</h2>
          <p className="mt-1 text-gray-600">Select which bSDD libraries to use.</p>
          <div className="mt-2 flex items-center gap-3">
            <Input
              placeholder="Search dictionaries"
              value={dictQuery}
              onChange={(e) => setDictQuery(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeTestDicts}
                onChange={(e) => setIncludeTestDicts(e.target.checked)}
              />
              Include test dictionaries
            </label>
          </div>
          <div className="mt-2 grid grid-cols-[auto_auto_1fr] items-center gap-2 text-xs font-medium text-gray-600 pr-1">
            <div>Fa_</div>
            <div>Cl_</div>
            <div>Library</div>
          </div>
          <div className="mt-2 grid content-start auto-rows-min gap-2 pr-1 flex-1 overflow-y-auto">
            {libraries
              .filter((lib) =>
                !dictQuery
                  ? true
                  : (
                      (lib.name || "") + " " + (lib.code || "") + " " + (lib.version || "")
                    )
                      .toLowerCase()
                      .includes(dictQuery.toLowerCase())
              )
              .map((lib) => {
                const isIfc = lib.id === "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3";
                const checked = selectedLibs.includes(lib.id);
                return (
                  <div key={lib.id} className="grid grid-cols-[auto_auto_1fr] items-center gap-2">
  <input
    type="checkbox"
    checked={selectedLibs.includes(lib.id)}
    onChange={(e) => {
      setSelectedLibs((prev) => {
        const set = new Set(prev);
        if (e.target.checked) set.add(lib.id);
        else set.delete(lib.id);
        return Array.from(set);
      });
    }}
  />
  <input
    type="checkbox"
    checked={classifLibs.includes(lib.id)}
    onChange={(e) => {
      setClassifLibs((prev) => {
        const set = new Set(prev);
        if (e.target.checked) set.add(lib.id);
        else set.delete(lib.id);
        return Array.from(set);
      });
    }}
  />
  <span className="text-sm truncate">
    {lib.name}
    {lib.code || lib.version ? (
      <span className="ml-1 text-xs text-gray-500">
        {lib.code ? `${lib.code}` : ""}
        {lib.code && lib.version ? " · " : ""}
        {lib.version ? `${lib.version}` : ""}
      </span>
    ) : null}
  </span>
</div>
                );
              })}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sections</h2>
          <Button onClick={addSection}>Add Section</Button>
        </div>

        {(ids.sections || []).map((section) => (
          <div key={section.id} className="ds-panel grid gap-4 p-4">
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder="Section title"
                value={section.title}
                onChange={(e) =>
                  setIds((prev) => ({
                    ...prev,
                    sections: (prev.sections || []).map((s) => (s.id === section.id ? { ...s, title: e.target.value } : s)),
                  }))
                }
              />
              <Button variant="accent" onClick={() => removeSection(section.id)}>
                Remove Section
              </Button>
            </div>
            <Textarea
              rows={2}
              placeholder="Section description"
              value={section.description || ""}
              onChange={(e) =>
                setIds((prev) => ({
                  ...prev,
                  sections: (prev.sections || []).map((s) => (s.id === section.id ? { ...s, description: e.target.value } : s)),
                }))
              }
            />

            <div className="flex items-center justify-between">
              <h3 className="font-medium">Specifications</h3>
              <Button variant="secondary" onClick={() => addSpecification(section.id)}>
                Add Specification
              </Button>
            </div>

            {section.specifications.map((spec) => (
              <div key={spec.id} className="rounded border p-3">
                {/* Row 1: Single Name field (drives both spec.name and spec.title) + optionality */}
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="flex-1 min-w-[16rem]"
                    placeholder="Specification name"
                    value={(spec.name ?? spec.title) || ''}
                    onChange={(e) =>
                      setIds((prev) => ({
                        ...prev,
                        sections: (prev.sections || []).map((s) =>
                          s.id === section.id
                            ? {
                                ...s,
                                specifications: s.specifications.map((sp) =>
                                  sp.id === spec.id
                                    ? {
                                        ...sp,
                                        name: (e.target as HTMLInputElement).value,
                                        title: (e.target as HTMLInputElement).value,
                                      }
                                    : sp
                                ),
                              }
                            : s
                        ),
                      }))
                    }
                  />
                  <select title="Specification optionality" aria-label="Specification optionality"
                    value={spec.optionality}
                    onChange={(e) =>
                      setIds((prev) => ({
                        ...prev,
                        sections: (prev.sections || []).map((s) =>
                          s.id === section.id
                            ? {
                                ...s,
                                specifications: s.specifications.map((sp) =>
                                  sp.id === spec.id ? { ...sp, optionality: e.target.value as IDSOptionality } : sp
                                ),
                              }
                            : s
                        ),
                      }))
                    }
                    className="ds-input min-w-[10rem]"
                  >
                    <option value="required">Required</option>
                    <option value="optional">Optional</option>
                    <option value="prohibited">Prohibited</option>
                  </select>
                </div>

                {/* Row 2: Identifier | Instructions | IFC Version | Remove (single line) */}
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[2fr_3fr_1fr_auto] items-center">
                  <Input
                    placeholder="Identifier (optional)"
                    value={spec.identifier || ''}
                    onChange={(e) =>
                      setIds((prev) => ({
                        ...prev,
                        sections: (prev.sections || []).map((s) =>
                          s.id === section.id
                            ? {
                                ...s,
                                specifications: s.specifications.map((sp) =>
                                  sp.id === spec.id ? { ...sp, identifier: (e.target as HTMLInputElement).value } : sp
                                ),
                              }
                            : s
                        ),
                      }))
                    }
                  />
                  <Input
                    placeholder="Instructions (optional)"
                    value={spec.instructions || ''}
                    onChange={(e) =>
                      setIds((prev) => ({
                        ...prev,
                        sections: (prev.sections || []).map((s) =>
                          s.id === section.id
                            ? {
                                ...s,
                                specifications: s.specifications.map((sp) =>
                                  sp.id === spec.id ? { ...sp, instructions: (e.target as HTMLInputElement).value } : sp
                                ),
                              }
                            : s
                        ),
                      }))
                    }
                  />
                  <select title="IFC version" aria-label="IFC version"
                    value={spec.ifcVersion || "IFC4"}
                    onChange={(e) =>
                      setIds((prev) => ({
                        ...prev,
                        sections: (prev.sections || []).map((s) =>
                          s.id === section.id
                            ? {
                                ...s,
                                specifications: s.specifications.map((sp) =>
                                  sp.id === spec.id ? { ...sp, ifcVersion: e.target.value as any } : sp
                                ),
                              }
                            : s
                        ),
                      }))
                    }
                    className="ds-input"
                    title="IFC schema version"
                  >
                    {IDS_IFC_VERSIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <div className="flex justify-end">
                    <Button variant="accent" onClick={() => removeSpecification(section.id, spec.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
                
                <Textarea
                  rows={2}
                  placeholder="Specification description"
                  value={spec.description || ""}
                  onChange={(e) =>
                    setIds((prev) => ({
                      ...prev,
                      sections: (prev.sections || []).map((s) =>
                        s.id === section.id
                          ? {
                              ...s,
                              specifications: s.specifications.map((sp) =>
                                sp.id === spec.id ? { ...sp, description: e.target.value } : sp
                              ),
                            }
                          : s
                      ),
                    }))
                  }
                />

                <div className="mt-3 grid gap-4">
                  <div className="ml-4">
                    <h4 className="font-medium">Applicability</h4>
                    <div className="mt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-700">Add:</span>
                        <Button className="text-xs bg-gray-100" title="Object is an IfcEntity" variant="secondary" onClick={() =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    specifications: s.specifications.map((sp) =>
                                      sp.id === spec.id
                                        ? { ...sp, applicability: { ...(sp.applicability || {}), entities: [...(sp.applicability?.entities || []), newEntity()] } }
                                        : sp
                                    ),
                                  }
                                : s
                            ),
                          }))
                        }>Entity</Button>
                        <Button className="text-xs bg-gray-100" title="Object has the classification" variant="secondary" onClick={() =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    specifications: s.specifications.map((sp) =>
                                      sp.id === spec.id
                                        ? { ...sp, applicability: { ...(sp.applicability || {}), classifications: [...(sp.applicability?.classifications || []), newClassification()] } }
                                        : sp
                                    ),
                                  }
                                : s
                            ),
                          }))
                        }>Classification</Button>
                        <Button className="text-xs bg-gray-100" title="Object has the attribute" variant="secondary" onClick={() =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    specifications: s.specifications.map((sp) =>
                                      sp.id === spec.id
                                        ? { ...sp, applicability: { ...(sp.applicability || {}), attributes: [...(sp.applicability?.attributes || []), newAttribute()] } }
                                        : sp
                                    ),
                                  }
                                : s
                            ),
                          }))
                        }>Attribute</Button>
                        <Button className="text-xs bg-gray-100" title="Object has the property" variant="secondary" onClick={() =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    specifications: s.specifications.map((sp) =>
                                      sp.id === spec.id
                                        ? { ...sp, applicability: { ...(sp.applicability || {}), properties: [...(sp.applicability?.properties || []), newProperty()] } }
                                        : sp
                                    ),
                                  }
                                : s
                            ),
                          }))
                        }>Property</Button>
                        <Button className="text-xs bg-gray-100" title="Object has the material" variant="secondary" onClick={() =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    specifications: s.specifications.map((sp) =>
                                      sp.id === spec.id
                                        ? { ...sp, applicability: { ...(sp.applicability || {}), materials: [...(sp.applicability?.materials || []), newMaterial()] } }
                                        : sp
                                    ),
                                  }
                                : s
                            ),
                          }))
                        }>Material</Button>
                        <Button className="text-xs bg-gray-100" title="Object is part of another entity" variant="secondary" onClick={() =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    specifications: s.specifications.map((sp) =>
                                      sp.id === spec.id
                                        ? { ...sp, applicability: { ...(sp.applicability || {}), partOf: [ ...(sp.applicability?.partOf || []), { id: `part-${Math.random().toString(36).slice(2)}`, relation: 'IFCRELAGGREGATES', entity: newEntity() } ] } }
                                        : sp
                                    ),
                                  }
                                : s
                            ),
                          }))
                        }>Part Of</Button>
                      </div>
                      {(spec.applicability?.entities || []).map((e) => (
                        <div key={e.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                      <div className="grid grid-cols-1 md:grid-cols-[3fr_3fr] gap-2">
                            <div className="relative">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="p-0 h-6 w-12 rounded border flex items-center justify-center"
                                  title="Pick from bSDD"
                                  onClick={() => {
                                    setEntityTarget({ scope: "applicability", sectionId: section.id, specId: spec.id, entityId: e.id });
                                    setEntityInitialQuery(e.ifcClass || "");
                                    setEntityPickOpen(true);
                                  }}
                                >
                                  <img src="/icons/bSDD.png" alt="Pick from bSDD" className="h-6 w-12 object-contain" />
                                </button>
                                <div className="flex-1">
                                  <Input list={`ifc-classes-${e.id}`} placeholder="Class" value={e.ifcClass || ""} onChange={(ev) =>
                                    setIds((prev) => ({
                                      ...prev,
                                      sections: (prev.sections || []).map((s) => s.id === section.id ? {
                                        ...s,
                                        specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, entities: (sp.applicability?.entities || []).map((ee) => ee.id === e.id ? { ...ee, ifcClass: (ev.target as HTMLInputElement).value } : ee) } } : sp),
                                      } : s),
                                    }))
                                  } onBlur={(ev) => applyEntityClassUriLookup("applicability", section.id, spec.id, e.id, (ev.target as HTMLInputElement).value)} />
                                  <datalist id={`ifc-classes-${e.id}`}>
                                    {(ifcClasses || []).map((c) => (
                                      <option key={c} value={c} />
                                    ))}
                                  </datalist>
                                </div>
                              </div>
                            </div>
                            {(ifcPredefs && ifcPredefs[(e.ifcClass || "").toUpperCase()] && ifcPredefs[(e.ifcClass || "").toUpperCase()].length) ? (
                              <select title="Predefined type" aria-label="Predefined type"
                                className="ds-input"
                                value={e.predefinedType || ""}
                                onChange={(ev) =>
                                  applyEntityPredefinedType(
                                    "applicability",
                                    section.id,
                                    spec.id,
                                    e.id,
                                    e.ifcClass,
                                    (ev.target as HTMLSelectElement).value
                                  )
                                }
                              >
                                <option value="">-- select predefined type --</option>
                                {ifcPredefs[(e.ifcClass || "").toUpperCase()].map((pt) => (
                                  <option key={pt} value={pt}>{pt}</option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                placeholder="Predefined Type (optional)"
                                value={e.predefinedType || ""}
                                onChange={(ev) =>
                                  applyEntityPredefinedType(
                                    "applicability",
                                    section.id,
                                    spec.id,
                                    e.id,
                                    e.ifcClass,
                                    (ev.target as HTMLInputElement).value
                                  )
                                }
                              />
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                          <Input placeholder="URI (optional)" value={(e as any).uri || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, entities: (sp.applicability?.entities || []).map((ee) => ee.id === e.id ? { ...ee, uri: (ev.target as HTMLInputElement).value } : ee) } } : sp) } : s),
                          }))} />
                            <Input placeholder="Instructions (optional)" value={(e as any).instructions || ''} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, entities: (sp.applicability?.entities || []).map((ee) => ee.id === e.id ? { ...ee, instructions: (ev.target as HTMLInputElement).value } : ee) } } : sp) } : s),
                            }))} />
                            <div className="flex items-start md:justify-end"><Button variant="accent" className="text-xs" onClick={() => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, entities: (sp.applicability?.entities || []).filter((ee) => ee.id !== e.id) } } : sp) } : s),
                            }))}>Remove</Button></div>
                          </div>
                        </div>
                      ))}
                      {(spec.applicability?.classifications || []).map((c) => (
                        <div key={c.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                        <div className="grid grid-cols-1 md:grid-cols-[auto_2fr_2fr_2fr] items-center gap-2 ">
                            <button type="button" className="p-0 h-6 w-12 rounded border flex items-center justify-center" title="Pick from bSDD" onClick={() => { setClassifTarget({ scope: "applicability", sectionId: section.id, specId: spec.id, classifId: c.id }); setClassifInitialQuery(c.code || c.name || c.system || ""); setClassifPickOpen(true); }}><img src="/icons/bSDD.png" alt="Pick from bSDD" className="h-6 w-12 object-contain" /></button>
                            <Input placeholder="Classification System" value={c.system} onChange={(ev) => setIds((prev) => ({
                             ...prev,
                             sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).map((cc) => cc.id === c.id ? { ...cc, system: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                          }))} />
                            <Input placeholder="Code" value={c.code || ""} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).map((cc) => cc.id === c.id ? { ...cc, code: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                          }))} />
                            <Input placeholder="Name (optional)" value={c.name || ''} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).map((cc) => cc.id === c.id ? { ...cc, name: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                            }))} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2">
                            <Input placeholder="URI (optional)" value={c.uri || ''} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).map((cc) => cc.id === c.id ? { ...cc, uri: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                            }))} />
                            <Input placeholder="Instructions (optional)" value={c.instructions || ''} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).map((cc) => cc.id === c.id ? { ...cc, instructions: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                            }))} />
                            
                            <div className="flex items-start md:justify-end"><Button variant="accent" className="text-xs" onClick={() => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).filter((cc) => cc.id !== c.id) } } : sp) } : s),
                            }))}>Remove</Button></div>
                          </div>
                        </div>
                      ))}
                      {(spec.applicability?.attributes || []).map((a) => (
                        <div key={a.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr_2fr_3fr] gap-2">
                          <Input placeholder="Attribute Name" value={a.name} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, name: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                          }))} />
                          <Input placeholder="Datatype" value={a.datatype || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, datatype: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                          }))} />
                          <select title="Attribute operator" aria-label="Attribute operator" className="ds-input" value={a.operator || 'present'} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, operator: ev.target.value as any } : aa) } } : sp) } : s),
                          }))}>
                            <option value="present">present</option>
                            <option value="equals">equals</option>
                            <option value="contains">contains</option>
                            <option value="in">in</option>
                            <option value="matches">matches</option>
                          </select>
                          <AttrBsddHelper dicts={selectedLibs} initialQuery={a.name} onPick={(sel: any) => setIds(prev => ({ ...prev, sections: (prev.sections || []).map(s => s.id===section.id ? { ...s, specifications: s.specifications.map(sp => sp.id===spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map(aa => aa.id===a.id ? { ...aa, name: sel.name || sel.code || "", datatype: sel.dataType || "", uri: sel.uri || "" } : aa) } } : sp) } : s) }))} />
                          <Input placeholder="Value" value={(a.value as any) || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, value: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                          }))} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                            <Input placeholder="URI (optional)" value={(a as any).uri || ''} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, uri: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                            }))} />
                            <Input placeholder="Instructions (optional)" value={a.instructions || ''} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, instructions: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                            }))} />
                            <div className="flex items-start md:justify-end"><Button variant="accent" className="text-xs" onClick={() => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).filter((aa) => aa.id !== a.id) } } : sp) } : s),
                            }))}>Remove</Button></div>
                          </div>
                        </div>
                      ))}
                      {(spec.applicability?.materials || []).map((m) => (
                        <div key={m.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                          <div className="grid grid-cols-1 md:grid-cols-[2fr_4fr] gap-2">
                          <select title="Material operator" aria-label="Material operator" className="ds-input" value={m.operator || 'present'} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, materials: (sp.applicability?.materials || []).map((mm) => mm.id === m.id ? { ...mm, operator: ev.target.value as any } : mm) } } : sp) } : s),
                          }))}>
                            <option value="present">present</option>
                            <option value="equals">equals</option>
                            <option value="contains">contains</option>
                            <option value="matches">matches</option>
                          </select>
                          <Input placeholder="Value" value={(m.value as any) || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, materials: (sp.applicability?.materials || []).map((mm) => mm.id === m.id ? { ...mm, value: (ev.target as HTMLInputElement).value } : mm) } } : sp) } : s),
                          }))} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                            <Input placeholder="URI (optional)" value={(m as any).uri || ''} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, materials: (sp.applicability?.materials || []).map((mm) => mm.id === m.id ? { ...mm, uri: (ev.target as HTMLInputElement).value } : mm) } } : sp) } : s),
                            }))} />
                            <Input placeholder="Instructions (optional)" value={(m as any).instructions || ''} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, materials: (sp.applicability?.materials || []).map((mm) => mm.id === m.id ? { ...mm, instructions: (ev.target as HTMLInputElement).value } : mm) } } : sp) } : s),
                            }))} />
                            <div className="flex items-start md:justify-end"><Button variant="accent" className="text-xs" onClick={() => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, materials: (sp.applicability?.materials || []).filter((mm) => mm.id !== m.id) } } : sp) } : s),
                            }))}>Remove</Button></div>
                          </div>
                        </div>
                      ))}
                      {(spec.applicability?.partOf || []).map((po) => (
                        <div key={po.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                          <div className="grid grid-cols-1 md:grid-cols-[3fr_3fr_3fr] gap-2">
                          <select title="Part-of relation" aria-label="Part-of relation" className="ds-input" value={po.relation || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).map((pp) => pp.id === po.id ? { ...pp, relation: (ev.target as HTMLSelectElement).value as any } : pp) } } : sp) } : s),
                          }))}>
                            <option value="">Relation</option>
                            {IDS_RELATIONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <Input placeholder="Child Class" value={po.entity?.ifcClass || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).map((pp) => pp.id === po.id ? { ...pp, entity: { ...(pp.entity || { id: pp.id + '-ent' }), ifcClass: (ev.target as HTMLInputElement).value } } : pp) } } : sp) } : s),
                          }))} />
                          <Input placeholder="Child Predefined Type" value={po.entity?.predefinedType || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).map((pp) => pp.id === po.id ? { ...pp, entity: { ...(pp.entity || { id: pp.id + '-ent' }), predefinedType: (ev.target as HTMLInputElement).value } } : pp) } } : sp) } : s),
                          }))} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                            <Input placeholder="URI (optional)" value={(po as any).uri || ''} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).map((pp) => pp.id === po.id ? { ...pp, uri: (ev.target as HTMLInputElement).value } : pp) } } : sp) } : s),
                            }))} />
                            <Input placeholder="Instructions (optional)" value={po.instructions || ''} onChange={(ev) => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).map((pp) => pp.id === po.id ? { ...pp, instructions: (ev.target as HTMLInputElement).value } : pp) } } : sp) } : s),
                            }))} />
                            <div className="flex items-start md:justify-end"><Button variant="accent" className="text-xs" onClick={() => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).filter((pp) => pp.id !== po.id) } } : sp) } : s),
                            }))}>Remove</Button></div>
                          </div>
                        </div>
                      ))}
                      {(spec.applicability?.properties || []).map((p) => (
                        <div key={p.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                          <div className="grid grid-cols-1 md:grid-cols-[3fr_3fr_2fr_2fr_2fr_4fr] gap-2">                        <Input
                            placeholder="Property Set (e.g., Pset_WallCommon)"
                            value={p.propertySet || ""}
                            onChange={(e) =>
                              setIds((prev) => ({
                                ...prev,
                                sections: (prev.sections || []).map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        specifications: s.specifications.map((sp) =>
                                          sp.id === spec.id
                                            ? {
                                                ...sp,
                                                applicability: {
                                                  ...sp.applicability!,
                                                  properties: (sp.applicability?.properties || []).map((pp) =>
                                                    pp.id === p.id ? { ...pp, propertySet: e.target.value } : pp
                                                  ),
                                                },
                                              }
                                            : sp
                                        ),
                                      }
                                    : s
                                ),
                              }))
                            }
                          />
                            <PropertyBsddHelper dicts={selectedLibs} initialQuery={p.name || p.propertySet} onPick={(sel: any) => { if (sel.set) { setIds(prev => ({ ...prev, sections: (prev.sections || []).map(s => s.id===section.id ? { ...s, specifications: s.specifications.map(sp => sp.id===spec.id ? { ...sp, applicability: { ...sp.applicability!, properties: (sp.applicability?.properties || []).map(pp => pp.id===p.id ? { ...pp, propertySet: sel.set! } : pp) } } : sp) } : s) })); } if (sel.prop) { setIds(prev => ({ ...prev, sections: (prev.sections || []).map(s => s.id===section.id ? { ...s, specifications: s.specifications.map(sp => sp.id===spec.id ? { ...sp, applicability: { ...sp.applicability!, properties: (sp.applicability?.properties || []).map(pp => pp.id===p.id ? { ...pp, name: sel.prop!.name || sel.prop!.code || "", datatype: sel.prop!.dataType || "", uri: sel.prop!.uri || "" } : pp) } } : sp) } : s) })); } }} />
                          <Input
                            placeholder="Property Name (Base Name)"
                            value={p.name}
                            onChange={(e) =>
                              setIds((prev) => ({
                                ...prev,
                                sections: (prev.sections || []).map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        specifications: s.specifications.map((sp) =>
                                          sp.id === spec.id
                                            ? {
                                                ...sp,
                                                applicability: {
                                                  ...sp.applicability!,
                                                  properties: (sp.applicability?.properties || []).map((pp) =>
                                                    pp.id === p.id ? { ...pp, name: e.target.value } : pp
                                                  ),
                                                },
                                              }
                                            : sp
                                        ),
                                      }
                                    : s
                                ),
                              }))
                            }
                          />
                          <Input
                            placeholder="Datatype (e.g., IFCLABEL)"
                            value={p.datatype || ""}
                            onChange={(e) =>
                              setIds((prev) => ({
                                ...prev,
                                sections: (prev.sections || []).map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        specifications: s.specifications.map((sp) =>
                                          sp.id === spec.id
                                            ? {
                                                ...sp,
                                                applicability: {
                                                  ...sp.applicability!,
                                                  properties: (sp.applicability?.properties || []).map((pp) =>
                                                    pp.id === p.id ? { ...pp, datatype: e.target.value } : pp
                                                  ),
                                                },
                                              }
                                            : sp
                                        ),
                                      }
                                    : s
                                ),
                              }))
                            }
                          />
                          <Select
                            value={p.operator || "present"}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                              setIds((prev) => ({
                                ...prev,
                                sections: (prev.sections || []).map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        specifications: s.specifications.map((sp) =>
                                          sp.id === spec.id
                                            ? {
                                                ...sp,
                                                applicability: {
                                                  ...sp.applicability!,
                                                  properties: (sp.applicability?.properties || []).map((pp) =>
                                                    pp.id === p.id
                                                      ? {
                                                          ...pp,
                                                          operator: e.target.value as IDSPropertyRequirement["operator"],
                                                        }
                                                      : pp
                                                  ),
                                                },
                                              }
                                            : sp
                                        ),
                                      }
                                    : s
                                ),
                              }))
                            }
                          >
                            <option value="present">present</option>
                            <option value="equals">equals</option>
                            <option value="contains">contains</option>
                            <option value="in">in</option>
                            <option value="matches">matches</option>
                          </Select>
                          <Input
                            placeholder="Value"
                            value={(p.value as string) || ""}
                            onChange={(e) =>
                              setIds((prev) => ({
                                ...prev,
                                sections: (prev.sections || []).map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        specifications: s.specifications.map((sp) =>
                                          sp.id === spec.id
                                            ? {
                                                ...sp,
                                                applicability: {
                                                  ...sp.applicability!,
                                                  properties: (sp.applicability?.properties || []).map((pp) =>
                                                    pp.id === p.id ? { ...pp, value: e.target.value } : pp
                                                  ),
                                                },
                                              }
                                            : sp
                                        ),
                                      }
                                    : s
                                ),
                              }))
                            }
                          />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                            <Input placeholder="URI (optional)" value={p.uri || ''} onChange={(e) =>
                              setIds((prev) => ({
                                ...prev,
                                sections: (prev.sections || []).map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        specifications: s.specifications.map((sp) =>
                                          sp.id === spec.id
                                            ? {
                                                ...sp,
                                                applicability: {
                                                  ...sp.applicability!,
                                                  properties: (sp.applicability?.properties || []).map((pp) =>
                                                    pp.id === p.id ? { ...pp, uri: (e.target as HTMLInputElement).value } : pp
                                                  ),
                                                },
                                              }
                                            : sp
                                        ),
                                      }
                                    : s
                                ),
                              }))
                            }
                            />
                            <Input placeholder="Instructions (optional)" value={p.instructions || ''} onChange={(e) =>
                              setIds((prev) => ({
                                ...prev,
                                sections: (prev.sections || []).map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        specifications: s.specifications.map((sp) =>
                                          sp.id === spec.id
                                            ? {
                                                ...sp,
                                                applicability: {
                                                  ...sp.applicability!,
                                                  properties: (sp.applicability?.properties || []).map((pp) =>
                                                    pp.id === p.id ? { ...pp, instructions: (e.target as HTMLInputElement).value } : pp
                                                  ),
                                                },
                                              }
                                            : sp
                                        ),
                                      }
                                    : s
                                ),
                              }))
                            }
                            />
                            <div className="flex items-start md:justify-end">
                              <Button
                                variant="accent"
                                onClick={() =>
                                  setIds((prev) => ({
                                    ...prev,
                                    sections: (prev.sections || []).map((s) =>
                                      s.id === section.id
                                        ? {
                                            ...s,
                                            specifications: s.specifications.map((sp) =>
                                              sp.id === spec.id
                                                ? {
                                                    ...sp,
                                                    applicability: {
                                                      ...sp.applicability!,
                                                      properties: (sp.applicability?.properties || []).filter((pp) => pp.id !== p.id),
                                                    },
                                                  }
                                                : sp
                                            ),
                                          }
                                        : s
                                    ),
                                  }))
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  </div>
                  <div className="ml-8">
                    <h4 className="font-medium">Requirements</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-700">Add:</span>
                      <Button className="text-xs bg-gray-100" title="Object is an IfcEntity" variant="secondary" onClick={() =>
                        setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? {
                            ...s,
                            specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                              ...sp,
                              requirements: { ...sp.requirements, entities: [...(sp.requirements.entities || []), newEntity()] },
                            } : sp),
                          } : s),
                        }))
                      }>Entity</Button>
                      <Button className="text-xs bg-gray-100" title="Object has the classification" variant="secondary" onClick={() =>
                        setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? {
                            ...s,
                            specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                              ...sp,
                              requirements: { ...sp.requirements, classifications: [...(sp.requirements.classifications || []), newClassification()] },
                            } : sp),
                          } : s),
                        }))
                      }>Classification</Button>
                      <Button className="text-xs bg-gray-100" title="Object has the attribute" variant="secondary" onClick={() =>
                        setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? {
                            ...s,
                            specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                              ...sp,
                              requirements: { ...sp.requirements, attributes: [...(sp.requirements.attributes || []), newAttribute()] },
                            } : sp),
                          } : s),
                        }))
                      }>Attribute</Button>
                      <Button className="text-xs bg-gray-100" title="Object has the property" variant="secondary" onClick={() => addProperty(section.id, spec.id)}>Property</Button>
                      <Button className="text-xs bg-gray-100" title="Object has the material" variant="secondary" onClick={() =>
                        setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? {
                            ...s,
                            specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                              ...sp,
                              requirements: { ...sp.requirements, materials: [...(sp.requirements.materials || []), newMaterial()] },
                            } : sp),
                          } : s),
                        }))
                      }>Material</Button>
                      <Button className="text-xs bg-gray-100" title="Object is part of another entity" variant="secondary" onClick={() =>
                        setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? {
                            ...s,
                            specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                              ...sp,
                              requirements: { ...sp.requirements, partOf: [ ...(sp.requirements.partOf || []), { id: `part-${Math.random().toString(36).slice(2)}`, relation: 'IFCRELAGGREGATES', entity: newEntity() } ] },
                            } : sp),
                          } : s),
                        }))
                      }>Part Of</Button>
                    </div>
                    {/* Requirements facet editors (render existing entries) */}
                    {(spec.requirements.entities || []).map((e) => (
                      <div key={e.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr_3fr] gap-2">
                          <select title="Entity optionality" aria-label="Entity optionality" className="ds-input" value={e.optionality || "required"} onChange={(ev) =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? {
                              ...s,
                              specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                                ...sp,
                                requirements: {
                                  ...sp.requirements,
                                  entities: (sp.requirements.entities || []).map((ee) => ee.id === e.id ? { ...ee, optionality: ev.target.value as IDSOptionality } : ee),
                                },
                              } : sp),
                            } : s),
                          }))
                          }>
                            <option value="required">Required</option>
                            <option value="optional">Optional</option>
                            <option value="prohibited">Prohibited</option>
                          </select>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="p-0 h-6 w-12 rounded border flex items-center justify-center"
                              title="Pick from bSDD"
                              onClick={() => {
                                setEntityTarget({ scope: "requirements", sectionId: section.id, specId: spec.id, entityId: e.id });
                                setEntityInitialQuery(e.ifcClass || "");
                                setEntityPickOpen(true);
                              }}
                            >
                              <img src="/icons/bSDD.png" alt="Pick from bSDD" className="h-6 w-12 object-contain" />
                            </button>
                            <div className="flex-1">
                              <Input list={`req-ifc-classes-${e.id}`} placeholder="Class" value={e.ifcClass || ""} onChange={(ev) =>
                                setIds((prev) => ({
                                  ...prev,
                                  sections: (prev.sections || []).map((s) => s.id === section.id ? {
                                    ...s,
                                    specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                                      ...sp,
                                      requirements: { ...sp.requirements, entities: (sp.requirements.entities || []).map((ee) => ee.id === e.id ? { ...ee, ifcClass: (ev.target as HTMLInputElement).value } : ee) },
                                    } : sp),
                                  } : s),
                                }))
                              } onBlur={(ev) => applyEntityClassUriLookup("requirements", section.id, spec.id, e.id, (ev.target as HTMLInputElement).value)} />
                              <datalist id={`req-ifc-classes-${e.id}`}>
                                {(ifcClasses || []).map((c) => (
                                  <option key={c} value={c} />
                                ))}
                              </datalist>
                            </div>
                          </div>
                          {(ifcPredefs && ifcPredefs[(e.ifcClass || "").toUpperCase()] && ifcPredefs[(e.ifcClass || "").toUpperCase()].length) ? (
                            <select title="Predefined type" aria-label="Predefined type"
                              className="ds-input"
                              value={e.predefinedType || ""}
                              onChange={(ev) =>
                                applyEntityPredefinedType(
                                  "requirements",
                                  section.id,
                                  spec.id,
                                  e.id,
                                  e.ifcClass,
                                  (ev.target as HTMLSelectElement).value
                                )
                              }
                            >
                              <option value="">-- select predefined type --</option>
                              {ifcPredefs[(e.ifcClass || "").toUpperCase()].map((pt) => (
                                <option key={pt} value={pt}>{pt}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              placeholder="Predefined Type"
                              value={e.predefinedType || ""}
                              onChange={(ev) =>
                                applyEntityPredefinedType(
                                  "requirements",
                                  section.id,
                                  spec.id,
                                  e.id,
                                  e.ifcClass,
                                  (ev.target as HTMLInputElement).value
                                )
                              }
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                          <Input placeholder="URI (optional)" value={(e as any).uri || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, entities: (sp.requirements.entities || []).map((ee) => ee.id === e.id ? { ...ee, uri: (ev.target as HTMLInputElement).value } : ee) } } : sp) } : s),
                          }))} />
                          <Input placeholder="Instructions (optional)" value={(e as any).instructions || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, entities: (sp.requirements.entities || []).map((ee) => ee.id === e.id ? { ...ee, instructions: (ev.target as HTMLInputElement).value } : ee) } } : sp) } : s),
                          }))} />
                          <div className="flex items-start md:justify-end">
                            <Button variant="accent" onClick={() => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? {
                                ...s,
                                specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                                  ...sp,
                                  requirements: { ...sp.requirements, entities: (sp.requirements.entities || []).filter((ee) => ee.id !== e.id) },
                                } : sp),
                              } : s),
                            }))}>Remove</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(spec.requirements.classifications || []).map((c) => (
                      <div key={c.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                        <div className="grid grid-cols-1 md:grid-cols-[auto_2fr_2fr_2fr_2fr_2fr_auto] gap-2">
                          <select title="Classification optionality" aria-label="Classification optionality" className="ds-chip" value={c.optionality || "required"} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, optionality: ev.target.value as IDSOptionality } : cc) } } : sp) } : s),
                          }))}>
                            <option value="required">Required</option>
                            <option value="optional">Optional</option>
                            <option value="prohibited">Prohibited</option>
                          </select>
                          <button type="button" className="p-0 h-6 w-12 rounded border flex items-center justify-center" title="Pick from bSDD" onClick={() => { setClassifTarget({ scope: "requirements", sectionId: section.id, specId: spec.id, classifId: c.id }); setClassifInitialQuery(c.code || c.name || c.system || ""); setClassifPickOpen(true); }}><img src="/icons/bSDD.png" alt="Pick from bSDD" className="h-6 w-12 object-contain" /></button>
                        <Input placeholder="Classification System" value={c.system} onChange={(ev) =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? {
                              ...s,
                              specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                                ...sp,
                                requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, system: (ev.target as HTMLInputElement).value } : cc) },
                              } : sp),
                            } : s),
                          }))
                        } />
                        <Input placeholder="Code" value={c.code || ''} onChange={(ev) =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? {
                              ...s,
                              specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                                ...sp,
                                requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, code: (ev.target as HTMLInputElement).value } : cc) },
                              } : sp),
                            } : s),
                          }))
                        } />
                        <Input placeholder="Name (optional)" value={c.name || ''} onChange={(ev) =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? {
                              ...s,
                              specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                                ...sp,
                                requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, name: (ev.target as HTMLInputElement).value } : cc) },
                              } : sp),
                            } : s),
                          }))
                        } />
                         <select title="Classification operator" aria-label="Classification operator" className="ds-chip" value={c.operator || 'equals'} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, operator: (ev.target as HTMLSelectElement).value as any } : cc) } } : sp) } : s),
                        }))}>
                          <option value="equals">equals</option>
                          <option value="contains">contains</option>
                          <option value="in">in</option>
                          <option value="matches">matches</option>
                        </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2">
                          <Input placeholder="URI (optional)" value={c.uri || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, uri: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                        }))} />
                          <Input placeholder="Instructions (optional)" value={c.instructions || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, instructions: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                        }))} />
                          
                          <div className="flex items-start md:justify-end">
                            <Button variant="accent" className="text-xs" onClick={() =>
                            setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? {
                                ...s,
                                specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                                  ...sp,
                                  requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).filter((cc) => cc.id !== c.id) },
                                } : sp),
                              } : s),
                            }))
                          }>Remove</Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(spec.requirements.attributes || []).map((a) => (
                      <div key={a.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr_2fr_2fr_3fr] gap-2">
                         <select title="Attribute optionality" aria-label="Attribute optionality" className="ds-chip" value={a.optionality || "required"} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, optionality: ev.target.value as IDSOptionality } : aa) } } : sp) } : s),
                        }))}>
                          <option value="required">Required</option>
                          <option value="optional">Optional</option>
                          <option value="prohibited">Prohibited</option>
                        </select>
                        <Input placeholder="Attribute Name" value={a.name} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, name: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                        }))} />
                        <Input placeholder="Datatype" value={a.datatype || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, datatype: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                        }))} />
                         <select title="Attribute operator" aria-label="Attribute operator" className="ds-chip" value={a.operator || 'present'} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, operator: ev.target.value as any } : aa) } } : sp) } : s),
                        }))}>
                          <option value="present">present</option>
                          <option value="equals">equals</option>
                          <option value="contains">contains</option>
                          <option value="in">in</option>
                          <option value="matches">matches</option>
                          <AttrBsddHelper dicts={selectedLibs} initialQuery={a.name} onPick={(sel: any) => setIds(prev => ({ ...prev, sections: (prev.sections || []).map(s => s.id===section.id ? { ...s, specifications: s.specifications.map(sp => sp.id===spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map(aa => aa.id===a.id ? { ...aa, name: sel.name || sel.code || "", datatype: sel.dataType || "", uri: sel.uri || "" } : aa) } } : sp) } : s) }))} />
                        </select>
                        <Input placeholder="Value" value={(a.value as any) || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, value: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                        }))} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                          <Input placeholder="URI (optional)" value={(a as any).uri || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, uri: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                          }))} />
                          <Input placeholder="Instructions (optional)" value={a.instructions || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, instructions: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                          }))} />
                          <div className="flex items-start md:justify-end"><Button variant="accent" onClick={() => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).filter((aa) => aa.id !== a.id) } } : sp) } : s),
                          }))}>Remove</Button></div>
                        </div>
                      </div>
                    ))}

                    {(spec.requirements.materials || []).map((m) => (
                      <div key={m.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                        <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_3fr] gap-2">
                         <select title="Material optionality" aria-label="Material optionality" className="ds-chip" value={m.optionality || "required"} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, materials: (sp.requirements.materials || []).map((mm) => mm.id === m.id ? { ...mm, optionality: ev.target.value as IDSOptionality } : mm) } } : sp) } : s),
                        }))}>
                          <option value="required">Required</option>
                          <option value="optional">Optional</option>
                          <option value="prohibited">Prohibited</option>
                        </select>
                         <select title="Material operator" aria-label="Material operator" className="ds-chip" value={m.operator || 'present'} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, materials: (sp.requirements.materials || []).map((mm) => mm.id === m.id ? { ...mm, operator: ev.target.value as any } : mm) } } : sp) } : s),
                        }))}>
                          <option value="present">present</option>
                          <option value="equals">equals</option>
                          <option value="contains">contains</option>
                          <option value="matches">matches</option>
                        </select>
                        <Input placeholder="Value" value={(m.value as any) || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, materials: (sp.requirements.materials || []).map((mm) => mm.id === m.id ? { ...mm, value: (ev.target as HTMLInputElement).value } : mm) } } : sp) } : s),
                        }))} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                          <Input placeholder="URI (optional)" value={m.uri || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, materials: (sp.requirements.materials || []).map((mm) => mm.id === m.id ? { ...mm, uri: (ev.target as HTMLInputElement).value } : mm) } } : sp) } : s),
                          }))} />
                          <Input placeholder="Instructions (optional)" value={m.instructions || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, materials: (sp.requirements.materials || []).map((mm) => mm.id === m.id ? { ...mm, instructions: (ev.target as HTMLInputElement).value } : mm) } } : sp) } : s),
                          }))} />
                          <div className="flex items-start md:justify-end"><Button variant="accent" onClick={() => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, materials: (sp.requirements.materials || []).filter((mm) => mm.id !== m.id) } } : sp) } : s),
                          }))}>Remove</Button></div>
                        </div>
                      </div>
                    ))}

                    {(spec.requirements.partOf || []).map((po) => (
                      <div key={po.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr_3fr_3fr] gap-2">
                         <select title="Part-of optionality" aria-label="Part-of optionality" className="ds-chip" value={po.optionality || "required"} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, optionality: ev.target.value as IDSOptionality } : pp) } } : sp) } : s),
                        }))}>
                          <option value="required">Required</option>
                          <option value="optional">Optional</option>
                          <option value="prohibited">Prohibited</option>
                        </select>
                         <select title="Part-of relation" aria-label="Part-of relation" className="ds-chip w-40" value={po.relation || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, relation: (ev.target as HTMLSelectElement).value as any } : pp) } } : sp) } : s),
                        }))}>
                          <option value="">Relation</option>
                          {IDS_RELATIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <Input placeholder="Child Class" value={po.entity?.ifcClass || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, entity: { ...(pp.entity || { id: pp.id + '-ent' }), ifcClass: (ev.target as HTMLInputElement).value } } : pp) } } : sp) } : s),
                        }))} />
                        <Input placeholder="Child Predefined Type" value={po.entity?.predefinedType || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, entity: { ...(pp.entity || { id: pp.id + '-ent' }), predefinedType: (ev.target as HTMLInputElement).value } } : pp) } } : sp) } : s),
                        }))} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                          <Input placeholder="URI (optional)" value={(po as any).uri || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, uri: (ev.target as HTMLInputElement).value } : pp) } } : sp) } : s),
                          }))} />
                          <Input placeholder="Instructions (optional)" value={po.instructions || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, instructions: (ev.target as HTMLInputElement).value } : pp) } } : sp) } : s),
                          }))} />
                          <div className="flex items-start md:justify-end"><Button variant="accent" onClick={() => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).filter((pp) => pp.id !== po.id) } } : sp) } : s),
                          }))}>Remove</Button></div>
                        </div>
                      </div>
                    ))}
                    {spec.requirements.properties.map((p) => (
                      <div key={p.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
                        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr_3fr_2fr_2fr_2fr_4fr] gap-2">
                         <select title="Property optionality" aria-label="Property optionality" className="ds-chip" value={p.optionality || "required"} onChange={(e) =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? {
                              ...s,
                              specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                                ...sp,
                                requirements: { ...sp.requirements, properties: sp.requirements.properties.map((pp) => pp.id === p.id ? { ...pp, optionality: e.target.value as IDSOptionality } : pp) },
                              } : sp),
                            } : s),
                          }))
                        }>
                          <option value="required">Required</option>
                          <option value="optional">Optional</option>
                          <option value="prohibited">Prohibited</option>
                        </select>
                        <Input
                          placeholder="Property Set (e.g., Pset_WallCommon)"
                          value={p.propertySet || ""}
                          onChange={(e) =>
                            setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      specifications: s.specifications.map((sp) =>
                                        sp.id === spec.id
                                          ? {
                                              ...sp,
                                              requirements: {
                                                ...sp.requirements,
                                                properties: sp.requirements.properties.map((pp) =>
                                                  pp.id === p.id ? { ...pp, propertySet: e.target.value } : pp
                                                ),
                                              },
                                            }
                                          : sp
                                      ),
                                    }
                                  : s
                              ),
                            }))
                          }
                        />
                        <PropertyBsddHelper dicts={selectedLibs} initialQuery={p.name || p.propertySet} onPick={(sel: any) => { if (sel.set) { setIds(prev => ({ ...prev, sections: (prev.sections || []).map(s => s.id===section.id ? { ...s, specifications: s.specifications.map(sp => sp.id===spec.id ? { ...sp, requirements: { ...sp.requirements, properties: sp.requirements.properties.map(pp => pp.id===p.id ? { ...pp, propertySet: sel.set! } : pp) } } : sp) } : s) })); } if (sel.prop) { setIds(prev => ({ ...prev, sections: (prev.sections || []).map(s => s.id===section.id ? { ...s, specifications: s.specifications.map(sp => sp.id===spec.id ? { ...sp, requirements: { ...sp.requirements, properties: sp.requirements.properties.map(pp => pp.id===p.id ? { ...pp, name: sel.prop!.name || sel.prop!.code || "", datatype: sel.prop!.dataType || "", uri: sel.prop!.uri || "" } : pp) } } : sp) } : s) })); } }} />
                        <Input
                          placeholder="Name"
                          value={p.name}
                          onChange={(e) =>
                            setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      specifications: s.specifications.map((sp) =>
                                        sp.id === spec.id
                                          ? {
                                              ...sp,
                                              requirements: {
                                                ...sp.requirements,
                                                properties: sp.requirements.properties.map((pp) =>
                                                  pp.id === p.id ? { ...pp, name: e.target.value } : pp
                                                ),
                                              },
                                            }
                                          : sp
                                      ),
                                    }
                                  : s
                              ),
                            }))
                          }
                        />
                        <Input
                          placeholder="Datatype"
                          value={p.datatype || ""}
                          onChange={(e) =>
                            setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      specifications: s.specifications.map((sp) =>
                                        sp.id === spec.id
                                          ? {
                                              ...sp,
                                              requirements: {
                                                ...sp.requirements,
                                                properties: sp.requirements.properties.map((pp) =>
                                                  pp.id === p.id ? { ...pp, datatype: e.target.value } : pp
                                                ),
                                              },
                                            }
                                          : sp
                                      ),
                                    }
                                  : s
                              ),
                            }))
                          }
                        />
                         <select title="Property operator" aria-label="Property operator" className="ds-chip"
                          value={p.operator || "present"}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      specifications: s.specifications.map((sp) =>
                                        sp.id === spec.id
                                          ? {
                                              ...sp,
                                              requirements: {
                                                ...sp.requirements,
                                                properties: s.specifications
                                                  .find((ssp) => ssp.id === spec.id)!
                                                  .requirements.properties.map((pp) =>
                                                    pp.id === p.id
                                                      ? {
                                                          ...pp,
                                                          operator: e.target.value as IDSPropertyRequirement["operator"],
                                                        }
                                                      : pp
                                                  ),
                                              },
                                            }
                                          : sp
                                      ),
                                    }
                                  : s
                              ),
                            }))
                          }
                        >
                          <option value="present">present</option>
                          <option value="equals">equals</option>
                          <option value="contains">contains</option>
                          <option value="in">in</option>
                          <option value="matches">matches</option>
                        </select>
                        <Input
                          placeholder="Value"
                          value={(p.value as string) || ""}
                          onChange={(e) =>
                            setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      specifications: s.specifications.map((sp) =>
                                        sp.id === spec.id
                                          ? {
                                              ...sp,
                                              requirements: {
                                                ...sp.requirements,
                                                properties: sp.requirements.properties.map((pp) =>
                                                  pp.id === p.id ? { ...pp, value: e.target.value } : pp
                                                ),
                                              },
                                            }
                                          : sp
                                      ),
                                    }
                                  : s
                              ),
                            }))
                          }
                        />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                          <Input placeholder="URI (optional)" value={p.uri || ''} onChange={(e) =>
                            setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      specifications: s.specifications.map((sp) =>
                                        sp.id === spec.id
                                          ? {
                                              ...sp,
                                              requirements: {
                                                ...sp.requirements,
                                                properties: sp.requirements.properties.map((pp) =>
                                                  pp.id === p.id ? { ...pp, uri: (e.target as HTMLInputElement).value } : pp
                                                ),
                                              },
                                            }
                                          : sp
                                      ),
                                    }
                                  : s
                              ),
                            }))
                          }
                          />
                          <Input placeholder="Instructions (optional)" value={p.instructions || ''} onChange={(e) =>
                            setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      specifications: s.specifications.map((sp) =>
                                        sp.id === spec.id
                                          ? {
                                              ...sp,
                                              requirements: {
                                                ...sp.requirements,
                                                properties: sp.requirements.properties.map((pp) =>
                                                  pp.id === p.id ? { ...pp, instructions: (e.target as HTMLInputElement).value } : pp
                                                ),
                                              },
                                            }
                                          : sp
                                      ),
                                    }
                                  : s
                              ),
                            }))
                          }
                          />
                          <div className="flex items-start md:justify-end">
                            <Button variant="accent" onClick={() => removeProperty(section.id, spec.id, p.id)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} title="IDS XML Preview" footer={<Button onClick={() => setExportOpen(false)}>Close</Button>}>
        <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-all text-xs">{xmlPreview}</pre>
      </Dialog>

      {/* bSDD Entity Picker */}
      <BsddClassPicker
        open={entityPickOpen}
        onClose={() => setEntityPickOpen(false)}
        dicts={selectedLibs}
        initialQuery={entityInitialQuery}
        onPick={(r) => {
          if (!entityTarget) return;
          const apply = (updater: (sp: IDSSpecification) => IDSSpecification) => {
            setIds((prev) => ({
              ...prev,
              sections: (prev.sections || []).map((s) =>
                s.id === entityTarget.sectionId
                  ? {
                      ...s,
                      specifications: s.specifications.map((sp) =>
                        sp.id === entityTarget.specId ? updater(sp) : sp
                      ),
                    }
                  : s
              ),
            }));
          };
          const assign = (eList?: IDSEntityFacet[]) =>
            (eList || []).map((ee) =>
              ee.id === entityTarget.entityId
                ? { ...ee, ifcClass: r.referenceCode || r.name, uri: r.uri, predefinedType: "" }
                : ee
            );
          if (entityTarget.scope === "applicability") {
            apply((sp) => ({
              ...sp,
              applicability: { ...sp.applicability!, entities: assign(sp.applicability?.entities) },
            }));
          } else {
            apply((sp) => ({
              ...sp,
              requirements: { ...sp.requirements, entities: assign(sp.requirements.entities) },
            }));
          }
          setEntityPickOpen(false);
        }}
      />

      {/* bSDD Classification Picker */}
      <BsddClassPicker
        open={classifPickOpen}
        onClose={() => setClassifPickOpen(false)}
        dicts={classifLibs}
        initialQuery={classifInitialQuery}
        onPick={(r) => {
          if (!classifTarget) return;
          const apply = (updater: (sp: IDSSpecification) => IDSSpecification) => {
            setIds((prev) => ({
              ...prev,
              sections: (prev.sections || []).map((s) =>
                s.id === classifTarget.sectionId
                  ? {
                      ...s,
                      specifications: s.specifications.map((sp) =>
                        sp.id === classifTarget.specId ? updater(sp) : sp
                      ),
                    }
                  : s
              ),
            }));
          };
          const assign = (list?: IDSClassificationRequirement[]) =>
            (list || []).map((cc) =>
              cc.id === classifTarget.classifId
                ? {
                    ...cc,
                    system: (r.dictionaryName || r.dictionaryUri || cc.system || ""),
                    code: r.referenceCode || cc.code || "",
                    name: r.name || cc.name || "",
                    uri: r.uri || cc.uri || "",
                  }
                : cc
            );
          if (classifTarget.scope === "applicability") {
            apply((sp) => ({
              ...sp,
              applicability: { ...sp.applicability!, classifications: assign(sp.applicability?.classifications) },
            }));
          } else {
            apply((sp) => ({
              ...sp,
              requirements: { ...sp.requirements, classifications: assign(sp.requirements.classifications) },
            }));
          }
          setClassifPickOpen(false);
        }}
      />

      <Dialog open={validateOpen} onClose={() => setValidateOpen(false)} title="Validation Result" footer={<Button onClick={() => setValidateOpen(false)}>Close</Button>}>
        <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-all text-xs">{validation}</pre>
      </Dialog>
    </main>
  );
}





