"use client";
import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  const cls = [
    "block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm",
    "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <input className={cls} {...props} />;
}
