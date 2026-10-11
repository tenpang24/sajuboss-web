// 가격은 검증 전 가정치입니다. 화면과 서버 모두 이 파일의 상수만 읽습니다.
export const pricing = {
  report2027: 3900,
  date: { base: 9900, partnerAddon: 10000 },
  nameBiz: { basic: 29000, detail: 99000 },
  namePerson: { basic: 49000, detail: 99000 },
} as const;

export function formatKrw(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

// "9,900원~"처럼 시작가를 표시할 때 씁니다.
export function formatKrwFrom(amount: number) {
  return `${formatKrw(amount)}~`;
}

// 주문 금액. 서버(lib/orders.ts)가 저장할 때 이 함수로만 계산합니다.
export function orderAmount(
  product: "report_2027" | "date" | "name_biz" | "name_person",
  pkg: "basic" | "detail" | null,
  options: { partner?: boolean } = {},
) {
  switch (product) {
    case "report_2027":
      return pricing.report2027;
    case "date":
      return pricing.date.base + (options.partner ? pricing.date.partnerAddon : 0);
    case "name_biz":
      return pkg === "detail" ? pricing.nameBiz.detail : pricing.nameBiz.basic;
    case "name_person":
      return pkg === "detail" ? pricing.namePerson.detail : pricing.namePerson.basic;
  }
}
