import "server-only";
import { createHash } from "node:crypto";
import { calcAnnualReport, type AnnualReportResult } from "../saju-engine/annual-report.ts";
import { ENGINE_VERSION, type SajuInput } from "../saju-engine/pillars.ts";
import type { Grade } from "../saju-engine/judgment-table.ts";
import {
  HALF_PHRASES,
  ILGAN_PHRASES,
  MONTHLY_PHRASES,
  PHRASE_FIELDS,
  PHRASE_VERSION,
  PHRASES_CONFIRMED,
  RELATION_PHRASES,
  SEUN_PHRASES,
  type Phrase,
  type PhraseField,
} from "./phrases/index.ts";

// 신년 리포트 내용 만들기(DB 없음). 저장은 generate.ts가 한다.
// 같은 주문이면 항상 같은 리포트가 나온다(문장 선택은 주문 id 해시, 현재 시각·무작위 사용 안 함).
// 생년월일시는 로그에 남기지 않는다.

export const REPORT_SCHEMA_VERSION = 1;

/** 신청 내용(payload.saju) 중 계산에 쓰는 값. input_snapshot으로 저장한다. */
export type ReportInput = SajuInput;

export type ReportMonthPhrases = { index: number } & Record<PhraseField, Phrase> & {
  /** 충·합 보조: 그 달 월지와 일지의 관계(합·충·형) 문장. 관계가 없으면 없음 */
  relation?: Phrase;
};

export type ReportHalf = { grade: Grade; phrase: Phrase };

export type ReportJson = {
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
  engineVersion: string;
  phraseVersion: string;
  phrasesConfirmed: boolean;
  calc: AnnualReportResult;
  /** 세운 총평 1문장 */
  seunSummary: Phrase;
  /** 나의 사업 기질(일간) */
  dayGanPhrase: Phrase;
  /** 상반기(1~6번째 달)·하반기(7~12번째 달) 제안. 그 반기에 가장 많은 등급(같으면 중) */
  halves: { first: ReportHalf; second: ReportHalf };
  /** 달마다 그 달 천간 십성의 사업운(B)·매출운(S)·거래운(D) 문장 */
  months: ReportMonthPhrases[];
};

export type BuildResult =
  | { ok: true; input: ReportInput; report: ReportJson }
  | { ok: false; error: "phrases_unconfirmed" | "invalid_input" | "calc_failed" };

/** 문구가 확정되기 전에는 운영(production)에서 리포트를 만들지 않는다(모의 결제와 같은 방식). */
export function phrasesBlocked(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv === "production" && !PHRASES_CONFIRMED;
}

const CALENDARS = ["solar", "lunar", "lunar_leap"];
const GENDERS = ["female", "male", "unknown"];

/** payload.saju를 계산 입력으로 바꾼다. 형식이 맞지 않으면 null */
export function readReportInput(saju: unknown): ReportInput | null {
  if (typeof saju !== "object" || saju === null || Array.isArray(saju)) return null;
  const s = saju as Record<string, unknown>;
  if (typeof s.birth_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.birth_date)) return null;
  if (typeof s.calendar !== "string" || !CALENDARS.includes(s.calendar)) return null;
  if (s.birth_time !== null && (typeof s.birth_time !== "string" || !/^\d{2}:\d{2}$/.test(s.birth_time))) {
    return null;
  }
  if (typeof s.gender !== "string" || !GENDERS.includes(s.gender)) return null;
  return {
    birth_date: s.birth_date,
    calendar: s.calendar as ReportInput["calendar"],
    birth_time: s.birth_time,
    gender: s.gender as ReportInput["gender"],
  };
}

const GRADES: readonly Grade[] = ["길", "중", "흉"];

/** 가장 많은 등급. 가장 많은 등급이 둘 이상이면 "중" */
function majorityGrade(grades: Grade[]): Grade {
  const counts = GRADES.map((grade) => grades.filter((g) => g === grade).length);
  const max = Math.max(...counts);
  const top = GRADES.filter((_, i) => counts[i] === max);
  return top.length === 1 ? top[0] : "중";
}

function halfOf(half: "상" | "하", grades: Grade[]): ReportHalf {
  const grade = majorityGrade(grades);
  const id = `반기-${half}-${grade}`;
  return { grade, phrase: { id, text: HALF_PHRASES[id] } };
}

function hashIndex(key: string, size: number): number {
  return createHash("sha256").update(key).digest().readUInt32BE(0) % size;
}

/** 후보 중 "주문 id + 달 번호 + 분야" 해시로 시작 위치를 정하고, 이미 쓴 문장이면 다음 후보로 넘어간다. */
function pickPhrase(candidates: Record<string, string>, key: string, used: Set<string>): Phrase {
  const ids = Object.keys(candidates);
  const start = hashIndex(key, ids.length);
  for (let step = 0; step < ids.length; step++) {
    const id = ids[(start + step) % ids.length];
    if (!used.has(id)) {
      used.add(id);
      return { id, text: candidates[id] };
    }
  }
  throw new Error(`문장 후보가 모자람: ${key}`);
}

export function buildReport(orderId: string, saju: unknown): BuildResult {
  if (phrasesBlocked()) return { ok: false, error: "phrases_unconfirmed" };
  const input = readReportInput(saju);
  if (!input) return { ok: false, error: "invalid_input" };
  const calc = calcAnnualReport(input);
  if (!calc.ok) return { ok: false, error: "calc_failed" };

  const used = new Set<string>();
  const months = calc.months.map((month) => {
    const phrases = Object.fromEntries(
      PHRASE_FIELDS.map((field) => [
        field,
        pickPhrase(MONTHLY_PHRASES[month.ganSipsung][field], `${orderId}|${month.index}|${field}`, used),
      ]),
    ) as Record<PhraseField, Phrase>;
    // 충·합 보조: 월지·일지 관계 중 문구가 있는 첫 관계(충 → 합 → 형 순서). 같은 관계의 달마다 같은 문장이다.
    const relationId = month.withDayBranch.map((r) => `관계-${r}-1`).find((id) => id in RELATION_PHRASES);
    return {
      index: month.index,
      ...phrases,
      ...(relationId ? { relation: { id: relationId, text: RELATION_PHRASES[relationId] } } : {}),
    };
  });
  const grades = calc.months.map((month) => month.grade);
  const dayGanId = `일간-${calc.dayGan}-1`;

  const seunId = `세운-${calc.seun.ganSipsung}-1`;
  return {
    ok: true,
    input,
    report: {
      schemaVersion: REPORT_SCHEMA_VERSION,
      engineVersion: ENGINE_VERSION,
      phraseVersion: PHRASE_VERSION,
      phrasesConfirmed: PHRASES_CONFIRMED,
      calc,
      seunSummary: { id: seunId, text: SEUN_PHRASES[seunId] },
      dayGanPhrase: { id: dayGanId, text: ILGAN_PHRASES[dayGanId] },
      halves: { first: halfOf("상", grades.slice(0, 6)), second: halfOf("하", grades.slice(6)) },
      months,
    },
  };
}
