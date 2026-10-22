import "server-only";
import { redirect } from "next/navigation";
import { LIMITS, SAJU_SOURCES, type ApplyState, type SajuSource } from "@/lib/apply/options";
import { createOrder } from "@/lib/orders";
import type { Package, Product } from "@/lib/products";
import { getSelfSaju, lunarDateError, readBirthForm, readSajuForm, type SajuInput } from "@/lib/saju";
import {
  GENDER_UNKNOWN,
  isOneOf,
  parseLine,
  parseLongText,
  pickAllowed,
  type Gender,
} from "@/lib/validation";

// 신청 폼 3종의 서버 검증에서 함께 쓰는 도구.
// 폼별 검증 파일(date.ts, name-biz.ts, name-person.ts)은 formData에서 정해진 이름만 하나씩 읽어
// 검증한 값으로 payload를 새로 만듭니다. formData 전체나 모르는 키를 payload에 옮기지 않습니다.
// 입력값(업종, 이름, 생년월일 등)은 로그에 남기지 않습니다.

// 입력 오류. field는 틀린 입력의 name입니다.
export class InputError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

export type FormResult<T> = { ok: true; value: T } | { ok: false; error: string; field?: string };

// 폼별 검증 함수를 실행하고, 입력 오류는 화면에 보여 줄 형태로 바꿉니다.
export async function runForm<T>(read: () => T | Promise<T>): Promise<FormResult<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    if (error instanceof InputError) {
      return { ok: false, error: error.message, field: error.field };
    }
    throw error;
  }
}

// 한 줄 입력. 꼭 받아야 하는 항목은 required에 true를 줍니다.
export function line(formData: FormData, name: string, label: string, max: number): string | null;
export function line(
  formData: FormData,
  name: string,
  label: string,
  max: number,
  required: true,
): string;
export function line(
  formData: FormData,
  name: string,
  label: string,
  max: number,
  required = false,
): string | null {
  const value = parseLine(formData.get(name), max);
  if (value === undefined) {
    throw new InputError(`${label} 항목은 ${max}자 이하로 입력해 주세요.`, name);
  }
  if (value === null && required) {
    throw new InputError(`${label} 항목을 입력해 주세요.`, name);
  }
  return value;
}

// 여러 줄 입력(선택 항목)
export function longText(formData: FormData, name: string, label: string): string | null {
  const value = parseLongText(formData.get(name), LIMITS.long);
  if (value === undefined) {
    throw new InputError(`${label} 항목은 ${LIMITS.long}자 이하로 입력해 주세요.`, name);
  }
  return value;
}

// 하나만 고르는 항목. 허용값 목록에 없으면 거부합니다.
export function choice<T extends string>(
  formData: FormData,
  name: string,
  label: string,
  allowed: readonly T[],
): T {
  const value = formData.get(name);
  if (!isOneOf(value, allowed)) {
    throw new InputError(`${label} 항목을 선택해 주세요.`, name);
  }
  return value;
}

// 고르지 않아도 되는 항목. 값이 있는데 허용값이 아니면 거부합니다.
export function optionalChoice<T extends string>(
  formData: FormData,
  name: string,
  label: string,
  allowed: readonly T[],
): T | null {
  const value = formData.get(name);
  if (value === null || value === "") return null;
  if (!isOneOf(value, allowed)) {
    throw new InputError(`${label} 항목을 다시 선택해 주세요.`, name);
  }
  return value;
}

// 여러 개 고르는 항목. 허용값만 남깁니다.
export function choices<T extends string>(formData: FormData, name: string, allowed: readonly T[]): T[] {
  return pickAllowed(formData.getAll(name), allowed);
}

// payload에 넣는 사주 정보(이름표는 넣지 않습니다).
// 성별 unknown은 아기 이름 신청에서만 나옵니다(resolveSaju의 allowUnknownGender).
export type OrderSaju = Omit<SajuInput, "label" | "gender"> & {
  gender: Gender | typeof GENDER_UNKNOWN;
};

