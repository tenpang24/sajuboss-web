"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { getSelfSaju, lunarDateError, readSajuForm, type SajuInput } from "@/lib/saju";
import type { LunarSuggestion } from "@/lib/validation";

// 신년 리포트 사전신청. 저장·검증·금액 계산은 lib/orders.ts의 createOrder가 맡고,
// 여기서는 이 폼의 입력(풀이할 사주)만 검증해 payload를 만듭니다.

export type PreorderState = {
  error?: string;
  field?: string;
  needsConsent?: boolean;
  needsSaju?: boolean;
  lunar?: LunarSuggestion; // 음력 날짜를 양력으로 바꿔 넣으라는 안내
};

export async function submitReportPreorder(
  _prev: PreorderState,
  formData: FormData,
): Promise<PreorderState> {
  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/report/2027")}`);
  }

  // 풀이할 사주: 저장된 내 사주 또는 직접 입력
  const target = formData.get("target");
  let saju: SajuInput;
  if (target === "self") {
    const saved = await getSelfSaju(user.id);
    if (!saved) {
      return {
        error: "저장된 내 사주가 없습니다. 내 신청에서 먼저 저장하거나 '다른 사람 사주 입력'을 골라 주세요.",
        needsSaju: true,
      };
    }
    // 음력 날짜 검사가 생기기 전에 저장된 사주일 수 있어 다시 확인합니다.
    const lunarError = lunarDateError(saved.birth_date, saved.calendar);
    if (lunarError) {
      return { error: `저장된 내 사주: ${lunarError}`, needsSaju: true };
    }
    saju = {
      birth_date: saved.birth_date,
      calendar: saved.calendar,
      birth_time: saved.birth_time,
      time_unknown: saved.time_unknown,
      gender: saved.gender,
      label: saved.label,
    };
  } else if (target === "other") {
    const parsed = readSajuForm(formData);
    if (!parsed.ok) {
      return { error: parsed.error, field: parsed.field, lunar: parsed.lunar };
    }
    saju = parsed.value;
  } else {
    return { error: "풀이할 사주를 선택해 주세요." };
  }

  // 신청 시점의 사주 정보를 payload에 복사해 둡니다(나중에 저장된 사주를 고쳐도 신청 내용은 그대로).
  const result = await createOrder({
    product: "report_2027",
    payload: { target, saju },
    consentPrivacy: formData.get("consentPrivacy") === "on",
    consentDisclaimer: formData.get("consentDisclaimer") === "on",
  });

  if (!result.ok) {
    if (result.reason === "login") {
      redirect(`/login?next=${encodeURIComponent("/report/2027")}`);
    }
    return { error: result.message, needsConsent: result.reason === "signup_consent" };
  }

  // 완료 화면(/done/[orderId])은 6단계에서 만듭니다. 그 전까지는 내 신청으로 보냅니다.
  redirect("/my?notice=preorder-done");
}
