"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import BsddClassPicker from "@/components/bsdd/BsddClassPicker";
import { fetchClassProperties, searchClasses } from "@/lib/bsdd/api";

type Props = {
  dicts: string[];
  effectiveClassName?: string;
  effectiveClassUri?: string;
  onPick(attr: { name?: string; datatype?: string; allowed?: string[] }): void;
  initialAttribute?: string;
  datalistId?: string;
};

export default function AttributeHelper({
  dicts,
  effectiveClassName,
  effectiveClassUri,
  onPick,
  initialAttribute,
  datalistId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pickedClassName, setPickedClassName] = useState<string | undefined>(effectiveClassName);
  const [pickedClassUri, setPickedClassUri] = useState<string | undefined>(effectiveClassUri);
  const [attrs, setAttrs] = useState<{ name?: string; dataType?: string; allowed?: string[] }[]>([]);

  async function loadFromBsdd(classUri?: string) {
    const uri = (classUri || pickedClassUri || "").trim();
    if (!uri) {
      console.debug("[AttributeHelper] Skipping load: no class URI", { classUri, pickedClassUri });
      setAttrs([]);
      return;
    }
    try {
      console.debug("[AttributeHelper] Fetching class properties from bSDD", { uri });
      const props = await fetchClassProperties(uri, { limit: 500, languageCode: "en" });
      console.debug("[AttributeHelper] Received properties", { count: props?.length ?? 0, sample: (props || []).slice(0, 5) });
      let mappedAll = props.map((p) => ({
        name: p.propertyName || p.propertyCode,
        dataType: p.dataType,
        allowed: (p.allowedValues || []).map((v) => String(v.value || v.code || "")),
      }));
      const seen = new Set<string>();
      const mapped = mappedAll.filter((x) => {
        const key = (x.name || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setAttrs(mapped);
    } catch {
      console.warn("[AttributeHelper] Failed to fetch class properties", { uri });
      setAttrs([]);
    }
  }

  useEffect(() => {
    console.debug("[AttributeHelper] Mounted", { effectiveClassName, effectiveClassUri, dicts });
    if (effectiveClassUri) setPickedClassUri(effectiveClassUri);
    if (effectiveClassName) setPickedClassName(effectiveClassName);
  }, [effectiveClassUri, effectiveClassName]);

  useEffect(() => {
    loadFromBsdd(pickedClassUri);
  }, [pickedClassUri]);

  useEffect(() => {
    // If we have a class name but not a URI, try to resolve via selected dictionaries (fallback to IFC4.3)
    const tryResolve = async () => {
      if (pickedClassUri || !pickedClassName) return;
      const fallback = "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3";
      const libs = dicts && dicts.length ? dicts : [fallback];
      console.debug("[AttributeHelper] Resolving class URI via bSDD search", { pickedClassName, libs });
      const results = await searchClasses(pickedClassName, libs, 1);
      const hit = results && results.length ? results[0] : undefined;
      if (hit?.uri) setPickedClassUri(hit.uri);
      console.debug("[AttributeHelper] Search results", { resultsCount: results?.length ?? 0, hit });
    };
    tryResolve();
  }, [pickedClassName, pickedClassUri, dicts]);

  useEffect(() => {
    console.debug("[AttributeHelper] attrs updated", { count: attrs.length, names: attrs.slice(0, 10).map((a) => a.name) });
  }, [attrs]);

  useEffect(() => {
    console.debug("[AttributeHelper] props changed", { effectiveClassName, effectiveClassUri, dictsLen: dicts?.length, initialAttribute, datalistId });
  }, [effectiveClassName, effectiveClassUri, dicts, initialAttribute, datalistId]);

  return (
    <div className="flex items-center gap-2">
      {!pickedClassUri ? (
        <button
          type="button"
          className="p-0 h-6 w-12 rounded border flex items-center justify-center"
          title="Pick class from bSDD"
          onClick={() => setOpen(true)}
        >
          <Image src="/icons/bSDD.png" alt="Pick from bSDD" width={48} height={24} />
        </button>
      ) : null}

      {attrs.length ? (
        <>
          <select
            className="ds-input"
            title="initial"
            value={initialAttribute || ""}
            onChange={(ev) => {
              const name = (ev.target as HTMLSelectElement).value;
              const a = attrs.find((x) => (x.name || "").toLowerCase() === name.toLowerCase());
              onPick({ name, datatype: a?.dataType, allowed: a?.allowed });
            }}
          >
            <option value="">IFC attribute…€¦</option>
            {attrs.map((a) => (
              <option key={a.name || Math.random()} value={a.name}>
                {a.name} {a.dataType ? `(${a.dataType})` : ""}
              </option>
            ))}
          </select>
          {datalistId ? (
            <>
              <datalist id={`${datalistId}-names`}>
                {attrs.map((a) => (
                  <option key={a.name || Math.random()} value={a.name || ""} />
                ))}
              </datalist>
              {initialAttribute ? (
                <datalist id={`${datalistId}-allowed`}>
                  {(attrs.find((x) => (x.name || "").toLowerCase() === (initialAttribute || "").toLowerCase())?.allowed || []).map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <BsddClassPicker
        open={open}
        onClose={() => setOpen(false)}
        dicts={dicts}
        initialQuery={"Ifc"}
        onPick={(r) => {
          const name = (r.name || r.referenceCode || "").trim();
          setPickedClassName(name);
          setPickedClassUri(r.uri || "");
          loadFromBsdd(r.uri || "");
          setOpen(false);
        }}
      />
    </div>
  );
}



