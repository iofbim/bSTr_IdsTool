/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @next/next/no-img-element */
"use client";
/* Requirements facets aligned with IDS/Schema/ids.xsd (requirementsType)
   - entity (extends entityType): instructions?; cardinality not applicable (always required)
   - partOf*: relation?, entity; attributes: cardinality (conditional), instructions?
   - classification*: system, value?; attributes: uri?, cardinality (conditional), instructions?
   - attribute*: name, value?; attributes: cardinality (conditional), instructions?
   - property*: propertySet, baseName, value?; attribute: dataType?; attributes: uri?, cardinality (conditional), instructions?
   - material*: value?; attributes: uri?, cardinality (conditional), instructions?
*/
import { Input } from "@/components/ds/Input";
import { Button } from "@/components/ds/Button";
import { Select } from "@/components/ds/Select";
import { IDS_RELATIONS, type IDSOptionality } from "@/lib/ids/types";
import { useIds, newEntity, newClassification, newAttribute, newProperty } from "@/contexts/IdsContext";
import Image from "next/image";

export default function RequirementsFacets({ sectionId, specId }: { sectionId: string; specId: string }) {
  const { ids, setIds, ifcClasses, ifcPredefs, openClassifPicker } = useIds();
  const spec = ids.sections.find((s) => s.id === sectionId)!.specifications.find((sp) => sp.id === specId)!;
  const req = spec.requirements;

  function CardinalitySelect({ value, onChange, title = "Cardinality" }: { value?: IDSOptionality; onChange: (v: IDSOptionality) => void; title?: string }) {
    return (
      <Select title={title} aria-label={title} value={value || 'required'} onChange={(e) => onChange((e.target as HTMLSelectElement).value as IDSOptionality)}>
        <option value="required">Required</option>
        <option value="optional">Optional</option>
        <option value="prohibited">Prohibited</option>
      </Select>
    );
  }

  return (
    <div className="mt-3 grid gap-4">
      <div className="ml-4">
        <h4 className="font-medium">Requirements</h4>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-700">Add:</span>
          <Button className="text-xs bg-gray-100" variant="secondary" onClick={() => setIds((prev) => ({
            ...prev,
            sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, entities: [ ...(sp.requirements.entities || []), newEntity() ] } } : sp) } : s),
          }))}>Entity</Button>
          <Button className="text-xs bg-gray-100" variant="secondary" onClick={() => setIds((prev) => ({
            ...prev,
            sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, partOf: [ ...(sp.requirements.partOf || []), { id: `part-${Math.random().toString(36).slice(2)}`, relation: 'IFCRELAGGREGATES', entity: newEntity(), optionality: 'required' } ] } } : sp) } : s),
          }))}>Part Of</Button>
          <Button className="text-xs bg-gray-100" variant="secondary" onClick={() => setIds((prev) => ({
            ...prev,
            sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, classifications: [ ...(sp.requirements.classifications || []), { ...newClassification(), optionality: 'required' } ] } } : sp) } : s),
          }))}>Classification</Button>
          <Button className="text-xs bg-gray-100" variant="secondary" onClick={() => setIds((prev) => ({
            ...prev,
            sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, attributes: [ ...(sp.requirements.attributes || []), { ...newAttribute(), optionality: 'required' } ] } } : sp) } : s),
          }))}>Attribute</Button>
          <Button className="text-xs bg-gray-100" variant="secondary" onClick={() => setIds((prev) => ({
            ...prev,
            sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, properties: [ ...(sp.requirements.properties || []), { ...newProperty(), optionality: 'required' } ] } } : sp) } : s),
          }))}>Property</Button>
        </div>

        {/* Entity (no cardinality, instructions allowed) */}
        {(req.entities || []).map((e) => (
          <div key={e.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
            <div className="grid grid-cols-1 md:grid-cols-[3fr_3fr] gap-2">
              <div>
                <Input list={`req-ifc-classes-${e.id}`} placeholder="Class" value={e.ifcClass || ''} onChange={(ev) => setIds((prev) => ({
                  ...prev,
                  sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, entities: (sp.requirements.entities || []).map((ee) => ee.id === e.id ? { ...ee, ifcClass: (ev.target as HTMLInputElement).value } : ee) } } : sp) } : s),
                }))} />
                <datalist id={`req-ifc-classes-${e.id}`}>
                  {(ifcClasses || []).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              {(ifcPredefs && ifcPredefs[(e.ifcClass || '').toUpperCase()] && ifcPredefs[(e.ifcClass || '').toUpperCase()].length) ? (
                <Select title="Predefined type" aria-label="Predefined type" value={e.predefinedType || ''} onChange={(ev) => setIds((prev) => ({
                  ...prev,
                  sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, entities: (sp.requirements.entities || []).map((ee) => ee.id === e.id ? { ...ee, predefinedType: (ev.target as HTMLSelectElement).value } : ee) } } : sp) } : s),
                }))}>
                  <option value="">-- select predefined type --</option>
                  {ifcPredefs[(e.ifcClass || '').toUpperCase()].map((pt) => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </Select>
              ) : (
                <Input placeholder="Predefined Type (optional)" value={e.predefinedType || ''} onChange={(ev) => setIds((prev) => ({
                  ...prev,
                  sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, entities: (sp.requirements.entities || []).map((ee) => ee.id === e.id ? { ...ee, predefinedType: (ev.target as HTMLInputElement).value } : ee) } } : sp) } : s),
                }))} />
              )}
            </div>
            <Input placeholder="Instructions (optional)" value={e.instructions || ''} onChange={(ev) => setIds((prev) => ({
              ...prev,
              sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, entities: (sp.requirements.entities || []).map((ee) => ee.id === e.id ? { ...ee, instructions: (ev.target as HTMLInputElement).value } : ee) } } : sp) } : s),
            }))} />
          </div>
        ))}

        {/* Classifications */}
        {(req.classifications || []).map((c) => (
          <div key={c.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
            <div className="grid grid-cols-1 md:grid-cols-[auto_2fr_2fr_1fr] items-center gap-2 ">
              <button type="button" className="p-0 h-6 w-12 rounded border flex items-center justify-center" title="Pick from bSDD" onClick={() => openClassifPicker(c.value || "", { scope: "requirements", sectionId, specId, classifId: c.id })}>
                <Image src="/icons/bSDD.png" alt="Pick from bSDD" width={48} height={24} />
              </button>
              <Input placeholder="System" value={c.system} onChange={(ev) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, system: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
              }))} />
              <Input placeholder="Value" value={(c.value || '')} onChange={(ev) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, value: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
              }))} />
              <CardinalitySelect title="Classification cardinality" value={c.optionality} onChange={(v) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, optionality: v } : cc) } } : sp) } : s),
              }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr] gap-2 items-center">
              <Input placeholder="URI (optional)" value={c.uri || ''} onChange={(ev) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, uri: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
              }))} />
              <Input placeholder="Instructions (optional)" value={c.instructions || ''} onChange={(ev) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).map((cc) => cc.id === c.id ? { ...cc, instructions: (ev.target as HTMLInputElement).value } : cc) } } : sp) } : s),
              }))} />
            </div>
            <div className="flex items-start md:justify-end"><Button variant="accent" className="text-xs" onClick={() => setIds((prev) => ({
              ...prev,
              sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, classifications: (sp.requirements.classifications || []).filter((cc) => cc.id !== c.id) } } : sp) } : s),
            }))}>Remove</Button></div>
          </div>
        ))}

        {/* Attributes */}
        {(req.attributes || []).map((a) => (
          <div key={a.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr] items-center gap-2">
              <Input placeholder="Attribute Name" value={a.name} onChange={(ev) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, name: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
              }))} />
              <Input placeholder="Value (optional)" value={(a.value as string) || ''} onChange={(ev) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, value: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
              }))} />
              <CardinalitySelect title="Attribute cardinality" value={a.optionality} onChange={(v) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, optionality: v } : aa) } } : sp) } : s),
              }))} />
            </div>
            <Input placeholder="Instructions (optional)" value={a.instructions || ''} onChange={(ev) => setIds((prev) => ({
              ...prev,
              sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).map((aa) => aa.id === a.id ? { ...aa, instructions: (ev.target as HTMLInputElement).value } : aa) } } : sp) } : s),
            }))} />
            <div className="flex items-start md:justify-end"><Button variant="accent" className="text-xs" onClick={() => setIds((prev) => ({
              ...prev,
              sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, attributes: (sp.requirements.attributes || []).filter((aa) => aa.id !== a.id) } } : sp) } : s),
            }))}>Remove</Button></div>
          </div>
        ))}

        {/* Properties */}
        {(req.properties || []).map((p) => (
          <div key={p.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr] gap-2 items-center">
              <Input placeholder="Property Set" value={p.propertySet || ''} onChange={(e) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, properties: (sp.requirements.properties || []).map((pp) => pp.id === p.id ? { ...pp, propertySet: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
              }))} />
              <Input placeholder="Base Name" value={p.name} onChange={(e) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, properties: (sp.requirements.properties || []).map((pp) => pp.id === p.id ? { ...pp, name: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
              }))} />
              <CardinalitySelect title="Property cardinality" value={p.optionality} onChange={(v) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, properties: (sp.requirements.properties || []).map((pp) => pp.id === p.id ? { ...pp, optionality: v } : pp) } } : sp) } : s),
              }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_2fr] gap-2 items-center">
              <Input placeholder="Value (optional)" value={(p.value as string) || ''} onChange={(e) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, properties: (sp.requirements.properties || []).map((pp) => pp.id === p.id ? { ...pp, value: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
              }))} />
              <Input placeholder="Datatype (IFC TYPE)" value={p.datatype || ''} onChange={(e) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, properties: (sp.requirements.properties || []).map((pp) => pp.id === p.id ? { ...pp, datatype: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
              }))} />
              <Input placeholder="URI (optional)" value={p.uri || ''} onChange={(e) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, properties: (sp.requirements.properties || []).map((pp) => pp.id === p.id ? { ...pp, uri: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
              }))} />
            </div>
            <Input placeholder="Instructions (optional)" value={p.instructions || ''} onChange={(e) => setIds((prev) => ({
              ...prev,
              sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, properties: (sp.requirements.properties || []).map((pp) => pp.id === p.id ? { ...pp, instructions: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
            }))} />
            <div className="flex items-start md:justify-end"><Button variant="accent" className="text-xs" onClick={() => setIds((prev) => ({
              ...prev,
              sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, properties: (sp.requirements.properties || []).filter((pp) => pp.id !== p.id) } } : sp) } : s),
            }))}>Remove</Button></div>
          </div>
        ))}

        {/* Part Of */}
        {(req.partOf || []).map((po) => (
          <div key={po.id} className="ds-facet mt-2 grid grid-cols-1 gap-2">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr] gap-2 items-center">
              <Select title="Part Of relation" aria-label="Part Of relation" value={po.relation || ''} onChange={(e) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, relation: (e.target as HTMLSelectElement).value as any } : pp) } } : sp) } : s),
              }))}>
                <option value="">-- relation (optional) --</option>
                {IDS_RELATIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
              <Input placeholder="Entity class" value={po.entity?.ifcClass || ''} onChange={(e) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, entity: { ...(pp.entity || { id: `ent-${Math.random().toString(36).slice(2)}` }), ifcClass: (e.target as HTMLInputElement).value } } : pp) } } : sp) } : s),
              }))} />
              <CardinalitySelect title="Part Of cardinality" value={po.optionality as IDSOptionality} onChange={(v) => setIds((prev) => ({
                ...prev,
                sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, optionality: v } : pp) } } : sp) } : s),
              }))} />
            </div>
            <Input placeholder="Instructions (optional)" value={po.instructions || ''} onChange={(e) => setIds((prev) => ({
              ...prev,
              sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).map((pp) => pp.id === po.id ? { ...pp, instructions: (e.target as HTMLInputElement).value } : pp) } } : sp) } : s),
            }))} />
            <div className="flex items-start md:justify-end"><Button variant="accent" className="text-xs" onClick={() => setIds((prev) => ({
              ...prev,
              sections: prev.sections.map((s) => s.id === sectionId ? { ...s, specifications: s.specifications.map((sp) => sp.id === specId ? { ...sp, requirements: { ...sp.requirements, partOf: (sp.requirements.partOf || []).filter((pp) => pp.id !== po.id) } } : sp) } : s),
            }))}>Remove</Button></div>
          </div>
        ))}

      </div>
    </div>
  );
}
