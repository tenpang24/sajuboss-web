"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { kakaoLoginEnabled } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error?: string; message?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const REQUIRED_CONSENTS = ["agreeAge", "agreeTerms", "agreePrivacy"];

// 영문·숫자 포함 8자 이상
function passwordError(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return `비밀번호는 영문과 숫자를 포함해 ${MIN_PASSWORD_LENGTH}자 이상으로 입력해 주세요.`;
  }
  return null;
}

function readEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  return EMAIL_PATTERN.test(email) ? email : null;
}

async function getOrigin() {
  return (await headers()).get("origin") ?? brand.url;
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "이메일 인증이 끝나지 않았습니다. 받은 메일의 링크를 눌러 주세요." };
    }
    return { error: "이메일 또는 비밀번호가 맞지 않습니다." };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  if (!email) {
    return { error: "이메일 주소를 확인해 주세요." };
  }
  const invalidPassword = passwordError(password);
  if (invalidPassword) {
    return { error: invalidPassword };
  }
  if (password !== passwordConfirm) {
    return { error: "비밀번호 확인이 일치하지 않습니다." };
  }

  // 필수 동의 3개를 서버에서도 확인합니다. 선택 동의(agreeMarketing)와 동의 시각은
  // 아직 저장하지 않습니다(4단계에서 주문 동의와 함께 설계).
  if (!REQUIRED_CONSENTS.every((name) => formData.get(name) === "on")) {
    return { error: "필수 약관에 모두 동의해 주세요." };
  }

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  // role 등 권한 값은 보내지 않습니다. profiles.role은 DB 트리거가 'user'로 정합니다.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await getOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    if (error.code === "weak_password") {
      return { error: "더 안전한 비밀번호를 입력해 주세요." };
    }
    return { error: "가입을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  if (data.session) {
    redirect(next);
  }
  // 이미 가입된 이메일이어도 같은 안내를 보여 가입 여부가 드러나지 않게 합니다.
  return { message: "인증 메일을 보냈습니다. 메일의 링크를 누르면 가입이 완료됩니다." };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readEmail(formData);
  if (!email) {
    return { error: "이메일 주소를 확인해 주세요." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/callback?next=${encodeURIComponent("/login/update-password")}`,
  });
  return { message: "가입된 이메일이라면 비밀번호 재설정 메일을 보냈습니다." };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const invalidPassword = passwordError(password);
  if (invalidPassword) {
    return { error: invalidPassword };
  }
  if (password !== passwordConfirm) {
    return { error: "비밀번호 확인이 일치하지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "링크가 만료되었습니다. 비밀번호 재설정을 다시 요청해 주세요." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") {
      return { error: "이전과 다른 비밀번호를 입력해 주세요." };
    }
    return { error: "비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  redirect("/my?notice=password-updated");
}

export async function signInWithKakao(formData: FormData) {
  if (!kakaoLoginEnabled) {
    redirect("/login");
  }

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: `${await getOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
