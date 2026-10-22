// 신청 폼 3종의 선택 항목과 길이 제한. 화면(선택 칩)과 서버 검증(허용값 목록)이 같은 값을 씁니다.
// 여기 없는 값은 서버가 받지 않습니다.

import type { LunarSuggestion } from "@/lib/validation";

// 폼 서버 액션이 돌려주는 상태. field는 틀린 입력의 name입니다(화면이 그 칸 아래에 오류를 보여 줍니다).
export type ApplyState = {
  error?: string;
  field?: string;
  closed?: boolean;
  needsConsent?: boolean; // 가입 약관 동의가 없는 계정
  lunar?: LunarSuggestion; // 음력 날짜를 양력으로 바꿔 넣으라는 안내
};

export const APPLY_CLOSED_MESSAGE =
  "신청 접수는 아직 준비 중입니다. 오픈하면 이 화면에서 신청할 수 있습니다.";

// 길이 상한(글자 수)
export const LIMITS = {
  line: 60, // 업종, 지역, 성씨, 이름 같은 짧은 한 줄
  sentence: 100, // 한 줄 소개, 주 고객, 피해야 할 날 같은 문장
  chars: 40, // 넣고 싶은 글자, 피하고 싶은 글자
  long: 500, // 요청사항, 후보 이름
} as const;

// 사주 정보를 넣는 방법: 저장된 내 사주 / 직접 입력
export const SAJU_SOURCES = ["self", "input"] as const;
export type SajuSource = (typeof SAJU_SOURCES)[number];

// ── 개업택일 ──
export const OPEN_TYPES = ["new", "move", "reopen"] as const;
export type OpenType = (typeof OPEN_TYPES)[number];
export const openTypeNames: Record<OpenType, string> = {
  new: "신규 개업",
  move: "이전·확장",
  reopen: "재개업·2호점",
};

export const WEEKDAY_PREFS = ["weekday", "weekend", "any"] as const;
export type WeekdayPref = (typeof WEEKDAY_PREFS)[number];
export const weekdayPrefNames: Record<WeekdayPref, string> = {
  weekday: "평일",
  weekend: "주말",
  any: "상관없음",
};

export const DATE_RANGE_MAX_MONTHS = 6; // 희망 개업 기간의 최대 길이
export const DATE_START_MAX_MONTHS = 24; // 가장 빠른 날짜는 오늘부터 이 기간 안

// ── 상호·브랜드 작명 ──
export const BIZ_NAME_TYPES = ["new", "brand", "rename"] as const;
export type BizNameType = (typeof BIZ_NAME_TYPES)[number];
export const bizNameTypeNames: Record<BizNameType, string> = {
  new: "새 가게 이름",
  brand: "브랜드·상품 이름",
  rename: "가게 이름 바꾸기",
};

export const BIZ_MOODS = [
  "friendly",
  "trusty",
  "refined",
  "traditional",
  "short",
  "hangul",
  "english",
] as const;
export type BizMood = (typeof BIZ_MOODS)[number];
export const bizMoodNames: Record<BizMood, string> = {
  friendly: "친근한",
  trusty: "믿음직한",
  refined: "세련된",
  traditional: "전통적인",
  short: "짧고 기억하기 쉬운",
  hangul: "한글 이름",
  english: "영문 병기",
};

// ── 개인·개명 작명 ──
export const PERSON_KINDS = ["baby", "adult", "rename"] as const;
export type PersonKind = (typeof PERSON_KINDS)[number];
export const personKindNames: Record<PersonKind, string> = {
  baby: "아기 이름",
  adult: "성인 이름",
  rename: "개명",
};
export const personKindProductNames: Record<PersonKind, string> = {
  baby: "아기 이름 작명",
  adult: "성인 이름 작명",
  rename: "개명 작명",
};

export const RENAME_REASONS = ["pronounce", "teasing", "saju", "other"] as const;
export type RenameReason = (typeof RENAME_REASONS)[number];
export const renameReasonNames: Record<RenameReason, string> = {
  pronounce: "발음·표기가 불편해서",
  teasing: "놀림 등 생활 불편",
  saju: "사주 보완",
  other: "기타",
};

export const PERSON_MOODS = ["easy", "solid", "warm", "bright", "smart", "hangul", "hanja"] as const;
export type PersonMood = (typeof PERSON_MOODS)[number];
export const personMoodNames: Record<PersonMood, string> = {
  easy: "부르기 쉬운",
  solid: "단단한",
  warm: "따뜻한",
  bright: "밝은",
  smart: "지적인",
  hangul: "순한글",
  hanja: "한자 병기",
};

export const NAME_LENGTHS = ["any", "one", "two"] as const;
export type NameLength = (typeof NAME_LENGTHS)[number];
export const nameLengthNames: Record<NameLength, string> = {
  any: "상관없음",
  one: "외자",
  two: "두 글자",
};

// 아기 이름은 태어나기 전에도 신청하므로, 출산 예정일을 오늘부터 이 일수까지 받습니다.
export const BABY_DUE_MAX_DAYS = 300;

// 상품 설명(신청 요약, 결제 화면, 완료 화면 공통)
export const packageDescriptions = {
  basic: "후보 5개를 오행·소리·뜻으로 평가하고 추천 1~2개를 제시합니다.",
  detail: "후보 10개와 역술가 검수 의견, 수정 1회 [범위 확정 후 기재]",
} as const;
export const packageSummaries = {
  basic: "후보 5개 + 추천 1~2개",
  detail: "후보 10개 + 검수 의견",
} as const;
export const dateSummary = "후보 날짜 3개 + 선정 이유";
