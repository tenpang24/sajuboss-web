// 음력 2월 29·30일처럼 양력 달력에 없는 날짜: 한국 음력에 있으면 "양력으로 바꿔 넣기" 안내, 없으면 음력 오류.
// 바꿔 넣어 다시 보낸 신청은 원래 입력(original_lunar_input)이 신청 내용에 남는다(사주 저장에는 남기지 않음).
import assert from "node:assert/strict";
import { test } from "node:test";
import { describeSaju } from "@/lib/admin/payload";
import { readDateForm } from "@/lib/apply/date";
import { readNameBizForm } from "@/lib/apply/name-biz";
import { readNamePersonForm } from "@/lib/apply/name-person";
import { LUNAR_DATE_ERROR, readSajuForm } from "@/lib/saju";
import { kasiLunarMonths } from "../saju-engine/kasi.ts";

const USER = "00000000-0000-4000-8000-000000000001";
const DAY = 24 * 3600 * 1000;
const months = kasiLunarMonths();
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

// 음력 2월이 30일까지 있는 해(평달), 29일까지만 있는 해, 양력 평년(2월 29일 없음)
const feb30 = months.find((m) => !m.leap && m.month === 2 && m.length === 30 && m.year >= 1950)!;
const feb29only = months.find((m) => !m.leap && m.month === 2 && m.length === 29 && m.year >= 1950)!;
const plainYear = months.find(
  (m) => !m.leap && m.month === 2 && m.year >= 1950 && m.year % 4 !== 0 && m.year !== feb30.year,
)!;
const EXISTS_30 = `${feb30.year}-02-30`;
const EXISTS_30_SOLAR = addDays(feb30.start, 29);
const MISSING_30 = `${feb29only.year}-02-30`;
const PLAIN_29 = `${plainYear.year}-02-29`;
const PLAIN_29_SOLAR = addDays(plainYear.start, 28);

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}
const saju = (birth: string, calendar: string, extra: Record<string, string> = {}) => ({
  sajuSource: "input",
  birth,
  calendar,
  time: "09:00",
  gender: "female",
  ...extra,
});
const sayings = (lunar: string, solar: string) => {
  const [y, m, d] = lunar.split("-").map(Number);
  const [sy, sm, sd] = solar.split("-").map(Number);
  return `음력 ${y}년 ${m}월 ${d}일은 양력 ${sy}년 ${sm}월 ${sd}일입니다. 사주 계산 결과는 같습니다.`;
};

test("사주 저장·사전신청(readSajuForm): 있는 음력 2월 30일 → 양력으로 바꿔 넣기 안내", () => {
  const r = readSajuForm(form({ birth: EXISTS_30, calendar: "lunar", time: "09:00", gender: "male" }));
  assert.deepEqual(r, {
    ok: false,
    error: sayings(EXISTS_30, EXISTS_30_SOLAR),
    field: "birth",
    lunar: { field: "birth", solarDate: EXISTS_30_SOLAR, original: { calendar: "lunar", date: EXISTS_30 } },
  });
});

test("사주 저장·사전신청: 없는 음력 2월 30일 → 음력 오류(안내 없음)", () => {
  const r = readSajuForm(form({ birth: MISSING_30, calendar: "lunar", time: "09:00", gender: "male" }));
  assert.deepEqual(r, { ok: false, error: LUNAR_DATE_ERROR, field: "birth" });
  // 윤2월이 29일까지인 해의 윤2월 30일도 없는 날짜
  const leap = readSajuForm(form({ birth: "2023-02-30", calendar: "lunar_leap", time: "", gender: "male" }));
  assert.deepEqual(leap, { ok: false, error: LUNAR_DATE_ERROR, field: "birth" });
});

test("사주 저장·사전신청: 양력 평년의 음력 2월 29일 → 안내", () => {
  const r = readSajuForm(form({ birth: PLAIN_29, calendar: "lunar", time: "", gender: "female" }));
  assert.ok(!r.ok);
  assert.equal(r.error, sayings(PLAIN_29, PLAIN_29_SOLAR));
  assert.deepEqual(r.lunar?.original, { calendar: "lunar", date: PLAIN_29 });
});

test("양력 2월 30일·양력으로 고른 날짜는 기존 오류 그대로", () => {
  const r = readSajuForm(form({ birth: EXISTS_30, calendar: "solar", time: "", gender: "female" }));
  assert.deepEqual(r, { ok: false, error: "생년월일을 다시 확인해 주세요. 예: 1972-03-15", field: "birth" });
});

