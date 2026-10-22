// 8-B2: 신년 리포트 만들기(문장 선택), 문구 묶음, 운영 안전장치, 미리보기.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReport, phrasesBlocked, readReportInput, type ReportJson } from "../../lib/report/build.ts";
import { MONTHLY_PHRASES, PENDING, PHRASES_CONFIRMED, SEUN_PHRASES } from "../../lib/report/phrases/index.ts";
import { previewReport } from "../../lib/report/preview.ts";

const SIPSUNG = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"] as const;
const FIELDS = ["B", "S", "D"] as const;
const SAJU = { birth_date: "1975-03-20", calendar: "solar", birth_time: "09:00", time_unknown: false, gender: "female" };
const ORDER = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";

function build(orderId: string, saju: unknown = SAJU): ReportJson {
  const r = buildReport(orderId, saju);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.report;
}

const phraseIds = (report: ReportJson) => report.months.flatMap((m) => FIELDS.map((f) => m[f].id));

// 결정적인 가짜 주문 id(테스트용)
const fakeOrderId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("문구 묶음: 십성 10 × B·S·D × 3 = 90개 ID가 빠짐없이 있음", () => {
  const all: string[] = [];
  for (const s of SIPSUNG) {
    for (const f of FIELDS) {
      const ids = Object.keys(MONTHLY_PHRASES[s][f]);
      assert.deepEqual(ids, [1, 2, 3].map((i) => `${s}-${f}${i}`), `${s} ${f}`);
      all.push(...ids);
    }
  }
  assert.equal(Object.keys(MONTHLY_PHRASES).length, 10);
  assert.equal(new Set(all).size, 90);
  for (const s of SIPSUNG) assert.ok(`세운-${s}-1` in SEUN_PHRASES, s);
});

test("문구 확정 전: PHRASES_CONFIRMED = false, 문장은 모두 자리표시", () => {
  assert.equal(PHRASES_CONFIRMED, false);
  for (const s of SIPSUNG) for (const f of FIELDS) for (const text of Object.values(MONTHLY_PHRASES[s][f])) assert.equal(text, PENDING);
  assert.equal(PENDING, "[문구 확정 전]");
});

test("같은 주문 두 번 생성 → 문장 ID가 완전히 같음", () => {
  const a = build(ORDER);
  const b = build(ORDER);
  assert.deepEqual(phraseIds(a), phraseIds(b));
  assert.deepEqual(a, b);
});

test("한 리포트 안에서 같은 문장이 두 번 나오지 않음(주문 300개)", () => {
  for (let n = 0; n < 300; n++) {
    const ids = phraseIds(build(fakeOrderId(n)));
    assert.equal(ids.length, 36);
    assert.equal(new Set(ids).size, 36, fakeOrderId(n));
  }
});

test("달마다 그 달 천간 십성의 B·S·D 문장을 고름", () => {
  const report = build(ORDER);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.months.length, 12);
  report.months.forEach((m, i) => {
    const sipsung = report.calc.months[i].ganSipsung;
    assert.equal(m.index, i + 1);
    for (const f of FIELDS) {
      assert.ok(m[f].id.startsWith(`${sipsung}-${f}`), `${m.index} ${m[f].id}`);
      assert.equal(m[f].text, MONTHLY_PHRASES[sipsung][f][m[f].id]);
    }
  });
  assert.deepEqual(report.seunSummary, { id: "세운-식신-1", text: PENDING });
  assert.match(report.engineVersion, /8-B2/);
  assert.equal(report.phrasesConfirmed, false);
});

test("사업 기질·반기 제안·충합 보조 문장 ID(1975-03-20 09:00 예시)", () => {
  const report = build(ORDER);
  assert.deepEqual(report.dayGanPhrase, { id: "일간-乙-1", text: PENDING });
  // 상반기 중·중·흉·중·중·중 → 중, 하반기 길·길·길·흉·길·중 → 길
  assert.deepEqual(report.halves.first, { grade: "중", phrase: { id: "반기-상-중", text: PENDING } });
  assert.deepEqual(report.halves.second, { grade: "길", phrase: { id: "반기-하-길", text: PENDING } });
  // 6번째 달 丁未: 일지 丑과 충+형(부분) → 충 문장, 9번째 庚戌: 형(부분)만(문장 없음), 11번째 壬子: 합
  assert.equal(report.months[5].relation?.id, "관계-충-1");
  assert.equal(report.months[8].relation, undefined);
  assert.equal(report.months[10].relation?.id, "관계-합-1");
  assert.equal(report.months.filter((m) => m.relation).length, 2);
});

test("주문 id가 다르면 문장 선택이 달라질 수 있음(해시 분산)", () => {
  const seen = new Set(Array.from({ length: 20 }, (_, n) => phraseIds(build(fakeOrderId(n))).join(",")));
  assert.ok(seen.size > 1);
});

test("운영(production)에서 문구 확정 전이면 생성 거부", () => {
  assert.equal(phrasesBlocked("production"), true);
  assert.equal(phrasesBlocked("development"), false);
  assert.equal(phrasesBlocked("test"), false);
  const env = process.env as Record<string, string | undefined>;
  const saved = env.NODE_ENV;
  env.NODE_ENV = "production";
  try {
    assert.deepEqual(buildReport(ORDER, SAJU), { ok: false, error: "phrases_unconfirmed" });
  } finally {
    env.NODE_ENV = saved;
  }
  assert.ok(buildReport(ORDER, SAJU).ok);
});

test("신청 내용 형식이 틀리면 invalid_input, 없는 음력 날짜면 calc_failed", () => {
  assert.equal(readReportInput(null), null);
  assert.equal(readReportInput({ ...SAJU, calendar: "moon" }), null);
  assert.equal(readReportInput({ ...SAJU, birth_time: "9:00" }), null);
  assert.deepEqual(buildReport(ORDER, { ...SAJU, gender: "x" }), { ok: false, error: "invalid_input" });
  assert.deepEqual(buildReport(ORDER, { ...SAJU, birth_date: "2024-01-10", calendar: "lunar_leap" }), {
    ok: false,
    error: "calc_failed",
  });
  // 시각 모름, 아기 이름의 성별 unknown도 계산된다
  assert.ok(buildReport(ORDER, { ...SAJU, birth_time: null, time_unknown: true, gender: "unknown" }).ok);
});

test("미리보기: 사주표와 세운 총평 1문장만(달별 문장 없음, 저장 안 함)", () => {
  const p = previewReport(SAJU);
  assert.ok(p.ok);
  assert.deepEqual(p.pillars, { year: "乙卯", month: "己卯", day: "乙丑", hour: "辛巳" });
  assert.deepEqual(p.seun, { pillar: "丁未", ganSipsung: "식신" });
  assert.deepEqual(p.summary, { id: "세운-식신-1", text: PENDING });
  assert.equal(p.phrasesConfirmed, false);
  assert.equal("months" in p, false);
  assert.deepEqual(previewReport({ ...SAJU, calendar: "x" }), { ok: false, error: "invalid_input" });
});
