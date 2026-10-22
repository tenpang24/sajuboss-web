import "server-only";

// 신년 리포트 문구 묶음. 리포트에는 문장과 함께 문장 ID와 PHRASE_VERSION을 저장한다.

/** 문장이 모두 확정되면 true로 바꾼다. false이면 운영(production)에서는 리포트를 만들지 않는다. */
export const PHRASES_CONFIRMED = false;

/** 문장을 바꿀 때마다 올린다(저장된 리포트의 phrase_version). */
export const PHRASE_VERSION = "phrases-2027 draft-1";

export { MONTHLY_PHRASES } from "./monthly.ts";
export { HALF_PHRASES, ILGAN_PHRASES, OHAENG_PHRASES, RELATION_PHRASES, SEUN_PHRASES } from "./extras.ts";
export { PENDING, PHRASE_FIELDS, type Phrase, type PhraseField } from "./types.ts";