test("바꿔 넣은 뒤 다시 보내면 원래 입력이 값에 남고, 맞지 않는 원래 입력은 버림", () => {
  const ok = readSajuForm(
    form({ birth: EXISTS_30_SOLAR, calendar: "solar", time: "09:00", gender: "male", originalLunar: `lunar:${EXISTS_30}` }),
  );
  assert.ok(ok.ok);
  assert.deepEqual(ok.value.original_lunar_input, { calendar: "lunar", date: EXISTS_30 });
  assert.equal(ok.value.birth_date, EXISTS_30_SOLAR);
  assert.equal(ok.value.calendar, "solar");

  // 바꾼 뒤 날짜를 고쳤거나(양력 날짜와 안 맞음), 형식이 틀리면 남기지 않는다
  const edited = readSajuForm(
    form({ birth: addDays(EXISTS_30_SOLAR, 1), calendar: "solar", time: "", gender: "male", originalLunar: `lunar:${EXISTS_30}` }),
  );
  assert.ok(edited.ok);
  assert.equal("original_lunar_input" in edited.value, false);
  const bogus = readSajuForm(
    form({ birth: EXISTS_30_SOLAR, calendar: "solar", time: "", gender: "male", originalLunar: "lunar:<script>" }),
  );
  assert.ok(bogus.ok);
  assert.equal("original_lunar_input" in bogus.value, false);
  // 음력을 고른 채 보내면 원래 입력 칸은 읽지 않는다
  const lunarKept = readSajuForm(
    form({ birth: "1975-02-08", calendar: "lunar", time: "", gender: "male", originalLunar: `lunar:${EXISTS_30}` }),
  );
  assert.ok(lunarKept.ok);
  assert.equal("original_lunar_input" in lunarKept.value, false);
});

test("신청 폼 3종: 안내가 돌아오고, 동업자는 partner_birth로", async () => {
  const day = (n: number) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
  const base = { openType: "new", business: "카페", area: "부산", dateFrom: day(30), dateTo: day(31) };

  const date = await readDateForm(form({ ...base, ...saju(EXISTS_30, "lunar") }), USER);
  assert.ok(!date.ok);
  assert.equal(date.field, "birth");
  assert.equal(date.lunar?.solarDate, EXISTS_30_SOLAR);

  const partner = await readDateForm(
    form({ ...base, ...saju("1975-03-20", "solar"), partner: "on", partner_birth: PLAIN_29, partner_calendar: "lunar" }),
    USER,
  );
  assert.ok(!partner.ok);
  assert.equal(partner.error, `동업자 ${sayings(PLAIN_29, PLAIN_29_SOLAR)}`);
  assert.equal(partner.lunar?.field, "partner_birth");

  const biz = await readNameBizForm(form({ nameType: "new", business: "카페", intro: "동네 카페", ...saju(EXISTS_30, "lunar") }), USER);
  assert.ok(!biz.ok);
  assert.equal(biz.lunar?.solarDate, EXISTS_30_SOLAR);

  const adult = await readNamePersonForm(form({ kind: "adult", ...saju(MISSING_30, "lunar") }), USER);
  assert.deepEqual(adult, { ok: false, error: LUNAR_DATE_ERROR, field: "birth" });
  // 아기 이름의 생년월일 안내 문구가 양력 변환 안내를 덮지 않는다
  const baby = await readNamePersonForm(form({ kind: "baby", ...saju(PLAIN_29, "lunar") }), USER);
  assert.ok(!baby.ok);
  assert.equal(baby.error, sayings(PLAIN_29, PLAIN_29_SOLAR));
  assert.equal(baby.lunar?.field, "birth");
});

test("신청 내용(payload)에 원래 입력이 남고 관리자 화면에 '원래 입력'으로 보임", async () => {
  const day = (n: number) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
  const converted = { birth: EXISTS_30_SOLAR, calendar: "solar", originalLunar: `lunar:${EXISTS_30}` };
  const r = await readDateForm(
    form({
      openType: "new",
      business: "카페",
      area: "부산",
      dateFrom: day(30),
      dateTo: day(31),
      ...saju(converted.birth, converted.calendar, { originalLunar: converted.originalLunar }),
      partner: "on",
      partner_birth: PLAIN_29_SOLAR,
      partner_calendar: "solar",
      partner_originalLunar: `lunar:${PLAIN_29}`,
    }),
    USER,
  );
  assert.ok(r.ok, r.ok ? "" : r.error);
  const payload = r.value.payload as { saju: Record<string, unknown>; partner_saju: Record<string, unknown> };
  assert.deepEqual(payload.saju.original_lunar_input, { calendar: "lunar", date: EXISTS_30 });
  assert.deepEqual(payload.partner_saju.original_lunar_input, { calendar: "lunar", date: PLAIN_29 });

  const [y, , d] = EXISTS_30.split("-").map(Number);
  assert.match(describeSaju(payload.saju), new RegExp(`원래 입력: 음력 ${y}년 2월 ${d}일$`));
  assert.doesNotMatch(describeSaju({ ...payload.saju, original_lunar_input: { calendar: "x", date: "1" } }), /원래 입력/);
});
