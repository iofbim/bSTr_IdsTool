"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ds/Dialog";
import { Input } from "@/components/ds/Input";
import { Button } from "@/components/ds/Button";
import { useBsddClassSearch } from "@/hooks/useBsdd";
import type { BsddClass } from "@/lib/bsdd/types";

type Props = {
  open: boolean;
  onClose(): void;
  dicts: string[];
  initialQuery?: string;
  onPick(item: BsddClass): void;
};

export default function BsddClassPicker({ open, onClose, dicts, initialQuery, onPick }: Props) {
  const [query, setQuery] = useState(initialQuery || "");
  const [limit, setLimit] = useState(50);
  useEffect(() => {
    if (open) {
      setQuery(initialQuery || "");
      setLimit(50);
    }
  }, [open, initialQuery]);
  const { results, loading } = useBsddClassSearch(query, dicts, limit, 250);

  return (
    <Dialog open={open} onClose={onClose} title="Pick IFC Class from bSDD" footer={<Button onClick={onClose}>Close</Button>}>
      <div className="grid gap-2">
        <Input placeholder="Type to search classes (min 2 chars)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="max-h-[45vh] overflow-auto" onScroll={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48 && !loading) {
            setLimit((prev) => Math.min(prev + 50, 500));
          }
        }}>
          {loading ? (
            <p className="text-sm text-gray-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-500">No results.</p>
          ) : (
            <ul className="divide-y">
              {results.map((r) => (
                <li key={r.uri} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-gray-500">
                      {r.referenceCode || ""}
                      {r.dictionaryName ? (
                        <span className="ml-2 opacity-80">• {r.dictionaryName}</span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-gray-400 break-all">{r.uri}</div>
                  </div>
                  <Button className="text-xs" variant="secondary" onClick={() => onPick(r)}>
                    Use
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
