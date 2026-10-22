// 4주 계산을 한국천문연구원 24기 입기시각·세차·월건·일진과 비교.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_CORRECTIONS, type CorrectionOptions } from "../../lib/saju-engine/corrections.ts";
import { calcIljin } from "../../lib/saju-engine/iljin.ts";
import { calcPillars, type PillarsResult, type SajuInput } from "../../lib/saju-engine/pillars.ts";
import { ALL_OFF, kasiDaySamples, kasiLunarMonths, kasiTerms, kstParts } from "./kasi.ts";

const GAN = "甲乙丙丁戊己庚辛壬癸";
const ZHI = "子丑寅卯辰巳午未申酉戌亥";
const cycleIndex = (p: string) => {
  for (let i = 0; i < 60; i++) if (GAN[i % 10] === p[0] && ZHI[i % 12] === p[1]) return i;
  throw new Error(p);
};
const next = (p: string) => {
  const i = (cycleIndex(p) + 1) % 60;
  return GAN[i % 10] + ZHI[i % 12];
};

// 기존 테스트는 한국천문연구원 표와 같은 가정(보정 모두 꺼짐)으로 계산한다. 기본값 계산은 맨 아래 테스트.
function calc(input: Partial<SajuInput> & { birth_date: string }, options: CorrectionOptions = ALL_OFF): PillarsResult {
  const r = calcPillars({ calendar: "solar", birth_time: null, gender: "female", ...input }, options);
  assert.ok(r.ok, `${input.birth_date} ${input.birth_time}: ${r.ok ? "" : r.error}`);
  return r;
}
const at = (utcMs: number, options?: CorrectionOptions) => calc({ ...kstParts(utcMs) }, options);

// 12절(節)마다 시작되는 월지. 입춘 → 寅, 경칩 → 卯 ...
const JIE_BRANCH: Record<string, string> = {
  입춘: "寅", 경칩: "卯", 청명: "辰", 입하: "巳", 망종: "午", 소서: "未",
  입추: "申", 백로: "酉", 한로: "戌", 입동: "亥", 대설: "子", 소한: "丑",
};
const MIN = 60 * 1000;

test("입춘 경계(1920~2100): 한국천문연구원 입춘 5분 전은 전 해, 5분 뒤는 새 해", () => {
  const ipchun = kasiTerms().filter((t) => t.name === "입춘");
  assert.equal(ipchun.length, 181);
  for (const t of ipchun) {
    const before = at(t.utcMs - 5 * MIN).pillars;
    const after = at(t.utcMs + 5 * MIN).pillars;
    const year = Number(t.kst.slice(0, 4));
    // 입춘 뒤 년주 = (연도 - 4)번째 60갑자
    const expected = GAN[(year - 4) % 10] + ZHI[(year - 4) % 12];
    assert.equal(after.year, expected, `${t.kst} 뒤`);
    assert.equal(next(before.year), after.year, `${t.kst} 앞`);
    assert.equal(after.month[1], "寅", `${t.kst} 월지`);
    assert.equal(before.month[1], "丑", `${t.kst} 앞 월지`);
  }
});

test("절입일 월주(1920~2100, 12절 전체): 5분 전은 앞 달, 5분 뒤는 새 달, 천간은 한 칸씩", () => {
  const jie = kasiTerms().filter((t) => t.name in JIE_BRANCH);
  assert.equal(jie.length, 181 * 12);
  for (const t of jie) {
    const before = at(t.utcMs - 5 * MIN).pillars.month;
    const after = at(t.utcMs + 5 * MIN).pillars.month;
    assert.equal(after[1], JIE_BRANCH[t.name], `${t.name} ${t.kst}`);
    assert.equal(next(before), after, `${t.name} ${t.kst}`);
  }
});

test("라이브러리 절입 시각과 한국천문연구원 표 차이: 모두 3분 안(분포 기록)", (t) => {
  const hist = new Map<number, number>();
  for (const term of kasiTerms().filter((k) => k.name in JIE_BRANCH)) {
    const r = at(term.utcMs);
    const risk = r.boundaryRisks.find((x) => x.kind !== "midnight" && x.term === term.name);
    assert.ok(risk && risk.kind !== "midnight" && risk.minutesFromBoundary !== null, term.kst);
    // 출생 = 한국천문연구원 시각이므로 minutesFromBoundary = 한국천문연구원 - 라이브러리
    const diff = risk.minutesFromBoundary;
    assert.ok(Math.abs(diff) <= 3, `${term.name} ${term.kst}: ${diff}분`);
    const bucket = Math.round(diff);
    hist.set(bucket, (hist.get(bucket) ?? 0) + 1);
  }
  t.diagnostic(`차이(분, 한국천문연구원 - 라이브러리): ${JSON.stringify(Object.fromEntries([...hist].sort((a, b) => a[0] - b[0])))}`);
});

