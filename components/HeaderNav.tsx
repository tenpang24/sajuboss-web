"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const headerMenu = [
  { key: "today", label: "오늘의 운세", href: "/#today", match: null },
  { key: "report", label: "신년 사업운", href: "/report/2027", match: "/report" },
  { key: "date", label: "개업택일", href: "/apply/date", match: "/apply/date" },
  { key: "name", label: "작명", href: "/apply/name", match: "/apply/name" },
] as const;

// 현재 경로에 해당하는 메뉴를 강조합니다. 개인·개명 폼은 "작명" 메뉴에 속합니다.
function isActive(match: string | null, pathname: string) {
  if (!match) return false;
  if (match === "/apply/name") {
    return pathname.startsWith("/apply/name") || pathname.startsWith("/apply/person");
  }
  return pathname.startsWith(match);
}

export function HeaderNavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {headerMenu.map((item) => {
        const active = isActive(item.match, pathname);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={active ? "nav-a on" : "nav-a"}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function HeaderNav() {
  return <HeaderNavLinks pathname={usePathname()} />;
}
