import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "kakao";
  block?: boolean;
};

export function Button({ variant = "primary", block, className, ...rest }: ButtonProps) {
  const classes = ["btn", `btn--${variant}`, block && "btn--block", className]
    .filter(Boolean)
    .join(" ");
  return <button className={classes} {...rest} />;
}
