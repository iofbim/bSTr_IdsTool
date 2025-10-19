"use client";
import BsddClassPicker from "@/components/bsdd/BsddClassPicker";
import type { IDSEntityFacet, IDSSpecification, IDSClassificationRequirement } from "@/lib/ids/types";
import { useIds } from "@/contexts/IdsContext";

export default function BsddPickersHost() {
  const {
    entityPickOpen, setEntityPickOpen, entityInitialQuery, entityTarget,
    classifPickOpen, setClassifPickOpen, classifInitialQuery, classifTarget,
    selectedLibs, classifLibs, setIds,
  } = useIds();

  return (
    <>
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
                    value: r.referenceCode || r.name || cc.value || "",
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
    </>
  );
}
