import "server-only";
import { koreanLunarToSolar } from "@/lib/saju-engine/korean-lunar";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  CALENDARS,
  GENDERS,
  isOneOf,
  isUuid,
  parseBirthDate,
  parseBirthTime,
  parseText,
  type Calendar,
  type Gender,
} from "@/lib/validation";

// 저장된 사주 정보(saju_profiles). 쓰기는 service_role로만 하고, 조회는 사용자 세션 클라이언트(RLS)로 합니다.
// 이 파일의 함수는 서버 액션이 아닙니다. 호출하는 서버 액션이 먼저 auth.getUser()로 userId를 확인해야 합니다.
// 생년월일시는 민감한 정보이므로 로그에 남기지 않습니다(오류 코드만 기록).

export type SajuInput = {
  birth_date: string;
  calendar: Calendar;
  birth_time: string | null;
  time_unknown: boolean;
  gender: Gender;
  label: string | null;
};

export type SajuRow = SajuInput & { id: string; is_self: boolean };

const SAJU_COLUMNS = "id, is_self, label, birth_date, calendar, birth_time, time_unknown, gender";
const LABEL_MAX = 40;

type Parsed = { ok: true; value: SajuInput } | { ok: false; error: string; field: string };

export type BirthInput = Pick<SajuInput, "birth_date" | "calendar" | "birth_time" | "time_unknown">;
type ParsedBirth = { ok: true; value: BirthInput } | { ok: false; error: string; field: string };

// prefix: 한 폼에 사주 입력이 두 벌 있을 때(동업자) 입력 이름 앞에 붙는 말.
// maxFutureDays: 생년월일을 앞날까지 받을 일수(아기 이름의 출산 예정일 전용). 기본은 오늘까지.
export type SajuFormOptions = { prefix?: string; maxFutureDays?: number };

export const LUNAR_DATE_ERROR = "음력에 없는 날짜입니다. 다시 확인해 주세요.";

// 음력·윤달 입력이면 한국 음력(한국천문연구원 표, 사주 엔진과 같은 변환)에 실제로 있는 날짜인지 확인합니다.
// 있으면 null, 없으면(30일이 없는 달의 30일, 윤달이 없는 해의 윤달 등) 안내 문구.
export function lunarDateError(birthDate: string, calendar: Calendar): string | null {
  if (calendar === "solar") return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  return koreanLunarToSolar(year, month, day, calendar === "lunar_leap").ok ? null : LUNAR_DATE_ERROR;
}

// 생년월일, 양력·음력, 태어난 시각만 검증합니다(성별을 받지 않는 동업자 정보에도 씁니다).
export function readBirthForm(formData: FormData, options: SajuFormOptions = {}): ParsedBirth {
  const prefix = options.prefix ?? "";
  const birthDate = parseBirthDate(formData.get(`${prefix}birth`), options.maxFutureDays ?? 0);
  if (!birthDate) {
    return {
      ok: false,
      error: "생년월일을 다시 확인해 주세요. 예: 1972-03-15",
      field: `${prefix}birth`,
    };
  }

  const calendar = formData.get(`${prefix}calendar`);
  if (!isOneOf(calendar, CALENDARS)) {
    return { ok: false, error: "양력·음력을 선택해 주세요.", field: `${prefix}calendar` };
  }
  const lunarError = lunarDateError(birthDate, calendar);
  if (lunarError) {
    return { ok: false, error: lunarError, field: `${prefix}birth` };
  }

  // "태어난 시각을 몰라요"를 체크했으면 입력된 시각은 무시합니다.
  const unknownChecked = formData.get(`${prefix}timeUnknown`) === "on";
  const birthTime = unknownChecked ? null : parseBirthTime(formData.get(`${prefix}time`));
  if (birthTime === undefined) {
    return {
      ok: false,
      error: "태어난 시각을 다시 확인해 주세요. 예: 14:30",
      field: `${prefix}time`,
    };
  }

  return {
    ok: true,
    value: {
      birth_date: birthDate,
      calendar,
      birth_time: birthTime,
      // DB 규칙: (birth_time is null) = time_unknown. 시각을 비워 두면 서버가 true로 명시합니다.
      time_unknown: birthTime === null,
    },
  };
}

