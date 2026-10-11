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
    <footer className="ftr">
      <div className="wrap ftr-in">
        <div className="ftr-top">
          <strong className="ftr-name">
            {brand.name}
            {brand.showTentativeBadge && " (가칭)"}
          </strong>
          <a href="#">이용약관</a>
          <a href="#">
            <strong>개인정보처리방침</strong>
          </a>
          <span>고객센터 {brand.support}</span>
        </div>
        <ul className="ftr-biz">
          {businessRows.map((row) => (
            <li key={row.label}>
              {row.label} {row.value}
            </li>
          ))}
        </ul>
        <p>
          본 서비스의 풀이는 전통 명리 원리에 따른 참고용 자료이며 투자·법률·의료 판단을 대신하지
          않습니다.
        </p>
        <p className="ftr-copy">
          © {brand.copyrightYear} {brand.business.company}
        </p>
      </div>
    </footer>
  );
}