test("세차·월건·일진(한국천문연구원 표본): 사주 년주·월주가 같아지는 날에서 같다", (t) => {
  const terms = kasiTerms();
  let yearChecked = 0, monthChecked = 0, dayChecked = 0;
  for (const s of kasiDaySamples()) {
    const r = calc({ birth_date: s.date, birth_time: "12:00" });
    assert.equal(r.pillars.day, s.iljin, `${s.date} 일주`);
    dayChecked++;
    const noon = Date.parse(`${s.date}T12:00:00Z`) - 9 * 3600 * 1000;
    const year = Number(s.date.slice(0, 4));
    const ipchun = terms.find((k) => k.name === "입춘" && k.kst.startsWith(String(year)));
    // 세차(음력 해)는 설날 이후, 년주는 입춘 이후 → 설날·입춘 둘 다 지난 같은 해 날짜에서 같다
    if (ipchun && noon > ipchun.utcMs + 60 * MIN && s.lunar.year === year) {
      assert.equal(r.pillars.year, s.yearGanzhi, `${s.date} 년주`);
      yearChecked++;
    }
    // 월건(음력 달)은 그 달 번호의 절기 달과 같은 기간이면 사주 월주와 같다
    if (!s.lunar.leap) {
      const branch = ZHI[(s.lunar.month + 1) % 12]; // 1월 → 寅
      if (r.pillars.month[1] === branch && !r.boundaryRisk) {
        assert.equal(r.pillars.month, s.monthGanzhi, `${s.date} 월주`);
        monthChecked++;
      }
    }
  }
  t.diagnostic(`일주 ${dayChecked}건, 년주 ${yearChecked}건, 월주 ${monthChecked}건 비교`);
  assert.ok(yearChecked > 50 && monthChecked > 50);
});

test("시각 모름: 시주 없음, 시각 불확실 표시, 입춘일이면 경계 위험", () => {
  const ipchun2024 = kasiTerms().find((k) => k.name === "입춘" && k.kst.startsWith("2024"))!;
  const day = calc({ birth_date: ipchun2024.kst.slice(0, 10) });
  assert.equal(day.pillars.hour, null);
  assert.equal(day.timeUncertain, true);
  assert.equal(day.boundaryRisk, true);
  const risk = day.boundaryRisks[0];
  assert.ok(risk.kind === "ipchun");
  assert.equal(risk.term, "입춘");
  assert.equal(risk.before.year, "癸卯");
  assert.equal(risk.after.year, "甲辰");
  assert.equal(risk.minutesFromBoundary, null);

  const plain = calc({ birth_date: "2024-02-10" });
  assert.equal(plain.timeUncertain, true);
  assert.equal(plain.boundaryRisk, false);
  // 2024-02-10(음력 1월 1일): 한국천문연구원 세차 甲辰, 월건 丙寅, 일진 甲辰. 입춘(2/4)과 설날 뒤라 년·월주와 같다.
  const kasi = kasiDaySamples().find((s) => s.date === "2024-02-10")!;
  assert.deepEqual([kasi.yearGanzhi, kasi.monthGanzhi, kasi.iljin], ["甲辰", "丙寅", "甲辰"]);
  assert.deepEqual(plain.pillars, { year: "甲辰", month: "丙寅", day: "甲辰", hour: null });
  // 겉글자 6개: 甲·寅·甲 목, 丙 화, 辰·辰 토
  assert.deepEqual(plain.ohaengDistribution, { 목: 3, 화: 1, 토: 2, 금: 0, 수: 0 });
});

test("시각 모름: 다른 절입일은 jeolip, 보정으로 날짜가 넘어가면 midnight", () => {
  const gyeongchip = kasiTerms().find((k) => k.name === "경칩" && k.kst.startsWith("2024"))!;
  const r = calc({ birth_date: gyeongchip.kst.slice(0, 10) });
  assert.ok(r.boundaryRisks.some((x) => x.kind === "jeolip" && x.term === "경칩"));

  const solarTime = { ...ALL_OFF, trueSolarTime: { enabled: true, minutes: -32 } };
  const m = calc({ birth_date: "2024-02-10" }, solarTime);
  assert.ok(m.boundaryRisks.some((x) => x.kind === "midnight"));
  const zi = calc({ birth_date: "2024-02-10" }, { ...ALL_OFF, ziHour: "day-changes-at-23" });
  assert.ok(zi.boundaryRisks.some((x) => x.kind === "midnight"));
});

