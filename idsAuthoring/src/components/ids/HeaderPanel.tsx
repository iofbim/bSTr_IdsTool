"use client";
import { Input } from "@/components/ds/Input";
import { Textarea } from "@/components/ds/Textarea";
import { useIds } from "@/contexts/IdsContext";

export default function HeaderPanel() {
  const { ids, setIds } = useIds();
  return (
    <div className="ds-panel p-3">
      <Input
        value={ids.header.title}
        placeholder="Title"
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
          placeholder="Author (email preferred)"
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
      <div className="mt-1 grid grid-cols-3 gap-2">
        <Input
          placeholder="Copyright"
          value={ids.header.copyright || ""}
          onChange={(e) => setIds({ ...ids, header: { ...ids.header, copyright: e.target.value } })}
        />
        <Input
          placeholder="Purpose"
          value={ids.header.purpose || ""}
          onChange={(e) => setIds({ ...ids, header: { ...ids.header, purpose: e.target.value } })}
        />
        <Input
          placeholder="Milestone"
          value={ids.header.milestone || ""}
          onChange={(e) => setIds({ ...ids, header: { ...ids.header, milestone: e.target.value } })}
        />
      </div>
    </div>
  );
}
