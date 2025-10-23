"use client";
import React from "react";
import { Input } from "@/components/ds/Input";
import { Select } from "@/components/ds/Select";

type Op = "present" | "equals" | "in" | "matches" | "contains" | undefined;

export function normalizeEnumText(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.join(", ");
  return v || "";
}

export default function ValueEditor({
  operator,
  value,
  placeholder = "Value (optional)",
  title,
  onChange,
}: {
  operator?: Op;
  value?: string | string[];
  placeholder?: string;
  title?: string;
  onChange: (op: Exclude<Op, undefined>, value?: string | string[]) => void;
}) {
  const mode: Exclude<Op, undefined> = (operator as any) || "present";

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Exclude<Op, undefined>;
    if (next === "present") return onChange("present");
    if (next === "in") return onChange(
      "in",
      Array.isArray(value) ? value : value ? String(value).split(/\s*,\s*/).filter(Boolean) : []
    );
    // equals, contains, matches -> single string
    return onChange(next, Array.isArray(value) ? value[0] || "" : value || "");
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const txt = e.target.value;
    if (mode === "in") {
      const arr = txt.split(/\s*,\s*/).filter(Boolean);
      onChange("in", arr);
    } else {
      onChange(mode, txt);
    }
  };

  const inputValue =
    mode === "in"
      ? normalizeEnumText(value)
      : Array.isArray(value)
      ? value[0] || ""
      : value || "";

  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
      <Select aria-label="Restriction mode" value={mode} onChange={handleModeChange}>
        <option value="present">Present</option>
        <option value="equals">Equals</option>
        <option value="contains">Contains</option>
        <option value="matches">Pattern (regex)</option>
        <option value="in">Enumeration</option>
      </Select>
      <Input title={title} placeholder={placeholder} value={inputValue} onChange={handleValueChange} />
    </div>
  );
}
