// 보정 표가 IANA tz database(Node 내장 ICU의 Asia/Seoul)와 같은지, 벽시계 해석이 맞는지.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CORRECTIONS,
  SEOUL_TIME_HISTORY,
  calcLocalMs,
  periodNotes,
  resolveClock,
  type CorrectionOptions,
} from "../../lib/saju-engine/corrections.ts";
import { ALL_OFF } from "./kasi.ts";

const seoul = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", timeZoneName: "longOffset" });
function icuOffsetSeconds(utcMs: number): number {
  const v = seoul.formatToParts(new Date(utcMs)).find((p) => p.type === "timeZoneName")!.value;
  const m = /GMT([+-])(\d\d):(\d\d)(?::(\d\d))?/.exec(v)!;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4] ?? 0));
}
const ALL_ON: CorrectionOptions = { ...ALL_OFF, summerTime: true, standardTimeHistory: true };
const tableOffset = (utcMs: number) => {
  let seg = SEOUL_TIME_HISTORY[0];
  for (const s of SEOUL_TIME_HISTORY) if (Date.parse(s.fromUtc) <= utcMs) seg = s;
  return seg.standard + (seg.summer ? 3600 : 0);
};

test("보정 표 = IANA Asia/Seoul: 모든 전환 시각 앞뒤 1초", () => {
  for (const s of SEOUL_TIME_HISTORY.slice(1)) {
    const at = Date.parse(s.fromUtc);
    assert.equal(tableOffset(at), icuOffsetSeconds(at), `${s.fromUtc} 직후`);
    assert.equal(tableOffset(at - 1000), icuOffsetSeconds(at - 1000), `${s.fromUtc} 직전`);
  }
});

test("보정 표 = IANA Asia/Seoul: 1900~2030 6시간 간격 전체", () => {
  for (let t = Date.UTC(1900, 0, 1); t < Date.UTC(2030, 0, 1); t += 6 * 3600 * 1000) {
    assert.equal(tableOffset(t), icuOffsetSeconds(t), new Date(t).toISOString());
  }
});

const clock = (y: number, mo: number, d: number, h: number, mi: number) => Date.UTC(y, mo - 1, d, h, mi);

test("보정 꺼짐: 항상 UTC+9, 적힌 시각 그대로 계산", () => {
  for (const c of [clock(1950, 7, 1, 10, 0), clock(1958, 1, 1, 10, 0), clock(1987, 7, 1, 10, 0), clock(1905, 1, 1, 10, 0)]) {
    const r = resolveClock(c, ALL_OFF);
    assert.equal(r.offsetSeconds, 9 * 3600);
    assert.equal(r.summerApplied, false);
    assert.equal(calcLocalMs(r, ALL_OFF), c);
  }
});

test("서머타임 보정: 1987-07-01 10:00 → UTC 00:00, 계산 시각 09:00", () => {
  const options = { ...ALL_OFF, summerTime: true };
  const r = resolveClock(clock(1987, 7, 1, 10, 0), options);
  assert.equal(new Date(r.utcMs).toISOString(), "1987-07-01T00:00:00.000Z");
  assert.equal(r.summerApplied, true);
  assert.equal(new Date(calcLocalMs(r, options)).toISOString(), "1987-07-01T09:00:00.000Z");
});

test("서머타임 시작 때 없던 시각(1987-05-10 02:30), 끝날 때 두 번 있던 시각(1987-10-11 02:30)", () => {
  const options = { ...ALL_OFF, summerTime: true };
  assert.equal(resolveClock(clock(1987, 5, 10, 2, 30), options).clockIssue, "nonexistent");
  const amb = resolveClock(clock(1987, 10, 11, 2, 30), options);
  assert.equal(amb.clockIssue, "ambiguous");
  assert.equal(amb.summerApplied, true); // 먼저 온 쪽
  assert.equal(resolveClock(clock(1987, 10, 11, 4, 0), options).clockIssue, null);
});

test("표준시 이력: 1958-01-01 12:00은 UTC+8:30, 1958-07-01 12:00은 서머타임까지 켜면 UTC+9:30", () => {
  const history = { ...ALL_OFF, standardTimeHistory: true };
  const a = resolveClock(clock(1958, 1, 1, 12, 0), history);
  assert.equal(a.offsetSeconds, 8.5 * 3600);
  assert.equal(calcLocalMs(a, history), clock(1958, 1, 1, 12, 0));
  const b = resolveClock(clock(1958, 7, 1, 12, 0), ALL_ON);
  assert.equal(b.offsetSeconds, 9.5 * 3600);
  assert.equal(calcLocalMs(b, ALL_ON), clock(1958, 7, 1, 11, 0));
});

test("진태양시: -32분이면 계산 시각이 UTC+8:28 기준", () => {
  const options = { ...ALL_OFF, trueSolarTime: { enabled: true, minutes: -32 } };
  const r = resolveClock(clock(2000, 1, 1, 0, 20), options);
  assert.equal(new Date(calcLocalMs(r, options)).toISOString(), "1999-12-31T23:48:00.000Z");
});

test("기간 안내는 보정 옵션과 관계없이 붙는다", () => {
  assert.deepEqual(periodNotes(Date.UTC(1987, 6, 1)), ["summer-time-period"]);
  assert.deepEqual(periodNotes(Date.UTC(1958, 0, 1)), ["non-kst-standard-period"]);
  assert.deepEqual(periodNotes(Date.UTC(2000, 0, 1)), []);
});

test("기본값(사장님 확정 2026-10-22): 서머타임·표준시 이력 켜짐, 진태양시 꺼짐, 자시 00:00", () => {
  assert.deepEqual(DEFAULT_CORRECTIONS, ALL_ON);
  assert.deepEqual(DEFAULT_CORRECTIONS, { ...ALL_OFF, summerTime: true, standardTimeHistory: true });
});
