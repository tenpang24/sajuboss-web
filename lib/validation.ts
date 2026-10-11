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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// YYYY-MM-DD, 실제 달력 날짜, 1900년 이후, 오늘 이전
export function parseBirthDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real || year < 1900 || date.getTime() > Date.now()) return null;
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
