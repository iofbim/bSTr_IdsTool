"use client";
import * as React from "react";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  size?: "sm" | "md" | "lg";
};

export function Textarea({ size = "sm", className = "", ...props }: TextareaProps) {
  const cls = [
    "ds-input",
    size === "sm" && "ds-input--sm",
    size === "md" && "ds-input--md",
    size === "lg" && "ds-input--lg",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <textarea className={cls} {...props} />;
}
