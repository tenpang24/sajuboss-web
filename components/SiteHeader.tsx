import Link from "next/link";
import { Suspense } from "react";
import { HeaderNav, HeaderNavLinks } from "@/components/HeaderNav";
import { ButtonLink } from "@/components/ui/Button";
import { getUser } from "@/lib/auth";
import { brand } from "@/lib/brand";

function LoginButton() {
  return (
    <ButtonLink href="/login" variant="p">
      로그인·가입
    </ButtonLink>
  );
}

async function HeaderAuth() {
  if (!(await getUser())) {
    return <LoginButton />;
  }
  return (
    <ButtonLink href="/my" variant="o">
      내 신청
    </ButtonLink>
  );
}

export function SiteHeader() {
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <Link href="/" className="logo" aria-label={`${brand.name} 홈`}>
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <circle cx="17" cy="17" r="16" fill="#0B7A5A" />
            <circle cx="17" cy="17" r="7.5" fill="none" stroke="#FFD84D" strokeWidth="2.2" />
            <circle cx="17" cy="17" r="2.4" fill="#FFD84D" />
          </svg>
          <span className="logo-name">{brand.name}</span>
          {brand.showTentativeBadge && <span className="badge badge-line logo-badge">가칭</span>}
        </Link>
        <nav className="hdr-nav" aria-label="주요 메뉴">
          <Suspense fallback={<HeaderNavLinks pathname="" />}>
            <HeaderNav />
          </Suspense>
        </nav>
        <div className="hdr-act">
          <Suspense fallback={<LoginButton />}>
            <HeaderAuth />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
