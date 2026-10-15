// 사이트 이름(사주보스)과 도메인. 화면·메타데이터는 이름을 이 파일에서만 읽습니다.
export const TBD = "[확정 후 기재]";

export const brand = {
  name: "사주보스",
  domain: "sajuboss.com",
  url: "https://sajuboss.com",
  description:
    "사장님을 위한 사업운 풀이. 신년 사업운 월별 리포트, 개업택일, 상호·브랜드 작명.",
  // 푸터 등 화면은 사업자 정보를 이 값에서만 읽습니다.
  business: {
    company: "위스트롱",
    representative: "박진혁",
    registrationNumber: "278-72-00560",
    mailOrderNumber: "[확인 후 기재]", // 신고번호 확인 중
    address: "부산 해운대구 반여로17-1 C동 102호",
  },
  // 고객센터 연락처는 확정되면 채웁니다.
  support: TBD,
  copyrightYear: 2026,
} as const;