test("시각 앎: 입춘 60분 안이면 경계 위험, 2시간 밖이면 없음", () => {
  const t = kasiTerms().find((k) => k.name === "입춘" && k.kst.startsWith("2024"))!;
  const near = at(t.utcMs - 40 * MIN);
  assert.ok(near.boundaryRisks.some((x) => x.kind === "ipchun" && x.minutesFromBoundary !== null && x.minutesFromBoundary < -38));
  assert.equal(near.timeUncertain, false);
  const far = at(t.utcMs - 120 * MIN);
  assert.equal(far.boundaryRisk, false);
});

test("자시: 기본은 00:00에 날짜 변경(23시 시주 천간은 다음 날 기준), 옵션이면 23:00에 변경", () => {
  const today = kasiDaySamples().find((s) => s.date === "2024-02-10")!.iljin;
  const tomorrow = calcIljin(2024, 2, 11).pillar;
  const midnight = calc({ birth_date: "2024-02-10", birth_time: "23:30" });
  assert.equal(midnight.pillars.day, today);
  assert.equal(midnight.pillars.hour![1], "子");
  // 子시 천간 = 다음 날 일간 기준(甲己일 甲子, 乙庚일 丙子, 丙辛일 戊子, 丁壬일 庚子, 戊癸일 壬子)
  const ziGan = "甲丙戊庚壬"[GAN.indexOf(tomorrow[0]) % 5];
  assert.equal(midnight.pillars.hour![0], ziGan);
  assert.ok(midnight.boundaryRisks.some((x) => x.kind === "midnight" && x.minutesFromBoundary === -30));

  const early = calc({ birth_date: "2024-02-10", birth_time: "23:30" }, { ...ALL_OFF, ziHour: "day-changes-at-23" });
  assert.equal(early.pillars.day, tomorrow);
  assert.equal(early.pillars.hour, midnight.pillars.hour);
  assert.equal(early.corrections.applied.ziHour, "day-changes-at-23");

  const zero = calc({ birth_date: "2024-02-11", birth_time: "00:30" });
  assert.equal(zero.pillars.day, tomorrow);
  assert.equal(zero.pillars.hour, midnight.pillars.hour);
});

test("서머타임: 1987-07-15 00:30은 보정하면 전날 23:30으로 계산, 끄면 안내만", () => {
  const on = calc({ birth_date: "1987-07-15", birth_time: "00:30" }, { ...ALL_OFF, summerTime: true });
  assert.equal(on.corrections.applied.summerTimeHourRemoved, true);
  assert.equal(on.corrections.calcLocal, "1987-07-14 23:30:00");
  assert.equal(on.pillars.day, calcIljin(1987, 7, 14).pillar);
  const off = calc({ birth_date: "1987-07-15", birth_time: "00:30" });
  assert.equal(off.corrections.applied.summerTimeHourRemoved, false);
  assert.equal(off.pillars.day, calcIljin(1987, 7, 15).pillar);
  assert.deepEqual(off.corrections.periodNotes, ["summer-time-period"]);
});

test("표준시 이력: 1958-03-01 10:00은 켜면 UTC+8:30으로 출생 순간이 30분 늦어진다", () => {
  const on = calc({ birth_date: "1958-03-01", birth_time: "10:00" }, { ...ALL_OFF, standardTimeHistory: true });
  assert.equal(on.corrections.applied.standardOffset, "+08:30");
  assert.equal(on.corrections.instantUtc, "1958-03-01T01:30:00.000Z");
  assert.equal(on.corrections.calcLocal, "1958-03-01 10:00:00");
  const off = calc({ birth_date: "1958-03-01", birth_time: "10:00" });
  assert.equal(off.corrections.applied.standardOffset, "+09:00");
  assert.equal(off.corrections.instantUtc, "1958-03-01T01:00:00.000Z");
  assert.deepEqual(off.corrections.periodNotes, ["non-kst-standard-period"]);
});

