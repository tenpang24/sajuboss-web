import "server-only";
import type { BranchRelation } from "./branch-relations.ts";
import type { Sipsung } from "./sipsung.ts";

// 신년 리포트 월별 판정표(데이터만). 판정은 이 표에서만 읽는다.
// 사장님 확정 대기: 지금은 십성 모두 1점, 보정 모두 0점이라 모든 달이 "중"이다.

export type Grade = "길" | "중" | "흉";

export const JUDGMENT_TABLE: {
  confirmed: boolean;
  /** 월 천간 십성 → 점수 */
  monthGanSipsungScore: Record<Sipsung, number>;
  /** 월지와 원국 일지의 관계 → 보정 점수(관계마다 더함) */
  monthDayBranchAdjust: Record<BranchRelation, number>;
  /** 점수가 min 이상이면 그 등급(위에서부터). 어디에도 안 맞으면 fallback */
  grades: ReadonlyArray<{ grade: Grade; min: number }>;
  fallbackGrade: Grade;
} = {
  confirmed: false,
  monthGanSipsungScore: {
    비견: 1, 겁재: 1, 식신: 1, 상관: 1, 편재: 1,
    정재: 1, 편관: 1, 정관: 1, 편인: 1, 정인: 1,
  },
  monthDayBranchAdjust: { 충: 0, 합: 0, 형: 0, "형(부분)": 0, 자형: 0 },
  grades: [
    { grade: "길", min: 2 },
    { grade: "중", min: 1 },
  ],
  fallbackGrade: "흉", // 0 이하
};
