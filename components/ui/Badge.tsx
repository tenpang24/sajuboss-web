import type { HTMLAttributes } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "tint" | "y" | "done" | "line" | "dark";
};

export function Badge({ tone = "tint", className, ...rest }: BadgeProps) {
  const classes = ["badge", tone !== "tint" && `badge-${tone}`, className].filter(Boolean).join(" ");
  return <span className={classes} {...rest} />;
}
