"use client";
import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
};

export function Button({ variant = "primary", size = "sm", className = "", ...props }: ButtonProps) {
  const classes = [
    "ds-btn",
    variant === "primary" && "ds-btn--primary",
    variant === "secondary" && "ds-btn--secondary",
    variant === "ghost" && "ds-btn--ghost",
    variant === "accent" && "ds-btn--accent",
    size === "sm" && "ds-btn--sm",
    size === "md" && "ds-btn--md",
    size === "lg" && "ds-btn--lg",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <button className={classes} {...props} />;
}
