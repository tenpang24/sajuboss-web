import "server-only";
import { createHash } from "node:crypto";
import { calcTodayIljin } from "../saju-engine/iljin.ts";
import { calcPillars, type SajuCalendar } from "../saju-engine/pillars.ts";
import { getRelationTypePrecise } from "../saju-engine/relation.ts";
import { TODAY_FIELDS, TODAY_PHRASES, type TodayField, type TodayRelation, type TodayTone } from "./phrases.ts";

// 오늘의 사업운. 내 일주와 오늘(한국 날짜)의 일진의 관계(생·극·합·충·비화)로 분야마다 문장 하나를 고른다.
// 문장 선택은 "KST 날짜 + 일주 + 분야"의 해시라 같은 날 같은 일주면 늘 같고, 날이 바뀌면 바뀐다(무작위 없음).
// 생년월일시는 저장하지도 로그에 남기지도 않는다.

export type TodayInput = { birth_date: string; calendar: SajuCalendar; birth_time: string | null };

export type TodayFieldResult = { field: TodayField; id: string; tone: TodayTone; text: string };

export type TodayResult = {
  ok: true;
  /** 한국 날짜(YYYY-MM-DD) */
  date: string;
  /** 오늘 일진 */
  iljin: string;
  /** 내 일주 */
  dayPillar: string;
  relation: TodayRelation;
  fields: TodayFieldResult[];
  /** 오늘의 한마디(사업운 문장) */
  oneLiner: string;
};

/** 화면에 넘기는 값(ok 표시 없이) */
export type TodayView = Omit<TodayResult, "ok">;

export function toTodayView(result: TodayResult): TodayView {
  return {
    date: result.date,
    iljin: result.iljin,
    dayPillar: result.dayPillar,
    relation: result.relation,
    fields: result.fields,
    oneLiner: result.oneLiner,
  };
}

export type TodayError = { ok: false; error: "invalid_date" | "invalid_time" | "out_of_range" | "no_such_lunar_date" };

function pick(field: TodayField, relation: TodayRelation, key: string): TodayFieldResult {
  const candidates = TODAY_PHRASES.filter((p) => p.field === field && p.relation === relation);
  const index = createHash("sha256").update(key).digest().readUInt32BE(0) % candidates.length;
  const phrase = candidates[index];
  return { field, id: phrase.id, tone: phrase.tone, text: phrase.text };
}

/** now를 넘기면 그 시점의 한국 날짜 기준(테스트용). 보정은 엔진 기본값(서머타임·표준시 이력 켜짐). */
export function calcToday(input: TodayInput, now: Date = new Date()): TodayResult | TodayError {
  const natal = calcPillars({ ...input, gender: "unknown" });
  if (!natal.ok) return natal;
  const dayPillar = natal.pillars.day;
  const today = calcTodayIljin(now);
  const relation = getRelationTypePrecise(dayPillar, today.pillar) as TodayRelation;
  const fields = TODAY_FIELDS.map((field) => pick(field, relation, `${today.date}|${dayPillar}|${field}`));
  return {
    ok: true,
    date: today.date,
    iljin: today.pillar,
    dayPillar,
    relation,
    fields,
    oneLiner: fields[0].text,
  };
}
