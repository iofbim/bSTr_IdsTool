"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ds/Dialog";
import { Input } from "@/components/ds/Input";
import { Button } from "@/components/ds/Button";
import { useBsddClassSearch } from "@/hooks/useBsdd";
import type { BsddClass } from "@/lib/bsdd/types";
import { BSDD_MAX_LIMIT, BSDD_PAGE_SIZE } from "@/config/bsdd";

type Props = {
  open: boolean;
  onClose(): void;
  dicts: string[];
  initialQuery?: string;
  onPick(item: BsddClass): void;
};

export default function BsddClassPicker({ open, onClose, dicts, initialQuery, onPick }: Props) {
  const [query, setQuery] = useState(initialQuery || "");
  const [limit, setLimit] = useState(BSDD_PAGE_SIZE);
  const [maxCap, setMaxCap] = useState<number>(BSDD_MAX_LIMIT);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery || "");
      setLimit(BSDD_PAGE_SIZE);
      setMaxCap(BSDD_MAX_LIMIT);
    }
  }, [open, initialQuery]);

  const { results, total, mode, loading } = useBsddClassSearch(query, dicts, limit, 250);
  const canShowTotal = mode !== "graphql" && typeof total === "number";

  return (
    <Dialog open={open} onClose={onClose} title="Pick Class from bSDD" footer={<Button onClick={onClose}>Close</Button>}>
      <div className="grid gap-2">
        <Input placeholder="Type to search classes (min 2 chars)" value={query} onChange={(e) => setQuery(e.target.value)} />

        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>
            Showing {results.length}
            {canShowTotal ? <> of total {total}</> : null}
          </div>
          <div className="flex items-center gap-2">
            <span>Max results: {maxCap}</span>
            <Button
              className="text-xs"
              variant="secondary"
              onClick={() => {
                const inc = 500;
                const nextCap = maxCap + inc;
                setMaxCap(nextCap);
                // Optionally bump limit to new cap if we were at cap
                setLimit((prev) => (prev >= maxCap ? nextCap : prev));
              }}
            >
              Raise cap +500
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="max-h-[45vh] overflow-auto"
          onScroll={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48 && !loading) {
              setLimit((prev) => Math.min(prev + BSDD_PAGE_SIZE, maxCap));
            }
          }}
        >
          {results.length === 0 ? (
            loading ? (
              <p className="p-2 text-sm text-gray-500">Searching…</p>
            ) : (
              <p className="p-2 text-sm text-gray-500">No results.</p>
            )
          ) : (
            <>
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
              {loading ? (
                <div className="p-2 text-xs text-gray-500 text-center">Loading more…</div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}

