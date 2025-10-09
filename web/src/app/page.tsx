"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";
import { Textarea } from "@/components/ds/Textarea";
import { Select } from "@/components/ds/Select";
import { Dialog } from "@/components/ds/Dialog";
import { exportToIDSXML, parseIDSXML } from "@/lib/ids/xml";
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
    title: "New Specification",
    description: "",
    optionality: "required",
    applicability: { ifcClass: "", entities: [], classifications: [], attributes: [], properties: [], materials: [], partOf: [] },
    requirements: { entities: [], classifications: [], attributes: [], properties: [newProperty()], materials: [], partOf: [], cardinality: "required" },
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
  const [libraries, setLibraries] = useState<{ id: string; name: string; code?: string; version?: string }[]>([]);
  const [selectedLibs, setSelectedLibs] = useState<string[]>([]);

  const xml = useMemo(() => exportToIDSXML(ids), [ids]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/bsdd/libraries");
        const data = await res.json();
        const libs = (data.libraries || []) as { id: string; name: string }[];
        setLibraries(libs);
        // Preselect IFC as default and always-on
        const defaultIFC = libs.filter((l) => /\bifc\b/i.test(l.name) || /\bifc\b/i.test(l.id)).map((l) => l.id);
        setSelectedLibs((prev) => Array.from(new Set([...(prev || []), ...defaultIFC, "ifc"])));
      } catch {}
    };
    load();
  }, []);

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
    const imported = await parseIDSXML(file);
    setIds(imported);
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
        <div className="ds-panel p-4">
          <h2 className="text-lg font-semibold">Header</h2>
          <label className="mt-2 block text-sm text-gray-700">Title</label>
          <Input
            value={ids.header.title}
            onChange={(e) => setIds({ ...ids, header: { ...ids.header, title: e.target.value } })}
          />
          <label className="mt-2 block text-sm text-gray-700">Description</label>
          <Textarea
            rows={3}
            value={ids.header.description || ""}
            onChange={(e) => setIds({ ...ids, header: { ...ids.header, description: e.target.value } })}
          />
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm text-gray-700">Author</label>
              <Input
                value={ids.header.author || ""}
                onChange={(e) => setIds({ ...ids, header: { ...ids.header, author: e.target.value } })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Date</label>
              <Input
                type="date"
                value={ids.header.date || ""}
                onChange={(e) => setIds({ ...ids, header: { ...ids.header, date: e.target.value } })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Version</label>
              <Input
                value={ids.header.version || ""}
                onChange={(e) => setIds({ ...ids, header: { ...ids.header, version: e.target.value } })}
              />
            </div>
          </div>
        </div>

        <div className="ds-panel p-4">
          <h2 className="text-lg font-semibold">Import / Export / Validate</h2>
          <div className="mt-2 flex items-center gap-3">
            <input type="file" accept=".ids,.xml" onChange={onImport} />
            <Button onClick={onExport}>Preview XML</Button>
            <Button variant="secondary" onClick={downloadXML}>Download XML</Button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <label className="text-sm">Validate with IFC</label>
            <input
              type="file"
              accept=".ifc,.ifczip"
              onChange={(e) => e.target.files && e.target.files[0] && onValidate(e.target.files[0])}
            />
          </div>
        </div>

        <div className="ds-panel p-4">
          <h2 className="text-lg font-semibold">bSDD Libraries</h2>
          <p className="mt-1 text-gray-600">Select which bSDD libraries to use. IFC is always enabled.</p>
          <div className="mt-2 grid gap-2">
            {libraries.map((lib) => {
              const isIfc = /\bifc\b/i.test(lib.name) || /\bifc\b/i.test(lib.id);
              const checked = isIfc || selectedLibs.includes(lib.id);
              return (
                <label key={lib.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isIfc}
                    onChange={(e) => {
                      setSelectedLibs((prev) => {
                        const set = new Set(prev);
                        if (e.target.checked) set.add(lib.id);
                        else set.delete(lib.id);
                        return Array.from(set);
                      });
                    }}
                  />
                  <span className="text-sm">{lib.name}</span>
                </label>
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
              <Button variant="ghost" onClick={() => removeSection(section.id)}>
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
                <div className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Specification title"
                    value={spec.title}
                    onChange={(e) =>
                      setIds((prev) => ({
                        ...prev,
                        sections: (prev.sections || []).map((s) =>
                          s.id === section.id
                            ? {
                                ...s,
                                specifications: s.specifications.map((sp) =>
                                  sp.id === spec.id ? { ...sp, title: e.target.value } : sp
                                ),
                              }
                            : s
                        ),
                      }))
                    }
                  />
                  <select
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
                    className="ds-input"
                  >
                    <option value="required">Required</option>
                    <option value="optional">Optional</option>
                    <option value="prohibited">Prohibited</option>
                  </select>
                  <Button variant="ghost" onClick={() => removeSpecification(section.id, spec.id)}>
                    Remove Spec
                  </Button>
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
                        <div key={e.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[3fr_3fr_auto]">
                          <Input placeholder="IFC Class" value={e.ifcClass || ""} onChange={(ev) =>
                            setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? {
                                ...s,
                                specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, entities: (sp.applicability?.entities || []).map((ee) => ee.id === e.id ? { ...ee, ifcClass: (ev.target as HTMLInputElement).value } : ee) } } : sp),
                              } : s),
                            }))
                          } />
                          <Input placeholder="Predefined Type (optional)" value={e.predefinedType || ""} onChange={(ev) =>
                            setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? {
                                ...s,
                                specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, entities: (sp.applicability?.entities || []).map((ee) => ee.id === e.id ? { ...ee, predefinedType: (ev.target as HTMLInputElement).value } : ee) } } : sp),
                              } : s),
                            }))
                          } />
                          <div className="flex items-center">
                            <Button variant="ghost" className="text-xs" onClick={() => setIds((prev) => ({
                              ...prev,
                              sections: (prev.sections || []).map((s) => s.id === section.id ? {
                                ...s,
                                specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, entities: (sp.applicability?.entities || []).filter((ee) => ee.id !== e.id) } } : sp),
                              } : s),
                            }))}>Remove</Button>
                          </div>
                        </div>
                      ))}
                      {(spec.applicability?.classifications || []).map((c) => (
                        <div key={c.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[3fr_3fr_auto]">
                          <Input placeholder="Classification System" value={c.system} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).map((cc) => cc.id === c.id ? { ...cc, system: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                          }))} />
                          <Input placeholder="Code" value={c.code || ""} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).map((cc) => cc.id === c.id ? { ...cc, code: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                          }))} />
                          <div className="flex items-center"><Button variant="ghost" className="text-xs" onClick={() => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).filter((cc) => cc.id !== c.id) } } : sp) } : s),
                          }))}>Remove</Button></div>
                        </div>
                      ))}
                      {(spec.applicability?.attributes || []).map((a) => (
                        <div key={a.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[3fr_2fr_2fr_3fr_auto]">
                          <Input placeholder="Attribute Name" value={a.name} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, name: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                          }))} />
                          <Input placeholder="Datatype" value={a.datatype || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, datatype: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                          }))} />
                          <select className="ds-input" value={a.operator || 'present'} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, operator: ev.target.value as any } : aa) } } : sp) } : s),
                          }))}>
                            <option value="present">present</option>
                            <option value="equals">equals</option>
                            <option value="contains">contains</option>
                            <option value="in">in</option>
                            <option value="matches">matches</option>
                          </select>
                          <Input placeholder="Value" value={(a.value as any) || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, value: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                          }))} />
                          <div className="flex items-center"><Button variant="ghost" className="text-xs" onClick={() => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).filter((aa) => aa.id !== a.id) } } : sp) } : s),
                          }))}>Remove</Button></div>
                        </div>
                      ))}
                      {(spec.applicability?.materials || []).map((m) => (
                        <div key={m.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[2fr_4fr_auto]">
                          <select className="ds-input" value={m.operator || 'present'} onChange={(ev) => setIds((prev) => ({
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
                          <div className="flex items-center"><Button variant="ghost" className="text-xs" onClick={() => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, materials: (sp.applicability?.materials || []).filter((mm) => mm.id !== m.id) } } : sp) } : s),
                          }))}>Remove</Button></div>
                        </div>
                      ))}
                      {(spec.applicability?.partOf || []).map((po) => (
                        <div key={po.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[3fr_3fr_3fr_auto]">
                          <Input placeholder="Relation (e.g., IFCRELAGGREGATES)" value={po.relation || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).map((pp) => pp.id === po.id ? { ...pp, relation: (ev.target as HTMLInputElement).value } : pp) } } : sp) } : s),
                          }))} />
                          <Input placeholder="Child IFC Class" value={po.entity?.ifcClass || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).map((pp) => pp.id === po.id ? { ...pp, entity: { ...(pp.entity || { id: pp.id + '-ent' }), ifcClass: (ev.target as HTMLInputElement).value } } : pp) } } : sp) } : s),
                          }))} />
                          <Input placeholder="Child Predefined Type" value={po.entity?.predefinedType || ''} onChange={(ev) => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).map((pp) => pp.id === po.id ? { ...pp, entity: { ...(pp.entity || { id: pp.id + '-ent' }), predefinedType: (ev.target as HTMLInputElement).value } } : pp) } } : sp) } : s),
                          }))} />
                          <div className="flex items-center"><Button variant="ghost" className="text-xs" onClick={() => setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).filter((pp) => pp.id !== po.id) } } : sp) } : s),
                          }))}>Remove</Button></div>
                        </div>
                      ))}
                      {(spec.applicability?.properties || []).map((p) => (
                        <div key={p.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[3fr_3fr_2fr_2fr_2fr_4fr_auto]">                        <Input
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
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
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
                      <div key={e.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[2fr_3fr_3fr_auto]">
                        <select className="ds-input" value={e.optionality || "required"} onChange={(ev) =>
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
                        <Input placeholder="IFC Class" value={e.ifcClass || ""} onChange={(ev) =>
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
                        } />
                        <Input placeholder="Predefined Type" value={e.predefinedType || ""} onChange={(ev) =>
                          setIds((prev) => ({
                            ...prev,
                            sections: (prev.sections || []).map((s) => s.id === section.id ? {
                              ...s,
                              specifications: s.specifications.map((sp) => sp.id === spec.id ? {
                                ...sp,
                                requirements: { ...sp.requirements, entities: (sp.requirements.entities || []).map((ee) => ee.id === e.id ? { ...ee, predefinedType: (ev.target as HTMLInputElement).value } : ee) },
                              } : sp),
                            } : s),
                          }))
                        } />
                        <div className="flex items-center">
                          <Button variant="ghost" onClick={() => setIds((prev) => ({
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
                    ))}
                    {(spec.requirements.classifications || []).map((c) => (
                      <div key={c.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[3fr_3fr_auto]">
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
                        <div className="flex items-center">
                          <Button variant="ghost" className="text-xs" onClick={() =>
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
                    ))}

                    {(spec.requirements.attributes || []).map((a) => (
                      <div key={a.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[2fr_3fr_2fr_2fr_3fr_auto]">
                        <select className="ds-input" value={a.optionality || "required"} onChange={(ev) => setIds((prev) => ({
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
                        <select className="ds-input" value={a.operator || 'present'} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, operator: ev.target.value as any } : aa) } } : sp) } : s),
                        }))}>
                          <option value="present">present</option>
                          <option value="equals">equals</option>
                          <option value="contains">contains</option>
                          <option value="in">in</option>
                          <option value="matches">matches</option>
                        </select>
                        <Input placeholder="Value" value={(a.value as any) || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, value: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                        }))} />
                        <div className="flex items-center"><Button variant="ghost" onClick={() => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).filter((aa) => aa.id !== a.id) } } : sp) } : s),
                        }))}>Remove</Button></div>
                      </div>
                    ))}

                    {(spec.requirements.materials || []).map((m) => (
                      <div key={m.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[2fr_2fr_3fr_auto]">
                        <select className="ds-input" value={m.optionality || "required"} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, materials: (sp.requirements.materials || []).map((mm) => mm.id === m.id ? { ...mm, optionality: ev.target.value as IDSOptionality } : mm) } } : sp) } : s),
                        }))}>
                          <option value="required">Required</option>
                          <option value="optional">Optional</option>
                          <option value="prohibited">Prohibited</option>
                        </select>
                        <select className="ds-input" value={m.operator || 'present'} onChange={(ev) => setIds((prev) => ({
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
                        <div className="flex items-center"><Button variant="ghost" onClick={() => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, materials: (sp.requirements.materials || []).filter((mm) => mm.id !== m.id) } } : sp) } : s),
                        }))}>Remove</Button></div>
                      </div>
                    ))}

                    {(spec.requirements.partOf || []).map((po) => (
                      <div key={po.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[2fr_3fr_3fr_3fr_auto]">
                        <select className="ds-input" value={po.optionality || "required"} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, optionality: ev.target.value as IDSOptionality } : pp) } } : sp) } : s),
                        }))}>
                          <option value="required">Required</option>
                          <option value="optional">Optional</option>
                          <option value="prohibited">Prohibited</option>
                        </select>
                        <Input placeholder="Relation (e.g., IFCRELAGGREGATES)" value={po.relation || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, relation: (ev.target as HTMLInputElement).value } : pp) } } : sp) } : s),
                        }))} />
                        <Input placeholder="Child IFC Class" value={po.entity?.ifcClass || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, entity: { ...(pp.entity || { id: pp.id + '-ent' }), ifcClass: (ev.target as HTMLInputElement).value } } : pp) } } : sp) } : s),
                        }))} />
                        <Input placeholder="Child Predefined Type" value={po.entity?.predefinedType || ''} onChange={(ev) => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, entity: { ...(pp.entity || { id: pp.id + '-ent' }), predefinedType: (ev.target as HTMLInputElement).value } } : pp) } } : sp) } : s),
                        }))} />
                        <div className="flex items-center"><Button variant="ghost" onClick={() => setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) => s.id === section.id ? { ...s, specifications: s.specifications.map((sp) => sp.id === spec.id ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).filter((pp) => pp.id !== po.id) } } : sp) } : s),
                        }))}>Remove</Button></div>
                      </div>
                    ))}
                    {spec.requirements.properties.map((p) => (
                      <div key={p.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[2fr_3fr_3fr_2fr_2fr_2fr_4fr_auto]">
                        <select className="ds-input" value={p.optionality || "required"} onChange={(e) =>
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
                        <div className="flex items-center">
                          <Button variant="ghost" onClick={() => removeProperty(section.id, spec.id, p.id)}>
                            Remove
                          </Button>
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

      <Dialog open={validateOpen} onClose={() => setValidateOpen(false)} title="Validation Result" footer={<Button onClick={() => setValidateOpen(false)}>Close</Button>}>
        <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-all text-xs">{validation}</pre>
      </Dialog>
    </main>
  );
}