// 폼 입력을 검증해 저장 형태로 바꿉니다.
export function readSajuForm(formData: FormData, options: SajuFormOptions = {}): Parsed {
  const prefix = options.prefix ?? "";
  const birth = readBirthForm(formData, options);
  if (!birth.ok) return birth;

  const gender = formData.get(`${prefix}gender`);
  if (!isOneOf(gender, GENDERS)) {
    return { ok: false, error: "성별을 선택해 주세요.", field: `${prefix}gender` };
  }

  const label = parseText(formData.get(`${prefix}label`), LABEL_MAX);
  if (label === undefined) {
    return {
      ok: false,
      error: `이름표는 ${LABEL_MAX}자 이하로 입력해 주세요.`,
      field: `${prefix}label`,
    };
  }

  return { ok: true, value: { ...birth.value, gender, label } };
}

function toRow(data: Record<string, unknown>): SajuRow {
  return {
    id: String(data.id),
    is_self: Boolean(data.is_self),
    label: (data.label as string | null) ?? null,
    birth_date: String(data.birth_date),
    calendar: data.calendar as Calendar,
    // DB의 time은 HH:MM:SS로 오므로 HH:MM만 씁니다.
    birth_time: data.birth_time ? String(data.birth_time).slice(0, 5) : null,
    time_unknown: Boolean(data.time_unknown),
    gender: data.gender as Gender,
  };
}

// 본인 사주 조회. 사용자 세션 클라이언트로 읽으므로 RLS(본인 행만)가 한 번 더 걸립니다.
export async function getSelfSaju(userId: string): Promise<SajuRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saju_profiles")
    .select(SAJU_COLUMNS)
    .eq("user_id", userId)
    .eq("is_self", true)
    .maybeSingle();
  if (error) {
    console.error("getSelfSaju failed", error.code);
    return null;
  }
  return data ? toRow(data) : null;
}

export type SajuResult = { ok: true } | { ok: false; error: string };

// 본인 사주 저장. 이미 있으면 그 행을 고치고, 없으면 새로 만듭니다(사용자당 1개).
export async function saveSelfSaju(userId: string, input: SajuInput): Promise<SajuResult> {
  const admin = await createAdminClient();
  const values = {
    label: input.label,
    birth_date: input.birth_date,
    calendar: input.calendar,
    birth_time: input.birth_time,
    time_unknown: input.time_unknown,
    gender: input.gender,
  };

  const updated = await admin
    .from("saju_profiles")
    .update(values)
    .eq("user_id", userId)
    .eq("is_self", true)
    .select("id");
  if (updated.error) {
    console.error("saveSelfSaju update failed", updated.error.code);
    return { ok: false, error: "사주 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (updated.data.length > 0) return { ok: true };

  const inserted = await admin
    .from("saju_profiles")
    .insert({ ...values, user_id: userId, is_self: true });
  if (inserted.error) {
    // 23505: 동시에 두 번 저장해 본인 사주가 이미 생긴 경우
    if (inserted.error.code === "23505") {
      return { ok: false, error: "이미 저장된 내 사주가 있습니다. 화면을 새로 고친 뒤 수정해 주세요." };
    }
    console.error("saveSelfSaju insert failed", inserted.error.code);
    return { ok: false, error: "사주 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  return { ok: true };
}

// 사주 정보 삭제(실제 삭제). 본인 행만 지웁니다.
export async function deleteSaju(userId: string, sajuId: unknown): Promise<SajuResult> {
  if (!isUuid(sajuId)) {
    return { ok: false, error: "삭제할 사주 정보를 찾지 못했습니다." };
  }
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("saju_profiles")
    .delete()
    .eq("id", sajuId)
    .eq("user_id", userId)
    .select("id");
  if (error) {
    console.error("deleteSaju failed", error.code);
    return { ok: false, error: "사주 정보를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (data.length === 0) {
    return { ok: false, error: "삭제할 사주 정보를 찾지 못했습니다." };
  }
  return { ok: true };
}
