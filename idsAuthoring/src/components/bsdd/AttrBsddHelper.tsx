"use client";
import { useState } from "react";
import BsddClassPicker from "@/components/bsdd/BsddClassPicker";
import { fetchClassProperties } from "@/lib/bsdd/api";

type Props = {
  dicts: string[];
  onPick(prop: { name?: string; code?: string; uri?: string; dataType?: string }): void;
  initialQuery?: string;
};

export default function AttrBsddHelper({ dicts, onPick, initialQuery }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery || "");
  const [items, setItems] = useState<{ name?: string; code?: string; uri?: string; dataType?: string }[]>([]);

  return (
    <div className="flex items-center gap-2">
      <button type="button" className="p-0 h-6 w-12 rounded border flex items-center justify-center" title="Pick class from bSDD" onClick={() => setOpen(true)}>
        <img src="/icons/bSDD.png" alt="Pick from bSDD" className="h-6 w-12 object-contain" />
      </button>
      {items.length ? (
        <select className="ds-input" value="" onChange={(ev) => {
          const sel = items.find((it) => (it.code || it.name) === (ev.target as HTMLSelectElement).value);
          if (sel) onPick(sel);
        }}>
          <option value="">Select property…</option>
          {items.map((it) => (
            <option key={(it.uri || it.code || it.name || Math.random()).toString()} value={it.code || it.name}>
              {it.name || it.code}
            </option>
          ))}
        </select>
      ) : null}
      <BsddClassPicker
        open={open}
        onClose={() => setOpen(false)}
        dicts={dicts}
        initialQuery={query}
        onPick={async (r) => {
          setQuery(r.name || r.referenceCode || "");
          const props = await fetchClassProperties(r.uri || "");
          setItems(props.map((p) => ({ name: p.propertyName, code: p.propertyCode, uri: p.propertyUri, dataType: p.dataType })));
          setOpen(false);
        }}
      />
    </div>
  );
}
