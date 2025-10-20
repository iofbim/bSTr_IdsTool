"use client";
import * as React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  size?: "sm" | "md" | "lg";
};

export function Select({ children, size = "sm", className = "", title, ...props }: React.PropsWithChildren<SelectProps>) {
  const cls = [
    "ds-input",
    size === "sm" && "ds-input--sm",
    size === "md" && "ds-input--md",
    size === "lg" && "ds-input--lg",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <select
      className={cls}
      title={title}
      aria-label={(props as any)["aria-label"] ?? title}
      {...props}
    >
      {children}
    </select>
  );
}