function toOrderSaju(saju: OrderSaju): OrderSaju {
  return {
    birth_date: saju.birth_date,
    calendar: saju.calendar,
    birth_time: saju.birth_time,
    time_unknown: saju.time_unknown,
    gender: saju.gender,
  };
}

// 대표자(또는 이름 받을 분) 사주. 저장된 내 사주를 고르면 DB에서 읽어 신청 시점 값을 복사하고,
// 직접 입력이면 lib/saju.ts의 readSajuForm 규칙으로 검증합니다.
export async function resolveSaju(
  formData: FormData,
  userId: string,
  options: { maxFutureDays?: number; allowSelf?: boolean; allowUnknownGender?: boolean } = {},
): Promise<{ source: SajuSource; saju: OrderSaju }> {
  const source = formData.get("sajuSource");
  if (!isOneOf(source, SAJU_SOURCES)) {
    throw new InputError("사주 정보를 넣는 방법을 선택해 주세요.", "sajuSource");
  }

  if (source === "self") {
    if (options.allowSelf === false) {
      throw new InputError("아기 이름은 이름 받을 분의 정보를 직접 입력해 주세요.", "sajuSource");
    }
    const saved = await getSelfSaju(userId);
    if (!saved) {
      throw new InputError("저장된 내 사주가 없습니다. '직접 입력'을 골라 주세요.", "sajuSource");
    }
    // 음력 날짜 검사가 생기기 전에 저장된 사주일 수 있어 다시 확인합니다.
    const lunarError = lunarDateError(saved.birth_date, saved.calendar);
    if (lunarError) {
      throw new InputError(`저장된 내 사주: ${lunarError}`, "sajuSource");
    }
    return { source, saju: toOrderSaju(saved) };
  }

  // 성별 "아직 몰라요"(unknown)는 allowUnknownGender를 준 폼(아기 이름)에서만 받습니다.
  // 그 밖의 폼에서 unknown이 오면 아래 readSajuForm이 허용값(female, male)이 아니라고 거부합니다.
  if (options.allowUnknownGender === true && formData.get("gender") === GENDER_UNKNOWN) {
    const birth = readBirthForm(formData, { maxFutureDays: options.maxFutureDays });
    if (!birth.ok) {
      throw new InputError(birth.error, birth.field);
    }
    return { source, saju: toOrderSaju({ ...birth.value, gender: GENDER_UNKNOWN }) };
  }

  const parsed = readSajuForm(formData, { maxFutureDays: options.maxFutureDays });
  if (!parsed.ok) {
    throw new InputError(parsed.error, parsed.field);
  }
  return { source, saju: toOrderSaju(parsed.value) };
}

// 검증을 마친 신청을 저장하고 내 신청으로 보냅니다. 금액·상태·동의 시각은 createOrder가 정합니다.
// 연락처와 동의 체크는 formData에서 정해진 이름만 읽습니다(금액, user_id 같은 값은 읽지 않습니다).
export async function submitOrder(
  path: string,
  formData: FormData,
  order: {
    product: Exclude<Product, "report_2027">;
    pkg?: Package | FormDataEntryValue | null;
    partner?: boolean;
    payload: Record<string, unknown>;
  },
): Promise<ApplyState> {
  const result = await createOrder({
    product: order.product,
    pkg: order.pkg,
    partner: order.partner,
    contactEmail: formData.get("email"),
    contactPhone: formData.get("phone"),
    payload: order.payload,
    consentPrivacy: formData.get("consentPrivacy") === "on",
    consentDisclaimer: formData.get("consentDisclaimer") === "on",
  });

  if (!result.ok) {
    if (result.reason === "login") {
      redirect(`/login?next=${encodeURIComponent(path)}`);
    }
    return {
      error: result.message,
      field: result.field,
      closed: result.reason === "closed",
      needsConsent: result.reason === "signup_consent",
    };
  }

  // 접수 후 결제 화면으로 보냅니다. 결제 모드가 off여도 화면에서 "결제 준비 중"을 안내합니다.
  redirect(`/pay/${result.orderId}`);
}
