"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ds/Input";
import { Button } from "@/components/ds/Button";
import RestrictionMenu from "@/components/ids/RestrictionMenu";

type Op = "present" | "equals" | "contains" | "matches" | "in" | "bounds" | "length";

type UiKey =
  | "present"
  | "simple"
  | "enumeration"
  | "range"
  | "lengthRange"
  | "lengthExact"
  | "pattern"
  | "contains";

const MAX_STRING_LEN = 255;

function stripBrackets(s: string): string {
  return s.replace(/^[\[(]+/, "").replace(/[\])]+$/, "");
}

function parseRange(v?: string | string[]): { min?: string; max?: string } {
  const s0 = Array.isArray(v) ? (v[0] || "") : (v || "");
  if (!s0) return {};
  const s = stripBrackets(s0.trim());
  const parts = s.split("..");
  if (parts.length === 1) return { min: parts[0] || undefined, max: undefined };
  return { min: parts[0] || undefined, max: parts[1] || undefined };
}

function parseBounds(v?: string | string[]): { min?: string; max?: string; minExclusive: boolean; maxExclusive: boolean } {
  const raw = (Array.isArray(v) ? (v[0] || "") : (v || "")).trim();
  if (!raw) return { minExclusive: false, maxExclusive: false } as any;
  const minExclusive = raw.startsWith("(");
  const maxExclusive = raw.endsWith(")");
  const core = stripBrackets(raw);
  const parts = core.split("..");
  const min = parts[0] || undefined;
  const max = parts[1] || undefined;
  return { min, max, minExclusive, maxExclusive };
}

function joinRange(min?: string, max?: string): string | undefined {
  if (!min && !max) return undefined;
  const a = (min ?? "").trim();
  const b = (max ?? "").trim();
  if (!a && !b) return undefined;
  return `${a}..${b}`;
}

function deriveUiKey(op: Op, value?: string | string[]): UiKey {
  if (op === "present") return "present";
  if (op === "in") return "enumeration";
  if (op === "bounds") return "range";
  if (op === "matches") return "pattern";
  if (op === "length") {
    const s = Array.isArray(value) ? (value[0] || "") : (value || "");
    return /^\d+$/.test(s) ? "lengthExact" : "lengthRange";
  }
  if (op === "equals") return "simple";
  if (op === "contains") return "contains";
  return "pattern";
}

