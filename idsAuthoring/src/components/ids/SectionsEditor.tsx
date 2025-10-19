"use client";
import { Button } from "@/components/ds/Button";
import SectionHeaderCard from "@/components/ids/SectionHeaderCard";
import SpecHeaderCard from "@/components/ids/SpecHeaderCard";
import ApplicabilityFacets from "@/components/ids/ApplicabilityFacets";
import RequirementsFacets from "@/components/ids/RequirementsFacets";
import { useIds } from "@/contexts/IdsContext";

export default function SectionsEditor() {
  const { ids, addSection, addSpecification } = useIds();
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sections</h2>
        <Button onClick={addSection}>Add Section</Button>
      </div>
      {(ids.sections || []).map((section) => (
        <div key={section.id} className="ds-panel grid gap-4 p-4">
          <SectionHeaderCard sectionId={section.id} />
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Specifications</h3>
            <Button variant="secondary" onClick={() => addSpecification(section.id)}>Add Specification</Button>
          </div>
          {section.specifications.map((spec) => (
            <div key={spec.id} className="rounded border p-3">
              <SpecHeaderCard sectionId={section.id} spec={spec} />
              <div className="mt-3">
                <ApplicabilityFacets sectionId={section.id} specId={spec.id} />
              </div>
              <div className="mt-6">
                <RequirementsFacets sectionId={section.id} specId={spec.id} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
