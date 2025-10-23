"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ds/Button";

type Op = string | undefined;

type Item = { key: string; label: string };

export default function RestrictionMenu({
  operator,
  onChange,
  title = "Restrictions",
  items,
}: {
  operator?: Op;
  onChange: (op: string) => void;
  title?: string;
  items?: Item[]; // optional custom items (key -> label)
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const defaultItems: Item[] = [
    { key: "present", label: "Present" },
    { key: "equals", label: "Equals" },
    { key: "contains", label: "Contains" },
    { key: "matches", label: "Pattern" },
    { key: "in", label: "Enumeration" },
    { key: "bounds", label: "Range" },
    { key: "length", label: "Length" },
  ];

  const menuItems = items && items.length ? items : defaultItems;
  const label = useMemo(() => {
    const found = menuItems.find((i) => i.key === operator);
    return found?.label || title;
  }, [operator, items, title]);

  return (
    <div className="relative" ref={ref}>
      <Button className="h-7 px-2 text-xs" variant="secondary" title={title} onClick={() => setOpen((v) => !v)}>
        {label}
      </Button>
      {open && (
        <div className="absolute z-50 mt-1 w-44 bg-white border rounded shadow">
          {menuItems.map((it) => (
            <button
              key={it.key}
              type="button"
              className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100"
              onClick={() => {
                setOpen(false);
                onChange(it.key);
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
