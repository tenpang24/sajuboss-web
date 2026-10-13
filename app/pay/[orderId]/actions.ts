"use server";

import { redirect } from "next/navigation";
import { getBankInfo, requestManualPayment, startPayment } from "@/lib/payment";
import { PAYMENT_MODE } from "@/lib/products";
import { isUuid } from "@/lib/validation";

// 결제 화면의 서버 액션. 폼에서 읽는 값은 주문 id와 결제 동의 체크뿐입니다.
// 금액·상태·결제 성공 여부는 폼에서 받지 않습니다. 금액은 lib/payment.ts가 DB의 주문에서 읽고,
// 주문 상태는 결제가 서버에서 확인됐을 때 lib/payment.ts(settlePayment)만 바꿉니다.

export type PayState = { error?: string };

export async function submitPayment(_prev: PayState, formData: FormData): Promise<PayState> {
  const orderId = formData.get("orderId");
  if (!isUuid(orderId)) {
    return { error: "신청 내역을 찾지 못했습니다." };
  }

  // 결제 모드 off: 접수하지 않고 안내만 돌려줍니다(화면의 버튼도 비활성입니다).
  if (PAYMENT_MODE === "off") {
    return { error: "온라인 결제는 준비 중입니다. 신청은 접수된 상태이며 결제 방법은 따로 안내드립니다." };
  }

  if (formData.get("agreePay") !== "on") {
    return { error: "주문 내용과 환불 규정을 확인하고 동의해 주세요." };
  }

  // 계좌 정보가 등록되지 않았으면 입금 확인 요청을 받지 않습니다.
  if (PAYMENT_MODE === "manual" && !getBankInfo().complete) {
    return { error: "입금 계좌가 아직 등록되지 않았습니다. 등록된 뒤 다시 시도해 주세요." };
  }

  const result =
    PAYMENT_MODE === "manual" ? await requestManualPayment(orderId) : await startPayment(orderId);

  if (!result.ok) {
    if (result.reason === "login") {
      redirect(`/login?next=${encodeURIComponent(`/pay/${orderId}`)}`);
    }
    return { error: result.message };
  }
  redirect(`/done/${orderId}`);
}
