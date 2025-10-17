"use client";
import * as React from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {title ? (
          <div className="mb-3 text-lg font-semibold" id="dialog-title">
            {title}
          </div>
        ) : null}
        <div className="mb-4">{children}</div>
        {footer ? <div className="mt-2 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
