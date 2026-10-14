import "server-only";
import { KOREAN_LUNAR_FIRST_DAY, KOREAN_LUNAR_YEARS } from "./korean-lunar-data.ts";

// 한국 음력 → 양력. 한국천문연구원 음양력 자료(1900~2050)로 만든 표를 쓴다.
// lunar-javascript의 음력은 중국 기준(UTC+8)이라 한국 음력과 달의 시작일이 다른 달이 있어 쓰지 않는다.

type YearInfo = { year: number; startDay: number; months: Array<{ month: number; leap: boolean; length: number; startDay: number }> };

const DAY_MS = 24 * 3600 * 1000;
let index: Map<number, YearInfo> | null = null;

function buildIndex(): Map<number, YearInfo> {
  const map = new Map<number, YearInfo>();
  let day = Date.parse(`${KOREAN_LUNAR_FIRST_DAY}T00:00:00Z`) / DAY_MS;
  for (const row of KOREAN_LUNAR_YEARS) {
    const [yearText, leapText, lengths] = row.split(":");
    const year = Number(yearText);
    const leapMonth = Number(leapText);
    const info: YearInfo = { year, startDay: day, months: [] };
    let month = 1;
    let leapNext = false;
    for (const bit of lengths) {
      const length = bit === "1" ? 30 : 29;
      info.months.push({ month, leap: leapNext, length, startDay: day });
      day += length;
      if (!leapNext && month === leapMonth) leapNext = true;
      else {
        leapNext = false;
        month++;
      }
    }
    map.set(year, info);
  }
  return map;
}

export type LunarToSolarResult =
  | { ok: true; solarDate: string }
  | { ok: false; error: "invalid_date" | "out_of_range" | "no_such_lunar_date" };

export function koreanLunarToSolar(year: number, month: number, day: number, leap: boolean): LunarToSolarResult {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 30) {
    return { ok: false, error: "invalid_date" };
  }
  index ??= buildIndex();
  const info = index.get(year);
  if (!info) return { ok: false, error: "out_of_range" };
  const found = info.months.find((m) => m.month === month && m.leap === leap);
  if (!found) {
    // 그 해 표가 끝까지 없으면(마지막 해) 범위 밖, 있는데 없는 달(윤달 등)이면 없는 날짜
    const last = info.months[info.months.length - 1];
    const beyond = month > last.month || (month === last.month && leap && !last.leap);
    return { ok: false, error: beyond && info === [...index.values()].at(-1) ? "out_of_range" : "no_such_lunar_date" };
  }
  if (day > found.length) return { ok: false, error: "no_such_lunar_date" };
  return { ok: true, solarDate: new Date((found.startDay + day - 1) * DAY_MS).toISOString().slice(0, 10) };
}
