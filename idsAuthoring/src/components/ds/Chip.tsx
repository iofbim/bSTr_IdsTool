"use client";
import * as React from "react";

type Tone = "default" | "primary" | "inverse" | "accent";

type ChipProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function Chip({ tone = "default", className = "", ...props }: ChipProps) {
  const classes = [
    "ds-chip",
    tone === "primary" && "ds-chip--primary",
    tone === "inverse" && "ds-chip--inverse",
    tone === "accent" && "ds-chip--accent",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <span className={classes} {...props} />;
}

