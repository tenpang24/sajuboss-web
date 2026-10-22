import "server-only";
import { branchRelations, type BranchRelation } from "./branch-relations.ts";
import { DEFAULT_CORRECTIONS, type CorrectionOptions } from "./corrections.ts";
import { JUDGMENT_TABLE, type Grade } from "./judgment-table.ts";
import {
  calcPillars,
  jieAround,
  yearMonthAt,
  type BoundaryRisk,
  type PillarsError,
  type PillarsResult,
  type SajuInput,
} from "./pillars.ts";
import { ganSipsung, zhiSipsung, type Sipsung } from "./sipsung.ts";

// 2027 신년 사업운 리포트 계산 데이터(8-B1). 화면·문구 없음.
// 세운·월주는 엔진(lunar-javascript 절입 시각)으로 구하고, 판정은 judgment-table.ts에서만 읽는다.
// 같은 입력이면 항상 같은 결과(현재 시각·무작위 사용 안 함).

export const REPORT_YEAR = 2027;

const KST_OFFSET_MS = 9 * 3600 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

function fmtKst(utcMs: number): string {
  const d = new Date(utcMs + KST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function labelKst(utcMs: number): string {
  const d = new Date(utcMs + KST_OFFSET_MS);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일경`;
}

export type NatalPosition = "year" | "month" | "day" | "hour";

export type AnnualMonth = {
  /** 1~12 (입춘 달이 1) */
  index: number;
  /** 시작 절기 이름(입춘, 경칩, …, 소한) */
  term: string;
  /** 시작 시각(KST, 이 시각부터) */
  startKst: string;
  /** 끝 시각(KST, 다음 절입 시각. 이 시각 전까지) */
  endKst: string;
  /** 화면용 시작 날짜(예: "2월 4일경") */
  startLabel: string;
  pillar: string;
  ganSipsung: Sipsung;
  zhiSipsung: Sipsung;
  /** 월지와 원국 일지의 관계 */
  withDayBranch: BranchRelation[];
  /** 월지와 원국 연지의 관계 */
  withYearBranch: BranchRelation[];
  score: number;
  grade: Grade;
};

export type AnnualReportResult = {
  ok: true;
  year: typeof REPORT_YEAR;
  natal: PillarsResult["pillars"];
  dayGan: string;
  seun: {
    pillar: string;
    ganSipsung: Sipsung;
    zhiSipsung: Sipsung;
    /** 세운 지지와 원국 지지의 관계. 시각을 모르면 시지는 없음 */
    relations: Array<{ position: NatalPosition; branch: string; relations: BranchRelation[] }>;
  };
  months: AnnualMonth[];
  /** 움직일 달("길" 등급만, 점수 높은 순, 동점이면 이른 달, 최대 3개. 없으면 빈 목록) */
  bestMonths: { indexes: number[]; provisional: boolean };
  /** 조심할 달("흉" 등급만, 점수 낮은 순, 동점이면 이른 달, 최대 3개. 없으면 빈 목록) */
  cautionMonths: { indexes: number[]; provisional: boolean };
  judgmentConfirmed: boolean;
  timeUncertain: boolean;
  boundaryRisk: boolean;
  boundaryRisks: BoundaryRisk[];
  corrections: PillarsResult["corrections"];
  engine: string;
};

/** 리포트 해 입춘부터 다음 해 입춘까지의 12절(끝 = 다음 해 입춘) */
function reportTerms(): { terms: Array<{ name: string; utcMs: number }>; endUtcMs: number } {
  const all = jieAround(Date.UTC(REPORT_YEAR, 6, 1));
  const ipchun = all.filter((t) => t.name === "입춘");
  const start = ipchun.find((t) => new Date(t.utcMs + KST_OFFSET_MS).getUTCFullYear() === REPORT_YEAR);
  const end = ipchun.find((t) => new Date(t.utcMs + KST_OFFSET_MS).getUTCFullYear() === REPORT_YEAR + 1);
  if (!start || !end) throw new Error("입춘을 찾지 못함");
  const terms = all.filter((t) => t.utcMs >= start.utcMs && t.utcMs < end.utcMs);
  if (terms.length !== 12) throw new Error(`12절이 아님: ${terms.length}`);
  return { terms, endUtcMs: end.utcMs };
}

function gradeFor(score: number): Grade {
  return JUDGMENT_TABLE.grades.find((g) => score >= g.min)?.grade ?? JUDGMENT_TABLE.fallbackGrade;
}

type PickableMonth = Pick<AnnualMonth, "index" | "score" | "grade">;

const byScoreThenEarly = (dir: 1 | -1) => (a: PickableMonth, b: PickableMonth) =>
  dir * (b.score - a.score) || a.index - b.index;

/** 움직일 달·조심할 달(결정됨 2026-10-22). 리포트 화면도 저장된 등급·점수로 이 함수를 다시 불러 고른다. */
export function pickMonths(months: PickableMonth[]): { best: number[]; caution: number[] } {
  const best = months.filter((m) => m.grade === "길").sort(byScoreThenEarly(1)).slice(0, 3);
  const caution = months.filter((m) => m.grade === "흉").sort(byScoreThenEarly(-1)).slice(0, 3);
  return { best: best.map((m) => m.index), caution: caution.map((m) => m.index) };
}

export function calcAnnualReport(
  input: SajuInput,
  options: CorrectionOptions = DEFAULT_CORRECTIONS,
): AnnualReportResult | PillarsError {
  const natal = calcPillars(input, options);
  if (!natal.ok) return natal;
  const { pillars, dayGan } = natal;
  const dayBranch = pillars.day[1];
  const yearBranch = pillars.year[1];

  const { terms, endUtcMs } = reportTerms();

  // 세운: 입춘 직후 시각의 년주
  const seunPillar = yearMonthAt(terms[0].utcMs + 1000).year;
  const natalBranches: Array<{ position: NatalPosition; branch: string }> = [
    { position: "year", branch: pillars.year[1] },
    { position: "month", branch: pillars.month[1] },
    { position: "day", branch: pillars.day[1] },
    ...(pillars.hour ? [{ position: "hour" as const, branch: pillars.hour[1] }] : []),
  ];

  const months: AnnualMonth[] = terms.map((term, i) => {
    const endMs = i + 1 < terms.length ? terms[i + 1].utcMs : endUtcMs;
    const pillar = yearMonthAt(term.utcMs + 1000).month;
    const gs = ganSipsung(dayGan, pillar[0]);
    const withDayBranch = branchRelations(pillar[1], dayBranch);
    const score =
      JUDGMENT_TABLE.monthGanSipsungScore[gs] +
      withDayBranch.reduce((sum, r) => sum + JUDGMENT_TABLE.monthDayBranchAdjust[r], 0);
    return {
      index: i + 1,
      term: term.name,
      startKst: fmtKst(term.utcMs),
      endKst: fmtKst(endMs),
      startLabel: labelKst(term.utcMs),
      pillar,
      ganSipsung: gs,
      zhiSipsung: zhiSipsung(dayGan, pillar[1]),
      withDayBranch,
      withYearBranch: branchRelations(pillar[1], yearBranch),
      score,
      grade: gradeFor(score),
    };
  });

  const picked = pickMonths(months);
  const provisional = !JUDGMENT_TABLE.confirmed;

  return {
    ok: true,
    year: REPORT_YEAR,
    natal: pillars,
    dayGan,
    seun: {
      pillar: seunPillar,
      ganSipsung: ganSipsung(dayGan, seunPillar[0]),
      zhiSipsung: zhiSipsung(dayGan, seunPillar[1]),
      relations: natalBranches.map((n) => ({ ...n, relations: branchRelations(seunPillar[1], n.branch) })),
    },
    months,
    bestMonths: { indexes: picked.best, provisional },
    cautionMonths: { indexes: picked.caution, provisional },
    judgmentConfirmed: JUDGMENT_TABLE.confirmed,
    timeUncertain: natal.timeUncertain,
    boundaryRisk: natal.boundaryRisk,
    boundaryRisks: natal.boundaryRisks,
    corrections: natal.corrections,
    engine: natal.engine,
  };
}
