import "server-only";
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

type Parsed = { ok: true; value: SajuInput } | { ok: false; error: string };

// 폼 입력을 검증해 저장 형태로 바꿉니다.
export function readSajuForm(formData: FormData): Parsed {
  const birthDate = parseBirthDate(formData.get("birth"));
  if (!birthDate) {
    return { ok: false, error: "생년월일을 다시 확인해 주세요. 예: 1972-03-15" };
  }

  const calendar = formData.get("calendar");
  if (!isOneOf(calendar, CALENDARS)) {
    return { ok: false, error: "양력·음력을 선택해 주세요." };
  }

  const gender = formData.get("gender");
  if (!isOneOf(gender, GENDERS)) {
    return { ok: false, error: "성별을 선택해 주세요." };
  }

  // "태어난 시각을 몰라요"를 체크했으면 입력된 시각은 무시합니다.
  const unknownChecked = formData.get("timeUnknown") === "on";
  const birthTime = unknownChecked ? null : parseBirthTime(formData.get("time"));
  if (birthTime === undefined) {
    return { ok: false, error: "태어난 시각을 다시 확인해 주세요. 예: 14:30" };
  }

  const label = parseText(formData.get("label"), LABEL_MAX);
  if (label === undefined) {
    return { ok: false, error: `이름표는 ${LABEL_MAX}자 이하로 입력해 주세요.` };
  }

  return {
    ok: true,
    value: {
      birth_date: birthDate,
      calendar,
      birth_time: birthTime,
      // DB 규칙: (birth_time is null) = time_unknown. 시각을 비워 두면 서버가 true로 명시합니다.
      time_unknown: birthTime === null,
      gender,
      label,
    },
  };
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
