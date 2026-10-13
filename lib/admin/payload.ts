import {
  bizMoodNames,
  bizNameTypeNames,
  nameLengthNames,
  openTypeNames,
  personKindNames,
  personMoodNames,
  renameReasonNames,
  weekdayPrefNames,
} from "@/lib/apply/options";
import type { Product } from "@/lib/products";
import { GENDER_UNKNOWN, calendarNames, genderNames, genderUnknownName } from "@/lib/validation";

// 관리자 화면에서 신청 내용(payload)을 보여 주기 위한 변환.
// 결과는 이름표와 글자(문자열)뿐입니다. 화면은 이 글자를 텍스트로만 출력합니다
// (HTML로 넣지 않고, 값으로 링크·이미지를 만들지 않습니다).

export type PayloadRow = { label: string; value: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const EMPTY = "입력하지 않음";

// ── 같은 사주 판별 ──
// 비교 값은 생년월일, 양력·음력, 태어난 시각, 성별 네 가지입니다.
// 시각은 앞 5글자(HH:MM)로 맞추고, 시각 모름(null)끼리는 같은 것으로 봅니다.
// 이름표(label)와 time_unknown은 비교하지 않습니다. 값이 빠져 있으면 비교하지 않습니다(null).
export type SajuValues = {
  birth_date: unknown;
  calendar: unknown;
  birth_time: unknown;
  gender: unknown;
};

export function sajuKey(saju: SajuValues | null | undefined): string | null {
  if (!saju) return null;
  const { birth_date, calendar, birth_time, gender } = saju;
  if (typeof birth_date !== "string" || !birth_date) return null;
  if (typeof calendar !== "string" || !calendar) return null;
  if (typeof gender !== "string" || !gender) return null;
  const time = typeof birth_time === "string" && birth_time ? birth_time.slice(0, 5) : "";
  return [birth_date, calendar, time, gender].join("|");
}

function lookup(names: Record<string, string>, value: unknown): string {
  if (typeof value !== "string") return plain(value);
  return names[value] ?? value;
}

// 모르는 형태의 값은 원문 그대로 글자로 보여 줍니다.
function plain(value: unknown): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (typeof value === "number") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[표시할 수 없는 값]";
  }
}

export function describeSaju(value: unknown): string {
  if (!isRecord(value)) return plain(value);
  const parts: string[] = [];
  parts.push(typeof value.birth_date === "string" ? value.birth_date : "생년월일 없음");
  parts.push(lookup(calendarNames, value.calendar));
  parts.push(
    typeof value.birth_time === "string" && value.birth_time
      ? `${value.birth_time.slice(0, 5)} 출생`
      : "태어난 시각 모름",
  );
  if ("gender" in value) {
    parts.push(
      value.gender === GENDER_UNKNOWN ? `성별 ${genderUnknownName}` : lookup(genderNames, value.gender),
    );
  }
  if (typeof value.label === "string" && value.label) parts.push(`이름표: ${value.label}`);
  return parts.join(" · ");
}

const labels: Record<string, string> = {
  form: "신청 폼",
  target: "풀이 대상",
  kind: "이름 종류",
  open_type: "개업 유형",
  name_type: "작명 종류",
  business: "업종·상호",
  area: "지역",
  intro: "가게 소개",
  customers: "주 고객",
  saju_source: "사주 입력 방법",
  saju: "사주 정보",
  date_from: "희망 기간 시작",
  date_to: "희망 기간 끝",
  avoid: "피하고 싶은 날",
  weekday_pref: "선호 요일",
  partner: "동업자 추가",
  partner_saju: "동업자 사주",
  family_name: "성",
  current_name: "현재 이름",
  rename_reason: "개명 사유",
  parent_birth_date: "부모 생년월일",
  moods: "원하는 느낌",
  name_length: "이름 글자 수",
  include_chars: "넣고 싶은 글자",
  avoid_chars: "피하고 싶은 글자",
  candidates: "생각해 둔 후보",
  memo: "요청사항",
};

const targetNames: Record<string, string> = { self: "저장된 내 사주", other: "다른 사람 사주" };
const sourceNames: Record<string, string> = { self: "저장된 내 사주", input: "직접 입력" };
const formNames: Record<string, string> = {
  date: "개업택일",
  name_biz: "상호·브랜드 작명",
  name_person: "개인·개명 작명",
};

function describe(key: string, value: unknown, product: Product): string {
  if (key === "saju" || key === "partner_saju") {
    return value === null || value === undefined ? EMPTY : describeSaju(value);
  }
  if (key === "moods") {
    if (!Array.isArray(value)) return plain(value);
    if (value.length === 0) return EMPTY;
    const names: Record<string, string> = product === "name_person" ? personMoodNames : bizMoodNames;
    return value.map((item) => lookup(names, item)).join(", ");
  }
  if (key === "form") return lookup(formNames, value);
  if (key === "target") return lookup(targetNames, value);
  if (key === "saju_source") return lookup(sourceNames, value);
  if (key === "open_type") return lookup(openTypeNames, value);
  if (key === "weekday_pref") return lookup(weekdayPrefNames, value);
  if (key === "name_type") return lookup(bizNameTypeNames, value);
  if (key === "kind") return lookup(personKindNames, value);
  if (key === "rename_reason") return value === null ? EMPTY : lookup(renameReasonNames, value);
  if (key === "name_length") return lookup(nameLengthNames, value);
  return plain(value);
}

// 신청 내용을 이름표와 글자의 목록으로 바꿉니다. 모르는 키는 키 이름과 원문 글자로 보여 줍니다.
export function payloadRows(payload: unknown, product: Product): PayloadRow[] {
  if (!isRecord(payload)) {
    return [{ label: "신청 내용(원문)", value: plain(payload) }];
  }
  return Object.entries(payload).map(([key, value]) => ({
    label: labels[key] ?? `${key} (모르는 항목)`,
    value: describe(key, value, product),
  }));
}
