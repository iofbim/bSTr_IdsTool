"use client";
import * as React from "react";

type PanelProps = React.HTMLAttributes<HTMLDivElement> & {
  as?: keyof JSX.IntrinsicElements;
};

export function Panel({ as: As = "div", className = "", ...props }: PanelProps) {
  const classes = ["ds-panel", className].filter(Boolean).join(" ");
  // @ts-expect-error - dynamic element
  return <As className={classes} {...props} />;
}

