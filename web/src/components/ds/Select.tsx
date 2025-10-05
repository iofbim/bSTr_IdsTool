"use client";
import * as React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ children, className = "", ...props }: React.PropsWithChildren<SelectProps>) {
  const cls = [
    "block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white",
    "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <select className={cls} {...props}>
      {children}
    </select>
  );
}
