"use client";
import { useState } from "react";
import BsddClassPicker from "@/components/bsdd/BsddClassPicker";
import { fetchClassProperties } from "@/lib/bsdd/api";

type Props = {
  dicts: string[];
  onPick(setAndProp: { set?: string; prop?: { name?: string; code?: string; uri?: string; dataType?: string } }): void;
  initialQuery?: string;
};

export default function PropertyBsddHelper({ dicts, onPick, initialQuery }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery || "");
  const [sets, setSets] = useState<string[]>([]);
  const [bySet, setBySet] = useState<Record<string, { name?: string; code?: string; uri?: string; dataType?: string }[]>>({});
  const [selectedSet, setSelectedSet] = useState<string>("");
  const [allProps, setAllProps] = useState<{ name?: string; code?: string; uri?: string; dataType?: string }[]>([]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="p-0 h-6 w-12 rounded border flex items-center justify-center"
        title="Pick class from bSDD"
        onClick={() => setOpen(true)}
      >
        <img src="/icons/bSDD.png" alt="Pick from bSDD" className="h-6 w-12 object-contain" />
      </button>
      {sets.length ? (
        <>
          <select
            className="ds-input"
            value={selectedSet}
            onChange={(ev) => {
              const v = (ev.target as HTMLSelectElement).value;
              setSelectedSet(v);
              onPick({ set: v });
            }}
          >
            <option value="">Select set…</option>
            {sets.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {selectedSet && bySet[selectedSet] && bySet[selectedSet].length ? (
            <select
              className="ds-input"
              value=""
              onChange={(ev) => {
                const codeOrName = (ev.target as HTMLSelectElement).value;
                const sel = bySet[selectedSet].find((it) => (it.code || it.name) === codeOrName);
                if (sel) onPick({ prop: sel });
              }}
            >
              <option value="">Select property…</option>
              {bySet[selectedSet].map((it) => (
                <option key={(it.uri || it.code || it.name || Math.random()).toString()} value={it.code || it.name}>
                  {it.name || it.code}
                </option>
              ))}
            </select>
          ) : null}
        </>
      ) : allProps.length ? (
        <select
          className="ds-input"
          value=""
          onChange={(ev) => {
            const v = (ev.target as HTMLSelectElement).value;
            const sel = allProps.find((it) => (it.code || it.name) === v);
            if (sel) onPick({ prop: sel });
          }}
        >
          <option value="">Select property…</option>
          {allProps.map((it) => (
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
          const s = Array.from(new Set(props.map((p) => p.propertySet).filter(Boolean) as string[])).sort();
          const grouped: Record<string, { name?: string; code?: string; uri?: string; dataType?: string }[]> = {};
          for (const setName of s) grouped[setName] = [];
          const flat: { name?: string; code?: string; uri?: string; dataType?: string }[] = [];
          for (const p of props) {
            const entry = { name: p.propertyName, code: p.propertyCode, uri: p.propertyUri, dataType: p.dataType };
            flat.push(entry);
            const key = p.propertySet || "";
            if (key) (grouped[key] ||= []).push(entry);
          }
          setSets(s);
          setBySet(grouped);
          setAllProps(flat);
          setSelectedSet("");
          setOpen(false);
        }}
      />
    </div>
  );
}
