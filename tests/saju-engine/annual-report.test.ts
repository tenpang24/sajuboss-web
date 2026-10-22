// 8-B1: 십성, 지지 관계, 2027 신년 리포트 계산 데이터.
import assert from "node:assert/strict";
import { test } from "node:test";
import { calcAnnualReport, type AnnualReportResult } from "../../lib/saju-engine/annual-report.ts";
import { branchRelations } from "../../lib/saju-engine/branch-relations.ts";
import { DEFAULT_CORRECTIONS } from "../../lib/saju-engine/corrections.ts";
import { JUDGMENT_TABLE } from "../../lib/saju-engine/judgment-table.ts";
import { koreanLunarToSolar } from "../../lib/saju-engine/korean-lunar.ts";
import { ENGINE_VERSION, type SajuInput } from "../../lib/saju-engine/pillars.ts";
import { getRelationTypePrecise } from "../../lib/saju-engine/relation.ts";
import { JIJANGGAN_BONGI, ganSipsung, zhiSipsung } from "../../lib/saju-engine/sipsung.ts";
import { kasiTerms } from "./kasi.ts";

const GAN = "甲乙丙丁戊己庚辛壬癸";
const ZHI = "子丑寅卯辰巳午未申酉戌亥";
const MIN = 60 * 1000;

function report(input: Partial<SajuInput> & { birth_date: string }): AnnualReportResult {
  const r = calcAnnualReport({ calendar: "solar", birth_time: null, gender: "female", ...input });
  assert.ok(r.ok, `${input.birth_date}: ${r.ok ? "" : r.error}`);
  return r;
}

test("십성: 甲 일간", () => {
  const expected = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
  assert.deepEqual([...GAN].map((g) => ganSipsung("甲", g)), expected);
});

test("십성: 10×10 전체가 규칙(오행 거리 × 음양 같음/다름)과 맞음", () => {
  // 천간 순서 i/2가 오행(목화토금수, 상생 순), i%2가 음양. 오행 거리 d: 0 같음, 1 내가 생함, 2 내가 극함, 3 나를 극함, 4 나를 생함
  const names = [["비견", "겁재"], ["식신", "상관"], ["편재", "정재"], ["편관", "정관"], ["편인", "정인"]];
  for (let a = 0; a < 10; a++) {
    for (let b = 0; b < 10; b++) {
      const d = (Math.floor(b / 2) - Math.floor(a / 2) + 5) % 5;
      assert.equal(ganSipsung(GAN[a], GAN[b]), names[d][a % 2 === b % 2 ? 0 : 1], `${GAN[a]}→${GAN[b]}`);
    }
  }
});

test("지장간 본기 12개와 지지 십성", () => {
  assert.equal([...ZHI].map((z) => JIJANGGAN_BONGI[z]).join(""), "癸己甲乙戊丙丁己庚辛戊壬");
  for (const z of ZHI) assert.equal(zhiSipsung("甲", z), ganSipsung("甲", JIJANGGAN_BONGI[z]), z);
  assert.equal(zhiSipsung("甲", "子"), "정인");
  assert.equal(zhiSipsung("甲", "午"), "상관");
});

test("지지 관계: 대칭, relation.ts 지지충과 일치", () => {
  for (const a of ZHI) {
    for (const b of ZHI) {
      assert.deepEqual(branchRelations(a, b), branchRelations(b, a), `${a}${b}`);
      const chung = getRelationTypePrecise(`甲${a}`, `甲${b}`) === "충";
      assert.equal(branchRelations(a, b).includes("충"), chung, `${a}${b}`);
    }
  }
});

