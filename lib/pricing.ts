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
