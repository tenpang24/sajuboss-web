import "server-only";

// 일진(60갑자). 원본은 _import/sosangkong/lib/saju/calcSaju.ts(소상공닷컴 3c08968). 계산은 원본과 같다.
// 일진은 절기·음력과 관계없이 60일마다 돌기 때문에 양력 날짜만 있으면 된다.

export const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

// 그레고리력 날짜 → 율리우스적일(JDN). Fliegel & Van Flandern(1968) 정수 연산.
function toJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/** 양력 날짜의 일진. 기준: 2000-01-01은 戊午(JDN 2451545, 60갑자 번호 54) → offset 49 */
export function calcIljin(year: number, month: number, day: number): { pillar: string } {
  const index = (((toJdn(year, month, day) + 49) % 60) + 60) % 60;
  return { pillar: `${GAN[index % 10]}${ZHI[index % 12]}` };
}

/** 한국 시각(UTC+9) 기준 오늘의 일진. now를 넘기면 그 시점 기준. */
export function calcTodayIljin(now: Date = new Date()): { pillar: string; date: string } {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const { pillar } = calcIljin(year, month, day);
  return { pillar, date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}