export default function ValueField({
  label,
  operator,
  value,
  simpleOnly = false,
  numberLike = false,
  placeholder,
  onChange,
}: {
  label?: string;
  operator?: Op;
  value?: string | string[];
  simpleOnly?: boolean;
  numberLike?: boolean;
  placeholder?: string;
  onChange: (op: Op, value?: string | string[]) => void;
}) {
  const op: Op = (operator as Op) || (simpleOnly ? "matches" : "present");
  const [menuKey, setMenuKey] = useState<UiKey>(() => deriveUiKey(op, value));

  // Local UI state for ranges
  const [minVal, setMinVal] = useState<string>("");
  const [maxVal, setMaxVal] = useState<string>("");
  const [minExclusive, setMinExclusive] = useState<boolean>(false);
  const [maxExclusive, setMaxExclusive] = useState<boolean>(false);

  const [lengthExact, setLengthExact] = useState<string>("0");
  const [lengthMin, setLengthMin] = useState<string>("0");
  const [lengthMax, setLengthMax] = useState<string>(String(MAX_STRING_LEN));

  // Sync local states when operator/value change from outside
  useEffect(() => {
    setMenuKey(deriveUiKey(op, value));
    if (op === "bounds") {
      const b = parseBounds(value);
      setMinVal(b.min || "");
      setMaxVal(b.max || "");
      setMinExclusive(!!b.minExclusive);
      setMaxExclusive(!!b.maxExclusive);
    } else {
      const r = parseRange(value);
      setMinVal(r.min || "");
      setMaxVal(r.max || "");
    }
    if (op === "length") {
      const v = Array.isArray(value) ? (value[0] || "") : (value || "");
      if (/^\d+$/.test(v)) {
        setLengthExact(v);
      } else {
        const r = parseRange(value);
        setLengthMin(r.min ?? "0");
        setLengthMax(r.max ?? String(MAX_STRING_LEN));
      }
    }
  }, [op, value]);

  const uiItems = [
    { key: "present", label: "Present" },
    { key: "simple", label: "Simple" },
    { key: "enumeration", label: "Enumeration" },
    { key: "range", label: "Range" },
    { key: "lengthRange", label: "Length Range" },
    { key: "lengthExact", label: "Length (Exact)" },
    { key: "pattern", label: "Pattern" },
  ] as const;

  // Enumeration input buffer
  const [enumInput, setEnumInput] = useState("");
  const currentEnum = Array.isArray(value) ? value : [];
  function commitEnum(buffer: string) {
    const parts = buffer.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const set = new Set(currentEnum);
    for (const p of parts) set.add(p);
    onChange("in", Array.from(set));
  }

  // Switch handler with flush
  function handleMode(next: UiKey) {
    setMenuKey(next);
    if (next === "present") return onChange("present");
    if (next === "simple") { onChange("equals", ""); return; }
    if (next === "enumeration") { onChange("in", []); return; }
    if (next === "range") { setMinExclusive(false); setMaxExclusive(false); setMinVal(""); setMaxVal(""); onChange("bounds", ""); return; }
    if (next === "lengthRange") { setLengthMin("0"); setLengthMax(String(MAX_STRING_LEN)); onChange("length", `0..${MAX_STRING_LEN}`); return; }
    if (next === "lengthExact") { setLengthExact("0"); onChange("length", "0"); return; }
    if (next === "pattern") { onChange("matches", ""); return; }
    if (next === "contains") { onChange("contains", ""); return; }
  }

  function encodeBounds(min?: string, max?: string, minEx?: boolean, maxEx?: boolean): string | undefined {
    const core = joinRange(min, max);
    if (!core) return undefined;
    const left = minEx ? "(" : "[";
    const right = maxEx ? ")" : "]";
    return `${left}${core}${right}`;
  }

  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: simpleOnly ? "1fr" : "auto 1fr" }}>
      {!simpleOnly && (
        <RestrictionMenu
          operator={menuKey as any}
          onChange={(next) => handleMode(next as UiKey)}
          items={uiItems as any}
          title={label || "Restrictions"}
        />
      )}

      {/* Present notice */}
      {operator === "present" && !simpleOnly && (
        <div className="text-xs text-gray-500">Value must be present.</div>
      )}

      {/* Simple / Contains */}
      {(simpleOnly || menuKey === "simple" || operator === "contains") && (
        <Input
          placeholder={placeholder || (menuKey === "simple" ? "Value" : "Contains…")}
          value={Array.isArray(value) ? (value[0] || "") : (value || "")}
          onChange={(e) => onChange(menuKey === "simple" ? "equals" : "contains", (e.target as HTMLInputElement).value)}
        />
      )}

      {/* Pattern */}
      {(operator === "matches" || menuKey === "pattern") && (
        <div className="grid gap-1">
          <Input
            placeholder={placeholder || "Regex pattern"}
            value={Array.isArray(value) ? (value[0] || "") : (value || "")}
            onChange={(e) => onChange("matches", (e.target as HTMLInputElement).value)}
            title="Regex pattern (see link below)"
          />
          <a className="text-[11px] text-blue-600 hover:underline" href="https://www.regular-expressions.info/xml.html" target="_blank" rel="noreferrer">
            Pattern help for XML/Regex
          </a>
        </div>
      )}

      {/* Enumeration */}
      {menuKey === "enumeration" && (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-1">
            {currentEnum.map((it) => (
              <button key={it} type="button" className="px-2 py-0.5 rounded bg-gray-100 text-xs border hover:bg-red-50" title="Remove" onClick={() => onChange("in", currentEnum.filter((x) => x !== it))}>
                {it}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <Input
              placeholder={placeholder || "Type value and press Enter or comma"}
              value={enumInput}
              onChange={(e) => setEnumInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                const t = e.target as HTMLInputElement;
                if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitEnum(t.value); setEnumInput(""); }
              }}
              onBlur={(e) => { const t = (e.target as HTMLInputElement).value.trim(); if (t) { commitEnum(t); setEnumInput(""); } }}
            />
            <Button type="button" className="h-8 text-xs" onClick={() => { if (enumInput.trim()) { commitEnum(enumInput); setEnumInput(""); } }}>Add</Button>
          </div>
        </div>
      )}

      {/* Range (bounds) */}
      {operator === "bounds" && (
        <div className="grid gap-2">
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
            <select className="border rounded h-8 text-xs px-1" title="Min boundary" value={minExclusive ? "exclusive" : "inclusive"}
              onChange={(e) => { const ex=(e.target as HTMLSelectElement).value === "exclusive"; setMinExclusive(ex); onChange("bounds", encodeBounds(minVal, maxVal, ex, maxExclusive)); }}>
              <option value="inclusive">≥</option>
              <option value="exclusive">&gt;</option>
            </select>
            <Input placeholder={numberLike ? "Min (number)" : "Min"} value={minVal}
              onChange={(e) => { const v=(e.target as HTMLInputElement).value; setMinVal(v); onChange("bounds", encodeBounds(v, maxVal, minExclusive, maxExclusive)); }} />
            <Input placeholder={numberLike ? "Max (number)" : "Max"} value={maxVal}
              onChange={(e) => { const v=(e.target as HTMLInputElement).value; setMaxVal(v); onChange("bounds", encodeBounds(minVal, v, minExclusive, maxExclusive)); }} />
            <select className="border rounded h-8 text-xs px-1" title="Max boundary" value={maxExclusive ? "exclusive" : "inclusive"}
              onChange={(e) => { const ex=(e.target as HTMLSelectElement).value === "exclusive"; setMaxExclusive(ex); onChange("bounds", encodeBounds(minVal, maxVal, minExclusive, ex)); }}>
              <option value="inclusive">≤</option>
              <option value="exclusive">&lt;</option>
            </select>
          </div>
        </div>
      )}

      {/* Length */}
      {operator === "length" && (
        <div className="grid gap-1">
          {menuKey === "lengthExact" ? (
            <Input
              placeholder="Exact length (integer)"
              value={lengthExact}
              onChange={(e) => { const v=(e.target as HTMLInputElement).value.replace(/[^0-9]/g, ""); setLengthExact(v); onChange("length", v || "0"); }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Min length"
                value={lengthMin}
                onChange={(e) => { const v=(e.target as HTMLInputElement).value.replace(/[^0-9]/g, ""); setLengthMin(v); onChange("length", joinRange(v || "0", lengthMax || String(MAX_STRING_LEN))); }}
              />
              <Input
                placeholder="Max length"
                value={lengthMax}
                onChange={(e) => { const v=(e.target as HTMLInputElement).value.replace(/[^0-9]/g, ""); setLengthMax(v); onChange("length", joinRange(lengthMin || "0", v || String(MAX_STRING_LEN))); }}
              />
            </div>
          )}
          <div className="text-[11px] text-gray-500">Defaults: min 0, max {MAX_STRING_LEN} for strings.</div>
        </div>
      )}
    </div>
  );
}
