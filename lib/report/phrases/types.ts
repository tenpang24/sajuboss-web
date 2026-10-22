import "server-only";

// 문구 묶음 공통 타입과 자리표시

/** 문장이 확정되기 전 자리표시. 화면에 그대로 나가지 않게 PHRASES_CONFIRMED(index.ts)로 막는다. */
export const PENDING = "[문구 확정 전]";

/** B 사업운, S 매출운, D 거래운 */
export const PHRASE_FIELDS = ["B", "S", "D"] as const;
export type PhraseField = (typeof PHRASE_FIELDS)[number];

export type Phrase = { id: string; text: string };
