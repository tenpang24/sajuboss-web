import type { ReactNode } from "react";

// 번호·아이콘을 담는 원. tone="y"는 짙은 바탕에 노랑 글자, size="lg"는 44px
export function IconCircle({
  children,
  tone,
  size,
}: {
  children: ReactNode;
  tone?: "y";
  size?: "lg";
}) {
  const classes = ["num", tone && "num-y", size && "num-lg"].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-hidden="true">
      {children}
    </span>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#0B7A5A" />
      <path
        d="M6 10.2l2.6 2.6L14 7.4"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
