// 테스트 정답 자료 읽기. 모두 한국천문연구원 자료다(fixtures/README.md).
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

export const TERM_NAMES = [
  "입춘", "우수", "경칩", "춘분", "청명", "곡우", "입하", "소만", "망종", "하지", "소서", "대서",
  "입추", "처서", "백로", "추분", "한로", "상강", "입동", "소설", "대설", "동지", "소한", "대한",
] as const;

export type KasiTerm = { index: number; name: string; kst: string; utcMs: number };

/** 24기 입기시각(1920~2100, KST, 분 단위). 24:00 표기는 그 날 24:00(= 다음 날 00:00) */
export function kasiTerms(): KasiTerm[] {
  const text = readFileSync(path.join(DIR, "kasi-24gi-1920-2100.txt"), "utf8");
  const terms: KasiTerm[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*$/.exec(line);
    if (!m) continue;
    const [k, y, mo, d, h, mi] = m.slice(1).map(Number);
    terms.push({
      index: k,
      name: TERM_NAMES[k - 1],
      kst: `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`,
      utcMs: Date.UTC(y, mo - 1, d, h, mi) - 9 * 3600 * 1000,
    });
  }
  return terms;
}

export type KasiMonth = { year: number; month: number; leap: boolean; start: string; length: number };

export function kasiLunarMonths(): KasiMonth[] {
  return JSON.parse(readFileSync(path.join(DIR, "kasi-lunar-months.json"), "utf8")).months;
}

export type KasiDay = {
  date: string;
  lunar: { year: number; month: number; day: number; leap: boolean };
  yearGanzhi: string;
  monthGanzhi: string;
  iljin: string;
};

export function kasiDaySamples(): KasiDay[] {
  return JSON.parse(readFileSync(path.join(DIR, "kasi-day-samples.json"), "utf8")).samples;
}

/** KST 벽시계 ms(UTC로 적은 값처럼) → saju_profiles 형식 날짜·시각 */
export function kstParts(utcMs: number): { birth_date: string; birth_time: string } {
  const iso = new Date(utcMs + 9 * 3600 * 1000).toISOString();
  return { birth_date: iso.slice(0, 10), birth_time: iso.slice(11, 19) };
}
