import type { HTMLAttributes } from "react";

export function Card({
  tint,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tint?: boolean }) {
  const classes = [tint ? "card-tint" : "card", className].filter(Boolean).join(" ");
  return <div className={classes} {...rest} />;
}
