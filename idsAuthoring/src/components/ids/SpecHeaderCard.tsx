"use client";
import { Input } from "@/components/ds/Input";
import { Button } from "@/components/ds/Button";
import { IDS_IFC_VERSIONS, type IDSOptionality, type IDSSpecification } from "@/lib/ids/types";
import { Textarea } from "@/components/ds/Textarea";
import { useIds } from "@/contexts/IdsContext";

export default function SpecHeaderCard({ sectionId, spec }: { sectionId: string; spec: IDSSpecification }) {
  const { setIds, removeSpecification } = useIds();
  return (
    <>
      {/* Row 1: Name + optionality */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="flex-1 min-w-[16rem]"
          placeholder="Specification name"
          value={(spec.name ?? spec.title) || ''}
          onChange={(e) =>
            setIds((prev) => ({
              ...prev,
              sections: (prev.sections || []).map((s) =>
                s.id === sectionId
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
                s.id === sectionId
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

      {/* Row 2: Identifier | Instructions | IFC Version | Remove */}
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[2fr_3fr_1fr_auto] items-center">
        <Input
          placeholder="Identifier (optional)"
          value={spec.identifier || ''}
          onChange={(e) =>
            setIds((prev) => ({
              ...prev,
              sections: (prev.sections || []).map((s) =>
                s.id === sectionId
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
                s.id === sectionId
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
                s.id === sectionId
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
        >
          {IDS_IFC_VERSIONS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <div className="flex justify-end">
          <Button variant="accent" onClick={() => removeSpecification(sectionId, spec.id)}>
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
              s.id === sectionId
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
    </>
  );
}

