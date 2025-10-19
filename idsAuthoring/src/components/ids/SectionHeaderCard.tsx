"use client";
import { Input } from "@/components/ds/Input";
import { Textarea } from "@/components/ds/Textarea";
import { Button } from "@/components/ds/Button";
import { useIds } from "@/contexts/IdsContext";

export default function SectionHeaderCard({ sectionId }: { sectionId: string }) {
  const { ids, setIds, removeSection } = useIds();
  const section = (ids.sections || []).find((s) => s.id === sectionId)!;
  return (
    <>
      <div className="flex items-center gap-2">
        <Input
          className="flex-1"
          placeholder="Section title"
          value={section.title}
          onChange={(e) =>
            setIds((prev) => ({
              ...prev,
              sections: (prev.sections || []).map((s) => (s.id === sectionId ? { ...s, title: e.target.value } : s)),
            }))
          }
        />
        <Button variant="accent" onClick={() => removeSection(sectionId)}>
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
            sections: (prev.sections || []).map((s) => (s.id === sectionId ? { ...s, description: e.target.value } : s)),
          }))
        }
      />
    </>
  );
}

