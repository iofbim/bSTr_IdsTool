"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";
import { Textarea } from "@/components/ds/Textarea";
import { Select } from "@/components/ds/Select";
import { Dialog } from "@/components/ds/Dialog";
import { exportToIDSXML, parseIDSXML } from "@/lib/ids/xml";
import type { IDSPropertyRequirement, IDSRoot, IDSSpecification, IDSSection, IDSOptionality } from "@/lib/ids/types";

function newProperty(): IDSPropertyRequirement {
  return {
    id: `prop-${Math.random().toString(36).slice(2)}`,
    name: "",
    datatype: "",
    operator: "present",
    value: "",
  };
}

function newSpecification(): IDSSpecification {
  return {
    id: `spec-${Math.random().toString(36).slice(2)}`,
    title: "New Specification",
    description: "",
    optionality: "required",
    applicability: { ifcClass: "", properties: [] },
    requirements: { properties: [newProperty()] },
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
            <Button variant="secondary" onClick={downloadXML}>
              Download XML
            </Button>
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

                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium">Applicability</h4>
                    <label className="mt-2 block text-sm text-gray-700">IFC Class</label>
                    <Input
                      placeholder="IfcWall, IfcDoor, ..."
                      value={spec.applicability?.ifcClass || ""}
                      onChange={(e) =>
                        setIds((prev) => ({
                          ...prev,
                          sections: (prev.sections || []).map((s) =>
                            s.id === section.id
                              ? {
                                  ...s,
                                  specifications: s.specifications.map((sp) =>
                                    sp.id === spec.id
                                      ? { ...sp, applicability: { ...(sp.applicability || {}), ifcClass: e.target.value } }
                                      : sp
                                  ),
                                }
                              : s
                          ),
                        }))
                      }
                    />
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Property constraints</span>
                        <Button
                          variant="secondary"
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
                                                ...(sp.applicability || {}),
                                                properties: [...(sp.applicability?.properties || []), newProperty()],
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
                          Add Property
                        </Button>
                      </div>
                      {(spec.applicability?.properties || []).map((p) => (
                        <div key={p.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[3fr_3fr_2fr_2fr_4fr_auto]">
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

                  <div>
                    <h4 className="font-medium">Requirements</h4>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-700">Properties</span>
                      <Button variant="secondary" onClick={() => addProperty(section.id, spec.id)}>
                        Add Property
                      </Button>
                    </div>
                    {spec.requirements.properties.map((p) => (
                      <div key={p.id} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[3fr_3fr_2fr_2fr_4fr_auto]">
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