test("진태양시 -32분: 2000-01-01 00:20 → 전날 일주", () => {
  const r = calc({ birth_date: "2000-01-01", birth_time: "00:20" }, { ...ALL_OFF, trueSolarTime: { enabled: true, minutes: -32 } });
  assert.equal(r.corrections.applied.trueSolarTimeMinutes, -32);
  assert.equal(r.pillars.day, calcIljin(1999, 12, 31).pillar);
});

test("음력·윤달 입력: 한국천문연구원 달 시작일 기준으로 양력 변환", () => {
  const months = kasiLunarMonths();
  const leap = months.find((m) => m.leap && m.year === 2023)!;
  const r = calc({ birth_date: `2023-${String(leap.month).padStart(2, "0")}-10`, calendar: "lunar_leap" });
  assert.equal(r.solarDate, new Date(Date.parse(`${leap.start}T00:00:00Z`) + 9 * 86400000).toISOString().slice(0, 10));
  const plain = months.find((m) => !m.leap && m.year === 2023 && m.month === leap.month)!;
  const p = calc({ birth_date: `2023-${String(leap.month).padStart(2, "0")}-10`, calendar: "lunar" });
  assert.equal(p.solarDate, new Date(Date.parse(`${plain.start}T00:00:00Z`) + 9 * 86400000).toISOString().slice(0, 10));
  const none = calcPillars({ birth_date: "2024-03-01", calendar: "lunar_leap", birth_time: null, gender: "male" });
  assert.deepEqual(none, { ok: false, error: "no_such_lunar_date" });
});

test("범위 끝과 잘못된 입력", () => {
  const base = { birth_time: null, gender: "male" as const };
  assert.equal(calcPillars({ ...base, birth_date: "1900-01-01", calendar: "solar" }).ok, true);
  assert.equal(calcPillars({ ...base, birth_date: "2100-12-31", calendar: "solar" }).ok, true);
  assert.deepEqual(calcPillars({ ...base, birth_date: "1899-12-31", calendar: "solar" }), { ok: false, error: "out_of_range" });
  assert.deepEqual(calcPillars({ ...base, birth_date: "2101-01-01", calendar: "solar" }), { ok: false, error: "out_of_range" });
  assert.deepEqual(calcPillars({ ...base, birth_date: "2023-02-29", calendar: "solar" }), { ok: false, error: "invalid_date" });
  assert.deepEqual(calcPillars({ ...base, birth_date: "2023-2-1", calendar: "solar" }), { ok: false, error: "invalid_date" });
  assert.deepEqual(calcPillars({ ...base, birth_date: "2023-02-01", calendar: "solar", birth_time: "24:00" }), { ok: false, error: "invalid_time" });
  assert.equal(calcPillars({ ...base, birth_date: "1900-01-01", calendar: "lunar" }).ok, true);
  assert.deepEqual(calcPillars({ ...base, birth_date: "1899-12-01", calendar: "lunar" }), { ok: false, error: "out_of_range" });
  // 1900년 1월 1일(양력)은 입춘 전 → 1899년 己亥
  assert.equal(calc({ birth_date: "1900-01-01" }).pillars.year, "己亥");
  // HH:MM:SS(DB time 형식)도 받는다
  assert.equal(calc({ birth_date: "2024-02-10", birth_time: "09:15:00" }).pillars.hour![1], "巳");
});

test("기본 보정(서머타임·표준시 이력 켜짐): 1987-07-15 10:30 → 계산 시각 09:30", () => {
  const r = calc({ birth_date: "1987-07-15", birth_time: "10:30" }, DEFAULT_CORRECTIONS);
  assert.equal(r.corrections.applied.summerTimeHourRemoved, true);
  assert.equal(r.corrections.calcLocal, "1987-07-15 09:30:00");
  assert.deepEqual(calcPillars({ birth_date: "1987-07-15", calendar: "solar", birth_time: "10:30", gender: "female" }), r);
});

test("기본 보정: 1958-08-10 00:40 → 계산 시각 전날 23:40(UTC+8:30 서머타임), 일주 戊午", () => {
  const r = calc({ birth_date: "1958-08-10", birth_time: "00:40" }, DEFAULT_CORRECTIONS);
  assert.equal(r.corrections.applied.standardOffset, "+08:30");
  assert.equal(r.corrections.applied.summerTimeHourRemoved, true);
  assert.equal(r.corrections.calcLocal, "1958-08-09 23:40:00");
  assert.equal(r.pillars.day, "戊午");
  assert.deepEqual(calcPillars({ birth_date: "1958-08-10", calendar: "solar", birth_time: "00:40", gender: "female" }), r);
});
