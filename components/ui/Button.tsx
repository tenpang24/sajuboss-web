import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

// 시안 v2의 버튼. p=주색, o=외곽선, g=회색 외곽선, y=노랑, w=흰색, danger=삭제
type Variant = "p" | "o" | "g" | "y" | "w" | "danger";

type StyleProps = {
  variant?: Variant;
  size?: "lg" | "sm";
  block?: boolean;
};

export function buttonClass({ variant = "p", size, block }: StyleProps, extra?: string) {
  return ["btn", `btn-${variant}`, size && `btn-${size}`, block && "btn-block", extra]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant,
  size,
  block,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & StyleProps) {
  return <button className={buttonClass({ variant, size, block }, className)} {...rest} />;
}

export function ButtonLink({
  variant,
  size,
  block,
  className,
  ...rest
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClass({ variant, size, block }, className)} {...rest} />;
}
