"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { hasRequiredConsents, readSignupConsents, recordSignupConsents } from "@/lib/consents";
import { requestOrderDeletion } from "@/lib/orders";
import { deleteSaju, readSajuForm, saveSelfSaju } from "@/lib/saju";
import type { LunarSuggestion } from "@/lib/validation";

// 내 신청 화면의 서버 액션. 모든 액션은 auth.getUser()로 확인한 사용자 id만 씁니다.
// 폼이 보낸 user_id 같은 값은 읽지 않습니다.

export type MyFormState = { error?: string; message?: string; field?: string; lunar?: LunarSuggestion };

const LOGIN_REQUIRED: MyFormState = { error: "로그인 후 이용해 주세요." };

// 약관 동의(가입 때 기록되지 않은 계정용). 필수 3개가 모두 있어야 기록합니다.
export async function agreeToTerms(_prev: MyFormState, formData: FormData): Promise<MyFormState> {
  const user = await getUser();
  if (!user) return LOGIN_REQUIRED;

  const consents = readSignupConsents(formData);
  if (!hasRequiredConsents(consents)) {
    return { error: "필수 약관에 모두 동의해 주세요." };
  }

  const result = await recordSignupConsents(user.id, consents);
  if (result === "failed") {
    return { error: "약관 동의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/my");
  return { message: "약관 동의를 저장했습니다." };
}

// 본인 사주 저장(없으면 새로 만들고, 있으면 고칩니다).
export async function saveMySaju(_prev: MyFormState, formData: FormData): Promise<MyFormState> {
  const user = await getUser();
  if (!user) return LOGIN_REQUIRED;

  const parsed = readSajuForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error, field: parsed.field, lunar: parsed.lunar };
  }
  // 본인 사주는 이름표를 따로 받지 않습니다. 양력으로 바꿔 넣은 원래 음력 입력은 저장하지 않습니다(saveSelfSaju가 정한 칸만 저장).
  const result = await saveSelfSaju(user.id, { ...parsed.value, label: "본인" });
  if (!result.ok) {
    return { error: result.error };
  }
  revalidatePath("/my");
  return { message: "내 사주 정보를 저장했습니다." };
}

// 사주 정보 삭제(실제 삭제). 본인 행만 지워집니다.
export async function deleteMySaju(_prev: MyFormState, formData: FormData): Promise<MyFormState> {
  const user = await getUser();
  if (!user) return LOGIN_REQUIRED;

  const result = await deleteSaju(user.id, formData.get("sajuId"));
  if (!result.ok) {
    return { error: result.error };
  }
  revalidatePath("/my");
  return { message: "내 사주 정보를 삭제했습니다." };
}

// 신청 삭제 요청. 결제 전 신청만 비우고, 결제 이후 신청은 안내 문구만 돌려줍니다.
export async function requestMyOrderDeletion(
  _prev: MyFormState,
  formData: FormData,
): Promise<MyFormState> {
  const result = await requestOrderDeletion(formData.get("orderId"));
  if (!result.ok) {
    return { error: result.message };
  }
  if (result.outcome === "kept") {
    return { message: result.message };
  }
  revalidatePath("/my");
  return { message: "신청을 취소하고 입력한 정보를 삭제했습니다." };
}
