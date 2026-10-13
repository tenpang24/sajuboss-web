"use server";

import { redirect } from "next/navigation";
import { readDateForm } from "@/lib/apply/date";
import { APPLY_CLOSED_MESSAGE, type ApplyState } from "@/lib/apply/options";
import { submitOrder } from "@/lib/apply/shared";
import { getUser } from "@/lib/auth";
import { APPLY_FORMS_OPEN } from "@/lib/products";

const PATH = "/apply/date";

// 개업택일 신청. 입력 검증은 lib/apply/date.ts, 저장·금액 계산은 lib/orders.ts의 createOrder가 맡습니다.
// 금액은 클라이언트에서 받지 않습니다. 동업자 추가 여부(partner)만 넘기면 createOrder가 계산합니다.
export async function submitDateOrder(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  // 오픈 전에는 접수하지 않고 안내만 돌려줍니다.
  if (!APPLY_FORMS_OPEN) {
    return { error: APPLY_CLOSED_MESSAGE, closed: true };
  }

  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(PATH)}`);
  }

  const parsed = await readDateForm(formData, user.id);
  if (!parsed.ok) {
    return { error: parsed.error, field: parsed.field };
  }

  return submitOrder(PATH, formData, {
    product: "date",
    // 택일에는 패키지가 없습니다. 값이 오면 createOrder가 거부합니다.
    pkg: formData.get("package"),
    partner: parsed.value.partner,
    payload: parsed.value.payload,
  });
}
