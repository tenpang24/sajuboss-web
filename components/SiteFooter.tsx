import { brand } from "@/lib/brand";

const businessRows = [
  { label: "상호", value: brand.business.company },
  { label: "대표자", value: brand.business.representative },
  { label: "사업자등록번호", value: brand.business.registrationNumber },
  { label: "통신판매업 신고번호", value: brand.business.mailOrderNumber },
  { label: "주소", value: brand.business.address },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__top">
          <strong>
            {brand.name}
            {brand.showTentativeBadge && " (가칭)"}
          </strong>
          <a href="#">이용약관</a>
          <a href="#">개인정보처리방침</a>
        </div>
        <ul className="site-footer__business">
          {businessRows.map((row) => (
            <li key={row.label}>
              {row.label} {row.value}
            </li>
          ))}
        </ul>
        <div>본 서비스의 풀이는 참고용이며 투자·법률·의료 판단을 대신하지 않습니다.</div>
      </div>
    </footer>
  );
}
