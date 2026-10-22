import "server-only";
import { calcAnnualReport } from "../saju-engine/annual-report.ts";
import type { Pillars } from "../saju-engine/pillars.ts";
import type { Sipsung } from "../saju-engine/sipsung.ts";
import { readReportInput } from "./build.ts";
import { PHRASES_CONFIRMED, SEUN_PHRASES, type Phrase } from "./phrases/index.ts";

// 결제 전 미리보기(결정됨 2026-10-22: "사주표 + 총평 1문장"). 계산만 하고 저장하지 않는다.
// 화면 연결은 다음 단계. 문구가 확정되기 전에는 총평이 자리표시이므로 phrasesConfirmed로 알려 준다.

export type ReportPreview =
  | {
      ok: true;
      pillars: Pillars;
      dayGan: string;
      seun: { pillar: string; ganSipsung: Sipsung };
      summary: Phrase;
      phrasesConfirmed: boolean;
      timeUncertain: boolean;
      boundaryRisk: boolean;
    }
  | { ok: false; error: "invalid_input" | "calc_failed" };

export function previewReport(saju: unknown): ReportPreview {
  const input = readReportInput(saju);
  if (!input) return { ok: false, error: "invalid_input" };
  const calc = calcAnnualReport(input);
  if (!calc.ok) return { ok: false, error: "calc_failed" };
  const id = `세운-${calc.seun.ganSipsung}-1`;
  return {
    ok: true,
    pillars: calc.natal,
    dayGan: calc.dayGan,
    seun: { pillar: calc.seun.pillar, ganSipsung: calc.seun.ganSipsung },
    summary: { id, text: SEUN_PHRASES[id] },
    phrasesConfirmed: PHRASES_CONFIRMED,
    timeUncertain: calc.timeUncertain,
    boundaryRisk: calc.boundaryRisk,
  };
}
