"use client";
import { Input } from "@/components/ds/Input";
import { useIds } from "@/contexts/IdsContext";

export default function BsddLibrariesPanel() {
  const {
    libraries,
    dictQuery,
    setDictQuery,
    includeTestDicts,
    setIncludeTestDicts,
    selectedLibs,
    setSelectedLibs,
    classifLibs,
    setClassifLibs,
  } = useIds();

  return (
    <div className="ds-panel p-4 h-[320px] overflow-hidden flex flex-col">
      <h2 className="text-lg font-semibold">bSDD Libraries</h2>
      <p className="mt-1 text-gray-600">Select which bSDD libraries to use.</p>
      <div className="mt-2 flex items-center gap-3">
        <Input placeholder="Search dictionaries" value={dictQuery} onChange={(e) => setDictQuery(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeTestDicts} onChange={(e) => setIncludeTestDicts(e.target.checked)} />
          Include test dictionaries
        </label>
      </div>
      <div className="mt-2 grid grid-cols-[auto_auto_1fr] items-center gap-2 text-xs font-medium text-gray-600 pr-1">
        <div>Fa_</div>
        <div>Cl_</div>
        <div>Library</div>
      </div>
      <div className="mt-2 grid content-start auto-rows-min gap-2 pr-1 flex-1 overflow-y-auto">
        {libraries
          .filter((lib) =>
            !dictQuery
              ? true
              : ((lib.name || "") + " " + (lib.code || "") + " " + (lib.version || "")).toLowerCase().includes(dictQuery.toLowerCase())
          )
          .map((lib) => (
            <div key={lib.id} className="grid grid-cols-[auto_auto_1fr] items-center gap-2">
              <input
                type="checkbox"
                checked={selectedLibs.includes(lib.id)}
                onChange={(e) => {
                  setSelectedLibs((prev) => {
                    const set = new Set(prev);
                    if (e.target.checked) set.add(lib.id);
                    else set.delete(lib.id);
                    return Array.from(set);
                  });
                }}
              />
              <input
                type="checkbox"
                checked={classifLibs.includes(lib.id)}
                onChange={(e) => {
                  setClassifLibs((prev) => {
                    const set = new Set(prev);
                    if (e.target.checked) set.add(lib.id);
                    else set.delete(lib.id);
                    return Array.from(set);
                  });
                }}
              />
              <span className="text-sm truncate">
                {lib.name}
                {lib.code || lib.version ? (
                  <span className="ml-1 text-xs text-gray-500">{lib.code || lib.version}</span>
                ) : null}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

