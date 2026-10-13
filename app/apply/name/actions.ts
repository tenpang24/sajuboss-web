"use server";

import { redirect } from "next/navigation";
import { readNameBizForm } from "@/lib/apply/name-biz";
import { APPLY_CLOSED_MESSAGE, type ApplyState } from "@/lib/apply/options";
import { submitOrder } from "@/lib/apply/shared";
import { getUser } from "@/lib/auth";
import { APPLY_FORMS_OPEN } from "@/lib/products";

const PATH = "/apply/name";

// 상호·브랜드 작명 신청. 입력 검증은 lib/apply/name-biz.ts, 저장·금액 계산은 createOrder가 맡습니다.
// 금액은 클라이언트에서 받지 않습니다. 패키지(basic/detail)만 넘기면 createOrder가 허용값을 확인하고 계산합니다.
export async function submitNameBizOrder(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  // 오픈 전에는 접수하지 않고 안내만 돌려줍니다.
  if (!APPLY_FORMS_OPEN) {
    return { error: APPLY_CLOSED_MESSAGE, closed: true };
  }

  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(PATH)}`);
  }

  const parsed = await readNameBizForm(formData, user.id);
  if (!parsed.ok) {
    return { error: parsed.error, field: parsed.field };
  }

  return submitOrder(PATH, formData, {
    product: "name_biz",
    pkg: formData.get("package"),
    payload: parsed.value.payload,
  });
}
