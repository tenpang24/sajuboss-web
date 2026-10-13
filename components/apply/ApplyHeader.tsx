import Link from "next/link";

const tabs = [
  { key: "date", label: "개업택일", href: "/apply/date" },
  { key: "name", label: "상호·브랜드 작명", href: "/apply/name" },
  { key: "person", label: "개인·개명", href: "/apply/person" },
] as const;

// 신청 폼 3종의 머리 부분: 종류 탭, 제목, 한 줄 설명
export function ApplyHeader({
  active,
  title,
  lead,
}: {
  active: (typeof tabs)[number]["key"];
  title: string;
  lead: string;
}) {
  return (
    <div className="wrap apply-head">
      <nav className="tabs" aria-label="신청 종류">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={tab.key === active ? "tab on" : "tab"}
            aria-current={tab.key === active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div>
        <h1 className="t1 t1-sm">{title}</h1>
        <p className="lead">{lead}</p>
      </div>
    </div>
  );
}

// 로그인 여부와 저장된 사주를 확인하는 동안 보이는 자리
export function ApplyFallback() {
  return (
    <section className="wrap apply-body" aria-busy="true">
      <div className="step apply-loading" />
    </section>
  );
}
