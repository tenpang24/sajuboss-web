import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 가입 약관 동의(profiles의 4개 시각).
// 이 파일의 함수는 서버 액션이 아닙니다. 호출하는 서버 액션이 먼저 auth.getUser()로 userId를 확인해야 합니다.

export type SignupConsentInput = {
  age: boolean; // [필수] 만 14세 이상
  terms: boolean; // [필수] 이용약관
  privacy: boolean; // [필수] 개인정보 수집·이용
  marketing: boolean; // [선택] 오픈·할인 소식 이메일
};

export function readSignupConsents(formData: FormData): SignupConsentInput {
  const on = (name: string) => formData.get(name) === "on";
  return {
    age: on("agreeAge"),
    terms: on("agreeTerms"),
    privacy: on("agreePrivacy"),
    marketing: on("agreeMarketing"),
  };
}

export function hasRequiredConsents(input: SignupConsentInput) {
  return input.age && input.terms && input.privacy;
}

// 동의 시각을 기록합니다. 서버 시각을 쓰고, 아직 기록이 없는 계정(terms_agreed_at is null)만 갱신합니다.
// 이미 기록된 계정은 건드리지 않으므로 여러 번 호출해도 처음 동의 시각이 유지됩니다.
// 반환: "recorded"(이번에 기록), "already"(이미 있음), "failed"
export async function recordSignupConsents(
  userId: string,
  input: SignupConsentInput,
): Promise<"recorded" | "already" | "failed"> {
  if (!hasRequiredConsents(input)) return "failed";

  const now = new Date().toISOString();
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      age_confirmed_at: now,
      terms_agreed_at: now,
      privacy_agreed_at: now,
      marketing_opt_in_at: input.marketing ? now : null,
    })
    .eq("id", userId)
    .is("terms_agreed_at", null)
    .select("id");

  if (error) {
    console.error("recordSignupConsents failed", error.code);
    return "failed";
  }
  if (data.length === 1) return "recorded";

  // 0행: 이미 기록됐거나 profiles 행이 없는 경우. 구분해서 돌려줍니다.
  return (await hasSignupConsents(userId)) ? "already" : "failed";
}

// 필수 동의 3개가 모두 기록돼 있는지. 오류가 나면 false(신청을 막는 쪽)로 처리합니다.
export async function hasSignupConsents(userId: string): Promise<boolean> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("age_confirmed_at, terms_agreed_at, privacy_agreed_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("hasSignupConsents failed", error.code);
    return false;
  }
  return Boolean(data.age_confirmed_at && data.terms_agreed_at && data.privacy_agreed_at);
}
