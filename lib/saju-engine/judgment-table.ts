import "server-only";
import type { BranchRelation } from "./branch-relations.ts";
import type { Sipsung } from "./sipsung.ts";

// 신년 리포트 월별 판정표(데이터만). 판정은 이 표에서만 읽는다.
// 사장님 확정(2026-10-22, 설계서 7장). 점수에는 월 천간 십성과 월지·일지 관계만 쓴다.
// 월지·연지 관계, 월 지지 십성, 세운과 원국 관계는 결과에 담기만 한다.

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
  confirmed: true,
  monthGanSipsungScore: {
    정재: 2, 편재: 2, 식신: 2, 정관: 2,
    상관: 1, 정인: 1, 편인: 1, 비견: 1,
    겁재: 0, 편관: 0,
  },
  // 형(子卯) -1. 삼형 세 글자가 모두 맞는 경우는 두 지지로는 생기지 않아 항목 없음.
  monthDayBranchAdjust: { 합: 1, 충: -1, 형: -1, "형(부분)": 0, 자형: 0 },
  grades: [
    { grade: "길", min: 2 },
    { grade: "중", min: 1 },
  ],
  fallbackGrade: "흉", // 0 이하
};
