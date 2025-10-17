"use client";
import * as React from "react";

type FieldProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
  hint?: string;
  inline?: boolean;
  size?: "sm" | "md" | "lg";
};

export function Field({ label, hint, inline = false, size = "sm", className = "", children, ...props }: FieldProps) {
  return (
    <div className={[inline ? "flex items-center gap-2" : "grid gap-1", className].filter(Boolean).join(" ")} {...props}>
      {label ? (
        <label className={size === "sm" ? "text-xs text-gray-700" : size === "md" ? "text-sm text-gray-700" : "text-base text-gray-700"}>
          {label}
        </label>
      ) : null}
      {children}
      {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}
