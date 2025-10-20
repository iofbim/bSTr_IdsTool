/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @next/next/no-img-element */
"use client";
/* Facets aligned with IDS/Schema/ids.xsd (applicabilityType)
   - entity: 0..1 (name, predefinedType)
   - partOf: 0..* (relation?, entity)
   - classification: 0..* (system idsValue, value idsValue?)
   - attribute: 0..* (name idsValue, value idsValue?) [no datatype field in XSD]
   - property: 0..* (propertySet idsValue, baseName idsValue, value idsValue?) with dataType attribute
   - material: 0..* (value idsValue?)
*/
import { Input } from "@/components/ds/Input";
import { Button } from "@/components/ds/Button";
import { Select } from "@/components/ds/Select";
import { IDS_RELATIONS } from "@/lib/ids/types";
import { useIds, newEntity, newClassification, newAttribute, newProperty, newMaterial } from "@/contexts/IdsContext";
import Image from "next/image";

export default function ApplicabilityFacets({ sectionId, specId }: { sectionId: string; specId: string }) {
  const { ids, setIds, ifcClasses, ifcPredefs, openEntityPicker, openClassifPicker } = useIds();
  const spec = ids.sections.find((s) => s.id === sectionId)!.specifications.find((sp) => sp.id === specId)!;
  const app = spec.applicability || {};

  return (
    <div className="mt-3 grid gap-4">
      <div className="ml-4">
        <h4 className="font-medium">Applicability</h4>
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-700">Add:</span>
            <Button className="text-xs bg-gray-100" variant="secondary" onClick={() =>
              setIds((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        specifications: s.specifications.map((sp) =>
                          sp.id === specId
                            ? {
                                ...sp,
                                applicability: {
                                  ...(sp.applicability || {}),
                                  entities: (sp.applicability?.entities && sp.applicability.entities.length > 0)
                                    ? sp.applicability.entities
                                    : [newEntity()],
                                },
                              }
                            : sp
                        ),
                      }
                    : s
                ),
              }))
            }>Entity</Button>
            <Button className="text-xs bg-gray-100" variant="secondary" onClick={() =>
              setIds((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        specifications: s.specifications.map((sp) =>
                          sp.id === specId
                            ? {
                                ...sp,
                                applicability: {
                                  ...(sp.applicability || {}),
                                  classifications: [ ...(sp.applicability?.classifications || []), newClassification() ],
                                },
                              }
                            : sp
                        ),
                      }
                    : s
                ),
              }))
            }>Classification</Button>
            <Button className="text-xs bg-gray-100" variant="secondary" onClick={() =>
              setIds((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        specifications: s.specifications.map((sp) =>
                          sp.id === specId
                            ? {
                                ...sp,
                                applicability: {
                                  ...(sp.applicability || {}),
                                  attributes: [ ...(sp.applicability?.attributes || []), newAttribute() ],
                                },
                              }
                            : sp
                        ),
                      }
                    : s
                ),
              }))
            }>Attribute</Button>
            <Button className="text-xs bg-gray-100" variant="secondary" onClick={() =>
              setIds((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        specifications: s.specifications.map((sp) =>
                          sp.id === specId
                            ? {
                                ...sp,
                                applicability: {
                                  ...(sp.applicability || {}),
                                  properties: [ ...(sp.applicability?.properties || []), newProperty() ],
                                },
                              }
                            : sp
                        ),
                      }
                    : s
                ),
              }))
            }>Property</Button>
            <Button className="text-xs bg-gray-100" variant="secondary" onClick={() =>
              setIds((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        specifications: s.specifications.map((sp) =>
                          sp.id === specId
                            ? {
                                ...sp,
                                applicability: {
                                  ...(sp.applicability || {}),
                                  materials: [ ...(sp.applicability?.materials || []), newMaterial() ],
                                },
                              }
                            : sp
                        ),
                      }
                    : s
                ),
              }))
            }>Material</Button>
            <Button className="text-xs bg-gray-100" variant="secondary" onClick={() =>
              setIds((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        specifications: s.specifications.map((sp) =>
                          sp.id === specId
                            ? {
                                ...sp,
                                applicability: {
                                  ...(sp.applicability || {}),
                                  partOf: [ ...(sp.applicability?.partOf || []), { id: `part-${Math.random().toString(36).slice(2)}`, relation: 'IFCRELAGGREGATES', entity: newEntity() } ],
                                },
                              }
                            : sp
                        ),
                      }
                    : s
                ),
              }))
            }>Part Of</Button>
          </div>

          {/* Entity (0..1) */}
          {(app.entities || []).slice(0,1).map((e) => (
            <div key={e.id} className="ds-facet mt-2 grid grid-cols-[12px_1fr] gap-2">
              <div className="w-[12px] overflow-hidden flex items-stretch justify-center"><div className="inline-block leading-none text-[8px] text-gray-500 uppercase tracking-wide rotate-180 [writing-mode:vertical-rl] text-right select-none">entity</div></div>
              <div className="relative">
                <Button
                  variant="danger"
                  className="hidden"
                  onClick={() => setIds((prev) => ({
                    ...prev,
                    sections: (prev.sections || []).map((s) => s.id === sectionId ? {
                      ...s,
                      specifications: s.specifications.map((sp) => sp.id === specId ? {
                        ...sp,
                        applicability: { ...sp.applicability!, entities: [] },
                      } : sp),
                    } : s),
                  }))}
                  aria-label="Remove entity"
                  title="Remove"
                >
                  Ã—
                </Button>
              <div className="grid grid-cols-1 md:grid-cols-[auto_2fr_2fr_auto] items-center gap-2">
                <button type="button" className="p-0 h-6 w-12 rounded border flex items-center justify-center" title="Pick from bSDD" onClick={() => openEntityPicker(e.ifcClass || "", { scope: "applicability", sectionId, specId, entityId: e.id })}>
                  <Image src="/icons/bSDD.png" alt="Pick from bSDD" width={48} height={24} />
                </button>
                <div>
                  <Input list={`ifc-classes-${e.id}`} placeholder="Class" value={e.ifcClass || ""} onChange={(ev) =>
                    setIds((prev) => ({
                      ...prev,
                      sections: (prev.sections || []).map((s) => s.id === sectionId ? {
                        ...s,
                        specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, entities: (sp.applicability?.entities || []).map((ee) => ee.id === e.id ? { ...ee, ifcClass: (ev.target as HTMLInputElement).value } : ee) } } : sp),
                      } : s),
                    }))
                  } />
                  <datalist id={`ifc-classes-${e.id}`}>
                    {(ifcClasses || []).map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Input
                    placeholder="Predefined Type (optional) - Select or Type your own."
                    list={`app-predefs-${e.id}`}
                    value={e.predefinedType || ""}
                    onChange={(ev) => setIds((prev) => ({
                      ...prev,
                      sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, entities: (sp.applicability?.entities || []).map((ee) => ee.id === e.id ? { ...ee, predefinedType: (ev.target as HTMLInputElement).value } : ee) } } : sp) } : s),
                    }))}
                  />
                  {(ifcPredefs && ifcPredefs[(e.ifcClass || "").toUpperCase()] && ifcPredefs[(e.ifcClass || "").toUpperCase()].length) && (
                    <datalist id={`app-predefs-${e.id}`}>
                      {ifcPredefs[(e.ifcClass || "").toUpperCase()].map((pt) => (
                        <option key={pt} value={pt} />
                      ))}
                    </datalist>
                  )}
                </div>
                  <div className="flex justify-end">
                    <Button
                      variant="danger"
                      className="text-xs h-7 w-7 p-0 rounded-md leading-none"
                      onClick={() => setIds((prev) => ({
                        ...prev,
                        sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, entities: [] } } : sp) } : s),
                      }))}
                      aria-label="Remove entity"
                      title="Remove"
                    >
                      ×
                    </Button>
                  </div>
                </div>
                </div>
              </div>
          ))}

          {/* Classifications */}
          {(app.classifications || []).map((c) => (
            <div key={c.id} className="ds-facet mt-2 grid grid-cols-[12px_1fr] gap-2">
              <div className="w-[12px] overflow-hidden flex items-stretch justify-center"><div className="inline-block leading-none text-[8px] text-gray-500 uppercase tracking-wide rotate-180 [writing-mode:vertical-rl] text-right select-none overflow-hidden">classification</div></div>
              <div className="relative">
                <Button
                  variant="danger"
                  className="hidden"
                  onClick={() => setIds((prev) => ({
                    ...prev,
                    sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).filter((cc) => cc.id !== c.id) } } : sp) } : s),
                  }))}
                  aria-label="Remove classification"
                  title="Remove"
                >
                  Ã—
                </Button>
              <div className="grid grid-cols-1 md:grid-cols-[auto_2fr_2fr_auto] items-center gap-2 ">
                <button type="button" className="p-0 h-6 w-12 rounded border flex items-center justify-center" title="Pick from bSDD" onClick={() => openClassifPicker(c.value || "", { scope: "applicability", sectionId, specId, classifId: c.id })}>
                  <Image src="/icons/bSDD.png" alt="Pick from bSDD" width={48} height={24} />
                </button>
                <Input placeholder="System" value={c.system} onChange={(ev) => setIds((prev) => ({
                  ...prev,
                  sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).map((cc) => cc.id === c.id ? { ...cc, system: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                }))} />
                <Input placeholder="Value" value={(c.value || '')} onChange={(ev) => setIds((prev) => ({
                  ...prev,
                  sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, classifications: (sp.applicability?.classifications || []).map((cc) => cc.id === c.id ? { ...cc, value: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
                }))} />
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    className="text-xs h-7 w-7 p-0 rounded-md leading-none"
                    onClick={() => setIds((prev) => ({
                      ...prev,
                      sections: (prev.sections || []).map((s) =>
                        s.id === sectionId
                          ? {
                              ...s,
                              specifications: s.specifications.map((sp) =>
                                sp.id === specId
                                  ? {
                                      ...sp,
                                      applicability: {
                                        ...sp.applicability!,
                                        classifications: (sp.applicability?.classifications || []).filter((cc) => cc.id !== c.id),
                                      },
                                    }
                                  : sp
                              ),
                            }
                          : s
                      ),
                    }))}
                    aria-label="Remove classification"
                    title="Remove"
                  >
                    ×
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[auto] gap-2"></div>
              </div>
            </div>
          ))}

          {/* Attributes (no datatype in XSD) */}
          {(app.attributes || []).map((a) => (
            <div key={a.id} className="ds-facet mt-2 grid grid-cols-[12px_1fr] gap-2">
              <div className="w-[12px] overflow-hidden flex items-stretch justify-center"><div className="inline-block leading-none text-[8px] text-gray-500 uppercase tracking-wide rotate-180 [writing-mode:vertical-rl] text-right select-none">attribute</div></div>
              <div className="relative">
                <Button
                  variant="danger"
                  className="hidden"
                  onClick={() => setIds((prev) => ({
                    ...prev,
                    sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).filter((aa) => aa.id !== a.id) } } : sp) } : s),
                  }))}
                  aria-label="Remove attribute"
                  title="Remove"
                >
                  Ã—
                </Button>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_auto] items-center gap-2">
                <Input placeholder="Attribute Name" value={a.name} onChange={(ev) => setIds((prev) => ({
                  ...prev,
                  sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, name: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                }))} />
                <Input placeholder="Value (optional)" value={(a.value as string) || ''} onChange={(ev) => setIds((prev) => ({
                  ...prev,
                  sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).map((aa) => aa.id === a.id ? { ...aa, value: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
                }))} />
                <div className="flex justify-end">
                  <Button variant="danger" className="text-xs h-7 w-7 p-0 rounded-md leading-none" onClick={() => setIds((prev) => ({
                    ...prev,
                    sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, attributes: (sp.applicability?.attributes || []).filter((aa) => aa.id !== a.id) } } : sp) } : s),
                  }))} aria-label="Remove attribute" title="Remove">×</Button>
                </div>
              </div>
              
              </div>
            </div>
          ))}

          {/* Properties */}
          {(app.properties || []).map((p) => (
            <div key={p.id} className="ds-facet mt-2 grid grid-cols-[12px_1fr] gap-2">
              <div className="w-[12px] overflow-hidden flex items-stretch justify-center"><div className="inline-block leading-none text-[8px] text-gray-500 uppercase tracking-wide rotate-180 [writing-mode:vertical-rl] text-right select-none">property</div></div>
              <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_auto] gap-2 items-center">
                <Input placeholder="Property Set" value={p.propertySet || ''} onChange={(e) => setIds((prev) => ({
                  ...prev,
                  sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, properties: (sp.applicability?.properties || []).map((pp) => pp.id === p.id ? { ...pp, propertySet: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
                }))} />
                <Input placeholder="Base Name" value={p.name} onChange={(e) => setIds((prev) => ({
                  ...prev,
                  sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, properties: (sp.applicability?.properties || []).map((pp) => pp.id === p.id ? { ...pp, name: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
                }))} />
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    className="text-xs h-7 w-7 p-0 rounded-md leading-none"
                    onClick={() => setIds((prev) => ({
                      ...prev,
                      sections: (prev.sections || []).map((s) =>
                        s.id === sectionId
                          ? {
                              ...s,
                              specifications: s.specifications.map((sp) =>
                                sp.id === specId
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
                    }))}
                    aria-label="Remove property"
                    title="Remove"
                  >
                    ×
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-2 items-center">
                <Input placeholder="Value (optional)" value={(p.value as string) || ''} onChange={(e) => setIds((prev) => ({
                  ...prev,
                  sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, properties: (sp.applicability?.properties || []).map((pp) => pp.id === p.id ? { ...pp, value: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
                }))} />
                <Input placeholder="Datatype (IFC TYPE)" value={p.datatype || ''} onChange={(e) => setIds((prev) => ({
                  ...prev,
                  sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, properties: (sp.applicability?.properties || []).map((pp) => pp.id === p.id ? { ...pp, datatype: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
                }))} />
                 
              </div>
              </div>
            </div>
          ))}

          {/* Materials */}
          {(app.materials || []).map((m) => (
            <div key={m.id} className="ds-facet mt-2 grid grid-cols-[12px_1fr] gap-2">
              <div className="w-[12px] overflow-hidden flex items-stretch justify-center"><div className="inline-block leading-none text-[8px] text-gray-500 uppercase tracking-wide rotate-180 [writing-mode:vertical-rl] text-right select-none">material</div></div>
              <div className="relative">
                <Button
                  variant="danger"
                  className="hidden"
                  onClick={() => setIds((prev) => ({
                    ...prev,
                    sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, materials: (sp.applicability?.materials || []).filter((mm) => mm.id !== m.id) } } : sp) } : s),
                  }))}
                  aria-label="Remove material"
                  title="Remove"
                >
                  Ã—
                </Button>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_auto] gap-2 items-center">
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    className="text-xs h-7 w-7 p-0 rounded-md leading-none"
                    onClick={() => setIds((prev) => ({
                      ...prev,
                      sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, materials: (sp.applicability?.materials || []).filter((mm) => mm.id !== m.id) } } : sp) } : s),
                    }))}
                    aria-label="Remove material"
                    title="Remove"
                  >
                    ×
                  </Button>
                </div>
                <Input
                  placeholder="Material (optional)"
                  value={m.value || ''}
                  onChange={(e) =>
                    setIds((prev) => ({
                      ...prev,
                      sections: (prev.sections || []).map((s) =>
                        s.id === sectionId
                          ? {
                              ...s,
                              specifications: s.specifications.map((sp) =>
                                sp.id === specId
                                  ? {
                                      ...sp,
                                      applicability: {
                                        ...sp.applicability!,
                                        materials: (sp.applicability?.materials || []).map((mm) =>
                                          mm.id === m.id
                                            ? { ...mm, value: (e.target as HTMLInputElement).value }
                                            : mm
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
              </div>
            </div>
          ))}

          {/* Part Of */}
          {(app.partOf || []).map((po) => (
            <div key={po.id} className="ds-facet mt-2 grid grid-cols-[12px_1fr] gap-2">
              <div className="w-[12px] overflow-hidden flex items-stretch justify-center"><div className="inline-block leading-none text-[8px] text-gray-500 uppercase tracking-wide rotate-180 [writing-mode:vertical-rl] text-right select-none">part of</div></div>
              <div className="relative">
                <Button
                  variant="accent"
                  className="hidden"
                  onClick={() => setIds((prev) => ({
                    ...prev,
                    sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).filter((pp) => pp.id !== po.id) } } : sp) } : s),
                  }))}
                  aria-label="Remove part of"
                  title="Remove"
                >
                  Ã—
                </Button>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_auto] gap-2 items-center">
                <Select title="Part Of relation" aria-label="Part Of relation" value={po.relation || ''} onChange={(e) => setIds((prev) => ({
                  ...prev,
                  sections: (prev.sections || []).map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, applicability: { ...sp.applicability!, partOf: (sp.applicability?.partOf || []).map((pp) => pp.id === po.id ? { ...pp, relation: (e.target as HTMLSelectElement).value as any } : pp) } } : sp) } : s),
                }))}>
                  <option value="">-- relation (optional) --</option>
                  {IDS_RELATIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
                <Input
                  placeholder="Entity class"
                  value={po.entity?.ifcClass || ''}
                  onChange={(e) =>
                    setIds((prev) => ({
                      ...prev,
                      sections: (prev.sections || []).map((s) =>
                        s.id === sectionId
                          ? {
                              ...s,
                              specifications: s.specifications.map((sp) =>
                                sp.id === specId
                                  ? {
                                      ...sp,
                                      applicability: {
                                        ...sp.applicability!,
                                        partOf: (sp.applicability?.partOf || []).map((pp) =>
                                          pp.id === po.id
                                            ? {
                                                ...pp,
                                                entity: {
                                                  ...(pp.entity || { id: `ent-${Math.random().toString(36).slice(2)}` }),
                                                  ifcClass: (e.target as HTMLInputElement).value,
                                                },
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
                />
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    className="text-xs h-7 w-7 p-0 rounded-md leading-none"
                    onClick={() =>
                      setIds((prev) => ({
                        ...prev,
                        sections: (prev.sections || []).map((s) =>
                          s.id === sectionId
                            ? {
                                ...s,
                                specifications: s.specifications.map((sp) =>
                                  sp.id === specId
                                    ? {
                                        ...sp,
                                        applicability: {
                                          ...sp.applicability!,
                                          partOf: (sp.applicability?.partOf || []).filter(
                                            (pp) => pp.id !== po.id
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
                    aria-label="Remove part of"
                    title="Remove"
                  >
                    ×
                  </Button>
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


