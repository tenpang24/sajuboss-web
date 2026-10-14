// 일진·한국 음력 변환을 한국천문연구원 자료와 비교.
import assert from "node:assert/strict";
import { test } from "node:test";
import lunarJs from "lunar-javascript";
import { calcIljin, calcTodayIljin } from "../../lib/saju-engine/iljin.ts";
import { koreanLunarToSolar } from "../../lib/saju-engine/korean-lunar.ts";
import { kasiDaySamples, kasiLunarMonths } from "./kasi.ts";

const { Solar, Lunar } = lunarJs;
const DAY = 24 * 3600 * 1000;
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

test("일진 기준점: 2000-01-01 = 戊午(한국천문연구원)", () => {
  const kasi = kasiDaySamples().find((s) => s.date === "2000-01-01")!;
  assert.equal(kasi.iljin, "戊午");
  assert.equal(calcIljin(2000, 1, 1).pillar, "戊午");
});

test("일진 = 한국천문연구원 일진(표본 전체, 1900~2050)", () => {
  const samples = kasiDaySamples();
  assert.ok(samples.length > 250);
  for (const s of samples) {
    const [y, m, d] = s.date.split("-").map(Number);
    assert.equal(calcIljin(y, m, d).pillar, s.iljin, s.date);
  }
});

test("calcIljin = lunar-javascript 일주: 1900-01-01~2100-12-31 매일", () => {
  let n = 0;
  for (let t = Date.UTC(1900, 0, 1); t <= Date.UTC(2100, 11, 31); t += DAY) {
    const d = new Date(t);
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    assert.equal(calcIljin(y, m, day).pillar, Solar.fromYmd(y, m, day).getLunar().getDayInGanZhi(), d.toISOString());
    n++;
  }
  assert.equal(n, 73414);
});

test("오늘의 일진은 한국 시각 기준(UTC 15:00 = 다음 날)", () => {
  assert.deepEqual(calcTodayIljin(new Date("2024-02-09T14:59:59Z")).date, "2024-02-09");
  const next = calcTodayIljin(new Date("2024-02-09T15:00:00Z"));
  assert.equal(next.date, "2024-02-10");
  assert.equal(next.pillar, kasiDaySamples().find((s) => s.date === "2024-02-10")!.iljin);
});

test("한국 음력 → 양력: 한국천문연구원 달 전체(첫날·마지막 날·없는 날)", () => {
  const months = kasiLunarMonths();
  assert.ok(months.length > 1800);
  for (const m of months) {
    const label = `${m.year}-${m.leap ? "윤" : ""}${m.month}`;
    assert.deepEqual(koreanLunarToSolar(m.year, m.month, 1, m.leap), { ok: true, solarDate: m.start }, label);
    assert.deepEqual(koreanLunarToSolar(m.year, m.month, m.length, m.leap), { ok: true, solarDate: addDays(m.start, m.length - 1) }, label);
    if (m.length === 29) assert.equal(koreanLunarToSolar(m.year, m.month, 30, m.leap).ok, false, `${label} 30일`);
  }
});

test("윤달: 있는 해만 받고, 없는 윤달은 no_such_lunar_date", () => {
  const months = kasiLunarMonths();
  const leaps = months.filter((m) => m.leap);
  assert.ok(leaps.length > 50);
  const leapKey = new Set(leaps.map((m) => `${m.year}-${m.month}`));
  for (let year = 1900; year <= 2049; year++) {
    for (let month = 1; month <= 12; month++) {
      const r = koreanLunarToSolar(year, month, 1, true);
      assert.equal(r.ok, leapKey.has(`${year}-${month}`), `${year}-윤${month}`);
      if (!r.ok) assert.equal(r.error, "no_such_lunar_date");
    }
  }
});

test("한국·중국 음력이 다른 달: 엔진은 한국천문연구원을 따른다", (t) => {
  // lunar-javascript(중국 기준)와 시작일이 다르거나 중국 쪽에 없는 달을 모은다.
  const differ: string[] = [];
  for (const m of kasiLunarMonths()) {
    let chinaStart: string | null = null;
    try {
      chinaStart = Lunar.fromYmd(m.year, m.leap ? -m.month : m.month, 1).getSolar().toYmd();
    } catch {
      chinaStart = null;
    }
    if (chinaStart !== m.start) {
      differ.push(`${m.year}년 ${m.leap ? "윤" : ""}${m.month}월: 한국 ${m.start}, 중국 ${chinaStart ?? "없음"}`);
      assert.deepEqual(koreanLunarToSolar(m.year, m.month, 1, m.leap), { ok: true, solarDate: m.start });
    }
  }
  t.diagnostic(`다른 달 ${differ.length}개`);
  for (const line of differ) t.diagnostic(line);
  assert.ok(differ.length > 0, "다른 달이 하나도 없으면 이 테스트가 확인하는 것이 없다");
});

test("음력 범위 끝: 1900년 1월 1일부터, 2050년 11월까지", () => {
  assert.deepEqual(koreanLunarToSolar(1900, 1, 1, false), { ok: true, solarDate: "1900-01-31" });
  assert.deepEqual(koreanLunarToSolar(1899, 12, 1, false), { ok: false, error: "out_of_range" });
  assert.deepEqual(koreanLunarToSolar(2051, 1, 1, false), { ok: false, error: "out_of_range" });
  const last = kasiLunarMonths().at(-1)!;
  assert.equal(koreanLunarToSolar(last.year, last.month, 1, last.leap).ok, true);
  assert.deepEqual(koreanLunarToSolar(last.year, last.month + 1, 1, false), { ok: false, error: "out_of_range" });
  assert.deepEqual(koreanLunarToSolar(2000, 13, 1, false), { ok: false, error: "invalid_date" });
  assert.deepEqual(koreanLunarToSolar(2000, 1, 31, false), { ok: false, error: "invalid_date" });
});
