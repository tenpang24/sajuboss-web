// 8-B2: 음력·윤달 입력이 한국 음력에 실제로 있는 날짜인지 서버 검증에서 확인.
// 사주 저장(/my)과 신년 리포트 사전신청("다른 사람 사주")은 readSajuForm, 신청 폼 3종은 각 폼 검증 함수를 직접 부른다.
// (신청 폼 3종의 서버 액션은 접수 스위치가 꺼져 있으면 검증 전에 "오픈 준비 중"으로 끝나서 폼 검증 함수로 확인한다.)
import assert from "node:assert/strict";
import { test } from "node:test";
import { readDateForm } from "@/lib/apply/date";
import { readNameBizForm } from "@/lib/apply/name-biz";
import { readNamePersonForm } from "@/lib/apply/name-person";
import { LUNAR_DATE_ERROR, lunarDateError, readSajuForm } from "@/lib/saju";
import { kasiLunarMonths } from "../saju-engine/kasi.ts";

const USER = "00000000-0000-4000-8000-000000000001";

// 한국천문연구원 자료에서 29일까지만 있는 평달 하나(2월 제외)와, 윤달이 없는 해 하나.
// 2월은 날짜 형식 검사(parseBirthDate)가 양력 달력 기준이라 30일이 음력 검사 전에 거부된다(HANDOFF 7번 알려진 문제).
const months = kasiLunarMonths();
const short = months.find((m) => !m.leap && m.length === 29 && m.month !== 2 && m.year >= 1980 && m.year <= 2000)!;
const pad = (n: number) => String(n).padStart(2, "0");
const MISSING_30 = `${short.year}-${pad(short.month)}-30`;
const VALID_29 = `${short.year}-${pad(short.month)}-29`;
const NO_LEAP_YEAR = months.find((m) => m.year >= 1980 && !months.some((x) => x.year === m.year && x.leap))!.year;
const MISSING_LEAP = `${NO_LEAP_YEAR}-03-10`;

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
}

const saju = (birth: string, calendar: string) => ({
  sajuSource: "input",
  birth,
  calendar,
  time: "09:00",
  gender: "female",
});

test("lunarDateError: 없는 음력 날짜만 거부", () => {
  assert.equal(lunarDateError(MISSING_30, "lunar"), LUNAR_DATE_ERROR);
  assert.equal(lunarDateError(VALID_29, "lunar"), null);
  assert.equal(lunarDateError(MISSING_LEAP, "lunar_leap"), LUNAR_DATE_ERROR);
  assert.equal(lunarDateError("2023-02-10", "lunar_leap"), null); // 2023 윤2월
  assert.equal(lunarDateError(MISSING_30, "solar"), null); // 양력은 parseBirthDate가 확인
  assert.equal(LUNAR_DATE_ERROR, "음력에 없는 날짜입니다. 다시 확인해 주세요.");
});

test("사주 저장·신년 리포트 사전신청(readSajuForm): 없는 음력 날짜 거부", () => {
  const bad = readSajuForm(form({ birth: MISSING_30, calendar: "lunar", time: "09:00", gender: "male" }));
  assert.deepEqual(bad, { ok: false, error: LUNAR_DATE_ERROR, field: "birth" });
  const leap = readSajuForm(form({ birth: MISSING_LEAP, calendar: "lunar_leap", time: "", gender: "male" }));
  assert.deepEqual(leap, { ok: false, error: LUNAR_DATE_ERROR, field: "birth" });
  assert.ok(readSajuForm(form({ birth: VALID_29, calendar: "lunar", time: "09:00", gender: "male" })).ok);
});

test("개업택일 폼: 대표자와 동업자 모두 없는 음력 날짜 거부", async () => {
  const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const base = { openType: "new", business: "카페", area: "부산", dateFrom: day(30), dateTo: day(31) };
  const r = await readDateForm(form({ ...base, ...saju(MISSING_30, "lunar") }), USER);
  assert.deepEqual(r, { ok: false, error: LUNAR_DATE_ERROR, field: "birth" });

  const partner = await readDateForm(
    form({ ...base, ...saju(VALID_29, "lunar"), partner: "on", partner_birth: MISSING_30, partner_calendar: "lunar" }),
    USER,
  );
  assert.ok(!partner.ok);
  assert.equal(partner.error, `동업자 ${LUNAR_DATE_ERROR}`);
  assert.equal(partner.field, "partner_birth");
});

test("상호·브랜드 작명 폼: 없는 음력 날짜 거부", async () => {
  const r = await readNameBizForm(
    form({ nameType: "new", business: "카페", intro: "동네 카페", ...saju(MISSING_30, "lunar") }),
    USER,
  );
  assert.deepEqual(r, { ok: false, error: LUNAR_DATE_ERROR, field: "birth" });
});

test("개인·개명 작명 폼: 성인·아기 모두 없는 음력 날짜 거부(아기 안내 문구로 바뀌지 않음)", async () => {
  const adult = await readNamePersonForm(form({ kind: "adult", ...saju(MISSING_30, "lunar") }), USER);
  assert.deepEqual(adult, { ok: false, error: LUNAR_DATE_ERROR, field: "birth" });
  const baby = await readNamePersonForm(form({ kind: "baby", ...saju(MISSING_LEAP, "lunar_leap") }), USER);
  assert.deepEqual(baby, { ok: false, error: LUNAR_DATE_ERROR, field: "birth" });
});