test("지지 관계: 육합, 형, 삼형 부분, 자형, 겹침", () => {
  for (const p of ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"]) assert.ok(branchRelations(p[0], p[1]).includes("합"), p);
  assert.deepEqual(branchRelations("子", "卯"), ["형"]);
  for (const p of ["寅巳", "丑戌", "戌未"]) assert.deepEqual(branchRelations(p[0], p[1]), ["형(부분)"], p);
  assert.deepEqual(branchRelations("寅", "申"), ["충", "형(부분)"]);
  assert.deepEqual(branchRelations("丑", "未"), ["충", "형(부분)"]);
  assert.deepEqual(branchRelations("巳", "申"), ["합", "형(부분)"]);
  for (const z of "辰午酉亥") assert.deepEqual(branchRelations(z, z), ["자형"], z);
  for (const z of "子丑寅卯巳未申戌") assert.deepEqual(branchRelations(z, z), [], z);
  assert.deepEqual(branchRelations("子", "寅"), []);
});

test("2027 세운 丁未, 12개월 월주 순서", () => {
  const r = report({ birth_date: "1975-03-20", birth_time: "09:00" });
  assert.equal(r.seun.pillar, "丁未");
  assert.deepEqual(
    r.months.map((m) => m.pillar),
    ["壬寅", "癸卯", "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑"],
  );
  assert.equal(r.engine, ENGINE_VERSION);
});

test("12개월 시작·끝 = 한국천문연구원 12절(같은 날, 3분 이내)", () => {
  const JIE = new Set(["입춘", "경칩", "청명", "입하", "망종", "소서", "입추", "백로", "한로", "입동", "대설", "소한"]);
  const all = kasiTerms();
  const start = all.findIndex((t) => t.name === "입춘" && t.kst.startsWith("2027-"));
  assert.equal(all[start].kst, "2027-02-04 10:46");
  const jie = all.slice(start).filter((t) => JIE.has(t.name)).slice(0, 13); // 12절 + 2028 입춘
  assert.equal(jie[12].name, "입춘");
  assert.ok(jie[12].kst.startsWith("2028-"));

  const r = report({ birth_date: "1975-03-20", birth_time: "09:00" });
  const kstMs = (s: string) => Date.parse(`${s.replace(" ", "T")}Z`) - 9 * 3600 * 1000;
  r.months.forEach((m, i) => {
    assert.equal(m.term, jie[i].name);
    assert.equal(m.startKst.slice(0, 10), jie[i].kst.slice(0, 10), m.term);
    assert.ok(Math.abs(kstMs(m.startKst) - jie[i].utcMs) <= 3 * MIN, `${m.term} ${m.startKst} / ${jie[i].kst}`);
    assert.equal(m.endKst, i < 11 ? r.months[i + 1].startKst : m.endKst);
  });
  const last = r.months[11];
  assert.equal(last.endKst.slice(0, 10), jie[12].kst.slice(0, 10));
  assert.ok(Math.abs(kstMs(last.endKst) - jie[12].utcMs) <= 3 * MIN, `${last.endKst} / ${jie[12].kst}`);
  assert.equal(r.months[0].startLabel, "2월 4일경");
});

test("확정 판정표(2026-10-22): 1975-03-20 09:00 양력 여성의 12개월 등급과 움직일 달·조심할 달", () => {
  assert.equal(JUDGMENT_TABLE.confirmed, true);
  const r = report({ birth_date: "1975-03-20", birth_time: "09:00" });
  assert.equal(r.judgmentConfirmed, true);
  assert.deepEqual(
    r.months.map((m) => m.grade),
    ["중", "중", "흉", "중", "중", "중", "길", "길", "길", "흉", "길", "중"],
  );
  assert.deepEqual(r.bestMonths, { indexes: [7, 8, 9], provisional: false });
  assert.deepEqual(r.cautionMonths, { indexes: [3, 10, 1], provisional: false });
  assert.equal(r.bestMonths.indexes.filter((i) => r.cautionMonths.indexes.includes(i)).length, 0);
});

test("점수는 표에서만: 월 천간 십성 점수 + 월지·일지 보정(연지·지지 십성·세운은 점수에 없음)", () => {
  const r = report({ birth_date: "1975-03-20", birth_time: "09:00" });
  for (const m of r.months) {
    const expected =
      JUDGMENT_TABLE.monthGanSipsungScore[m.ganSipsung] +
      m.withDayBranch.reduce((sum, rel) => sum + JUDGMENT_TABLE.monthDayBranchAdjust[rel], 0);
    assert.equal(m.score, expected, `${m.index} ${m.pillar}`);
  }
  // 9월 庚戌: 연지 卯와 합이 있어도 점수에 넣지 않는다(정관 2 + 일지 丑과 형(부분) 0)
  const sep = r.months[8];
  assert.deepEqual(sep.withYearBranch, ["합"]);
  assert.equal(sep.score, 2);
});

test("같은 입력 두 번 → 결과가 완전히 같음", () => {
  const input: SajuInput = { birth_date: "1975-03-20", calendar: "solar", birth_time: "09:00", gender: "female" };
  assert.deepEqual(calcAnnualReport(input), calcAnnualReport(input));
  assert.deepEqual(calcAnnualReport(input), calcAnnualReport(input, DEFAULT_CORRECTIONS));
});

test("시각 모름: 시지 관계 없음, timeUncertain 전달", () => {
  const r = report({ birth_date: "1975-03-20" });
  assert.equal(r.timeUncertain, true);
  assert.equal(r.natal.hour, null);
  assert.deepEqual(r.seun.relations.map((x) => x.position), ["year", "month", "day"]);
  const known = report({ birth_date: "1975-03-20", birth_time: "09:00" });
  assert.equal(known.timeUncertain, false);
  assert.deepEqual(known.seun.relations.map((x) => x.position), ["year", "month", "day", "hour"]);
});

test("음력·윤달 입력 = 변환한 양력 입력과 같은 리포트, 없는 음력 날짜는 오류", () => {
  const lunar = report({ birth_date: "1975-02-08", calendar: "lunar", birth_time: "09:00" });
  const solar = koreanLunarToSolar(1975, 2, 8, false);
  assert.ok(solar.ok);
  const fromSolar = report({ birth_date: solar.solarDate, birth_time: "09:00" });
  assert.deepEqual(lunar.months, fromSolar.months);
  assert.deepEqual(lunar.natal, fromSolar.natal);

  const leap = report({ birth_date: "2023-02-10", calendar: "lunar_leap", birth_time: "09:00" });
  const leapSolar = koreanLunarToSolar(2023, 2, 10, true);
  assert.ok(leapSolar.ok);
  assert.equal(leapSolar.solarDate, "2023-03-31");
  assert.deepEqual(leap.natal, report({ birth_date: leapSolar.solarDate, birth_time: "09:00" }).natal);

  const missing = calcAnnualReport({ birth_date: "2024-01-10", calendar: "lunar_leap", birth_time: null, gender: "female" });
  assert.deepEqual(missing, { ok: false, error: "no_such_lunar_date" });
});
