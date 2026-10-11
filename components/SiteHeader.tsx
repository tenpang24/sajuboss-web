import Link from "next/link";
import { brand } from "@/lib/brand";

const menu = [
  { href: "/#today", label: "오늘의 운세" },
  { href: "/report/2027", label: "신년 사업운" },
  { href: "/#products", label: "택일·작명" },
  { href: "/#products", label: "전문가 상담" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="site-header__logo">
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="15" fill="#0B7A5A" />
            <circle cx="16" cy="16" r="7" fill="none" stroke="#FFD84D" strokeWidth="2" />
            <circle cx="16" cy="16" r="2" fill="#FFD84D" />
          </svg>
          <span className="site-header__name">{brand.name}</span>
          {brand.showTentativeBadge && <span className="site-header__badge">가칭</span>}
        </Link>
        <nav aria-label="주요 메뉴" className="site-header__nav">
          {menu.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/login" className="site-header__login">
          로그인
        </Link>
      </div>
    </header>
  );
}
