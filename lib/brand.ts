// 사이트 이름은 가칭입니다. 이름·도메인이 바뀌면 이 파일만 고칩니다.
export const TBD = "[확정 후 기재]";

export const brand = {
  name: "사장님 운세",
  domain: "sajuboss.com",
  url: "https://sajuboss.com",
  showTentativeBadge: true,
  description:
    "사장님을 위한 사업운 풀이. 신년 사업운 월별 리포트, 개업택일, 상호·브랜드 작명.",
  // 어떤 사업자로 운영할지 확정되면 채웁니다.
  business: {
    company: TBD,
    representative: TBD,
    registrationNumber: TBD,
    mailOrderNumber: TBD,
    address: TBD,
  },
} as const;
