// 오늘의 사업운: 문구 150개, 같은 날 같은 결과·날이 바뀌면 바뀜, 시각 모름·음력·윤달, 호출 제한.
import assert from "node:assert/strict";
import { test } from "node:test";
import { koreanLunarToSolar } from "../../lib/saju-engine/korean-lunar.ts";
import { TODAY_FIELDS, TODAY_PHRASES } from "../../lib/today/phrases.ts";
import { TODAY_LIMIT, allowTodayCall } from "../../lib/today/rate-limit.ts";
import { calcToday, type TodayInput, type TodayResult } from "../../lib/today/today.ts";

const RELATIONS = ["생", "극", "합", "충", "비화"] as const;
const INPUT: TodayInput = { birth_date: "1975-03-20", calendar: "solar", birth_time: "09:00" };
const DAY = 24 * 3600 * 1000;
// 한국 시각 정오(UTC 03:00)
const kstNoon = (date: string) => new Date(`${date}T03:00:00Z`);

function today(input: TodayInput = INPUT, date = "2026-10-22"): TodayResult {
  const r = calcToday(input, kstNoon(date));
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r;
}

test("문구 150개: 분야 3 × 관계 5 × 10개, ID 형식·중복 없음", () => {
  assert.equal(TODAY_PHRASES.length, 150);
  for (const field of TODAY_FIELDS) {
    for (const relation of RELATIONS) {
      const list = TODAY_PHRASES.filter((p) => p.field === field && p.relation === relation);
      assert.equal(list.length, 10, `${field} ${relation}`);
      assert.deepEqual(
        list.map((p) => p.id),
        Array.from({ length: 10 }, (_, i) => `오늘-${field}-${relation}-${String(i + 1).padStart(2, "0")}`),
      );
    }
  }
  assert.equal(new Set(TODAY_PHRASES.map((p) => p.id)).size, 150);
  assert.ok(TODAY_PHRASES.every((p) => ["길", "중", "흉"].includes(p.tone) && p.text.length > 0));
});

test("같은 입력·같은 날 → 같은 결과", () => {
  assert.deepEqual(today(), today());
  // 같은 날이면 시각이 달라도(한국 날짜 기준) 같다
  const morning = calcToday(INPUT, new Date("2026-10-21T15:30:00Z")); // KST 10-22 00:30
  const night = calcToday(INPUT, new Date("2026-10-22T14:30:00Z")); // KST 10-22 23:30
  assert.deepEqual(morning, night);
  assert.equal(today().date, "2026-10-22");
});

test("결과 형태: 일진·관계·분야 3개, 한마디는 사업운 문장", () => {
  const r = today();
  assert.equal(r.dayPillar, "乙丑");
  assert.match(r.iljin, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  assert.ok(RELATIONS.includes(r.relation));
  assert.deepEqual(r.fields.map((f) => f.field), ["사업운", "매출운", "거래운"]);
  for (const f of r.fields) {
    const phrase = TODAY_PHRASES.find((p) => p.id === f.id)!;
    assert.equal(phrase.relation, r.relation);
    assert.equal(phrase.text, f.text);
    assert.equal(phrase.tone, f.tone);
  }
  assert.equal(r.oneLiner, r.fields[0].text);
});

test("날이 바뀌면 결과가 바뀜(관계가 같은 날끼리도 문장 선택이 바뀔 수 있음)", () => {
  const days = Array.from({ length: 60 }, (_, i) => new Date(Date.parse("2026-10-22T00:00:00Z") + i * DAY).toISOString().slice(0, 10));
  const results = days.map((d) => today(INPUT, d));
  assert.ok(new Set(results.map((r) => r.iljin)).size === 60, "60일 동안 일진이 모두 다름");
  assert.ok(new Set(results.map((r) => r.fields.map((f) => f.id).join())).size > 30);
  // 관계가 같은 두 날 중 문장이 다른 경우가 있다(선택이 날짜에 따라 바뀜)
  const byRelation = new Map<string, Set<string>>();
  for (const r of results) {
    const set = byRelation.get(r.relation) ?? new Set();
    set.add(r.fields.map((f) => f.id).join());
    byRelation.set(r.relation, set);
  }
  assert.ok([...byRelation.values()].some((set) => set.size > 1));
  // 60일 안에 관계 5종이 모두 나온다
  assert.deepEqual([...byRelation.keys()].sort(), [...RELATIONS].sort());
});

test("시각 모름, 음력, 음력(윤달), 없는 음력 날짜", () => {
  const unknown = today({ ...INPUT, birth_time: null });
  assert.equal(unknown.dayPillar, "乙丑");

  const solar = koreanLunarToSolar(1975, 2, 8, false);
  assert.ok(solar.ok);
  assert.deepEqual(
    today({ birth_date: "1975-02-08", calendar: "lunar", birth_time: "09:00" }),
    today({ birth_date: solar.solarDate, calendar: "solar", birth_time: "09:00" }),
  );
  const leapSolar = koreanLunarToSolar(2023, 2, 10, true);
  assert.ok(leapSolar.ok);
  assert.deepEqual(
    today({ birth_date: "2023-02-10", calendar: "lunar_leap", birth_time: null }),
    today({ birth_date: leapSolar.solarDate, calendar: "solar", birth_time: null }),
  );
  assert.deepEqual(calcToday({ birth_date: "2024-01-10", calendar: "lunar_leap", birth_time: null }), {
    ok: false,
    error: "no_such_lunar_date",
  });
});

test("호출 제한: 한 IP 1분에 30번까지", () => {
  const ip = "test-ip";
  const t0 = 1_000_000;
  for (let i = 0; i < TODAY_LIMIT; i++) assert.equal(allowTodayCall(ip, t0 + i), true, `${i + 1}번째`);
  assert.equal(allowTodayCall(ip, t0 + 100), false);
  assert.equal(allowTodayCall("other-ip", t0 + 100), true);
  assert.equal(allowTodayCall(ip, t0 + 60_001), true);
});
