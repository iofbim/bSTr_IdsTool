"use client";

import { useEffect, useMemo } from "react";
import { Input } from "@/components/ds/Input";
import { useBsddLibraries } from "@/hooks/useBsdd";

type Props = {
  selected: string[];
  onChange(selected: string[]): void;
  includeTest: boolean;
  onIncludeTestChange(v: boolean): void;
  query: string;
  onQueryChange(v: string): void;
};

const IFC_43 = "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3";

export default function BsddLibrarySelector({
  selected,
  onChange,
  includeTest,
  onIncludeTestChange,
  query,
  onQueryChange,
}: Props) {
  const { libraries } = useBsddLibraries(includeTest);

  // Ensure IFC 4.3 is always selected and disabled
  useEffect(() => {
    if (!selected.includes(IFC_43)) onChange(Array.from(new Set([IFC_43, ...selected])));
  }, [selected, onChange]);

  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase();
    return (libraries || []).filter((lib) => {
      if (!q) return true;
      const label = `${lib.name || ""} ${lib.code || ""} ${lib.version || ""}`.toLowerCase();
      return label.includes(q);
    });
  }, [libraries, query]);

  return (
    <div className="ds-panel p-4 h-[320px] overflow-hidden flex flex-col">
      <h2 className="text-lg font-semibold">bSDD Libraries</h2>
      <p className="mt-1 text-gray-600">Select which bSDD libraries to use. IFC is always enabled.</p>
      <div className="mt-2 flex items-center gap-3">
        <Input placeholder="Search dictionaries" value={query} onChange={(e) => onQueryChange(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeTest} onChange={(e) => onIncludeTestChange(e.target.checked)} />
          Include test dictionaries
        </label>
      </div>
      <div className="mt-2 grid content-start auto-rows-min gap-2 pr-1 flex-1 overflow-y-auto">
        {filtered.map((lib) => {
          const isIfc = lib.id === IFC_43;
          const checked = isIfc || selected.includes(lib.id);
          return (
            <label key={lib.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checked}
                disabled={isIfc}
                onChange={(e) => {
                  const set = new Set(selected);
                  if (e.target.checked) set.add(lib.id);
                  else set.delete(lib.id);
                  onChange(Array.from(set));
                }}
              />
              <span className="text-sm">
                {lib.name}
                {lib.code || lib.version ? (
                  <span className="ml-1 text-xs text-gray-500">
                    {lib.code ? `${lib.code}` : ""}
                    {lib.code && lib.version ? " • " : ""}
                    {lib.version ? `${lib.version}` : ""}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

