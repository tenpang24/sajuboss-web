// 서버 액션에서 쓰는 입력 검증. 클라이언트 검증은 편의일 뿐이고, 저장 전에는 항상 여기서 다시 확인합니다.

export const CALENDARS = ["solar", "lunar", "lunar_leap"] as const;
export type Calendar = (typeof CALENDARS)[number];

export const GENDERS = ["female", "male"] as const;
export type Gender = (typeof GENDERS)[number];

export const calendarNames: Record<Calendar, string> = {
  solar: "양력",
  lunar: "음력",
  lunar_leap: "음력(윤달)",
};
export const genderNames: Record<Gender, string> = { female: "여성", male: "남성" };

// 음력 2월 29·30일처럼 양력 달력에 없는 음력 날짜를 넣었을 때, 양력으로 바꿔 넣도록 안내하는 값(서버 → 화면).
// 화면은 "양력으로 바꿔 넣기" 버튼을 보여 주고, 누르면 날짜·양력 선택을 바꾼 뒤 원래 입력을 숨은 칸(originalLunar)에 담습니다.
export type LunarCalendar = Exclude<Calendar, "solar">;
export type OriginalLunarInput = { calendar: LunarCalendar; date: string };
export type LunarSuggestion = {
  field: string; // 생년월일 입력의 name(동업자는 partner_birth)
  solarDate: string; // 바꿔 넣을 양력 날짜
  original: OriginalLunarInput;
};

// "음력 1960년 2월 30일", "음력(윤달) 2023년 2월 10일"
export function formatLunarInput(original: OriginalLunarInput): string {
  const [year, month, day] = original.date.split("-").map(Number);
  return `${calendarNames[original.calendar]} ${year}년 ${month}월 ${day}일`;
}

// 아기 이름 신청에서만 받는 성별 값(태어나기 전이라 모르는 경우).
// saju_profiles에는 저장하지 않고 신청 내용(orders.payload)에만 들어갑니다.
export const GENDER_UNKNOWN = "unknown";
export const genderUnknownName = "아직 몰라요";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// YYYY-MM-DD, 실제 달력 날짜, 1900년 이후, 오늘 이전.
// maxFutureDays를 주면 그 일수만큼 앞날도 받습니다(아기 이름의 출산 예정일 전용).
export function parseBirthDate(value: unknown, maxFutureDays = 0): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  const latest = Date.now() + maxFutureDays * 24 * 60 * 60 * 1000;
  if (!real || year < 1900 || date.getTime() > latest) return null;
  return match[0];
}

// HH:MM(24시간). 비어 있으면 null. 형식이 틀리면 undefined
export function parseBirthTime(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (text === "") return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : undefined;
}

export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

// 휴대폰 번호는 선택 입력. 비어 있으면 null, 형식이 틀리면 undefined. 숫자만 남겨 저장합니다.
export function parsePhone(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (text === "") return null;
  if (!/^[0-9\-\s]+$/.test(text)) return undefined;
  const digits = text.replace(/\D/g, "");
  return /^01\d{8,9}$/.test(digits) ? digits : undefined;
}

// 한 줄 텍스트. 앞뒤 공백 제거, 길이 제한. 비어 있으면 null, 너무 길면 undefined
export function parseText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (text === "") return null;
  return text.length <= maxLength ? text : undefined;
}

// 눈에 보이지 않는 제어문자(널, 방향 전환 문자, 폭 없는 공백 등)
const CONTROL_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2064\uFEFF]/g;

// 한 줄 입력(신청 폼용). 제어문자 제거, 줄바꿈·탭은 공백으로, 앞뒤 공백 제거, 길이 제한.
// 비어 있으면 null, 문자열이 아니거나 너무 길면 undefined
export function parseLine(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const text = value
    .replace(/[\t\r\n]+/g, " ")
    .replace(CONTROL_CHARS, "")
    .replace(/ {2,}/g, " ")
    .trim();
  if (text === "") return null;
  return text.length <= maxLength ? text : undefined;
}

// 여러 줄 입력(요청사항, 후보 이름). 줄바꿈은 남기고 그 밖의 제어문자는 지웁니다.
export function parseLongText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const text = value
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(CONTROL_CHARS, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text === "") return null;
  return text.length <= maxLength ? text : undefined;
}

// YYYY-MM-DD이고 실제 달력에 있는 날짜인지 확인합니다. 아니면 null
export function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? match[0] : null;
}

// 한국 시각 기준 오늘(YYYY-MM-DD)
export function todayInSeoul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

// YYYY-MM-DD에 달 수를 더합니다. 그 달에 같은 날이 없으면 말일로 맞춥니다(8월 31일 + 6개월 = 2월 말일).
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

// 여러 개 고르는 항목: 허용된 값만 남기고 중복을 없앱니다.
export function pickAllowed<T extends string>(values: unknown[], allowed: readonly T[]): T[] {
  return allowed.filter((item) => values.includes(item));
}
