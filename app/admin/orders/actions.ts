"use server";

import { refresh } from "next/cache";
import {
  adminChangeStatus,
  adminConfirmPayment,
  adminRefund,
  adminSaveNote,
  type AdminActionResult,
} from "@/lib/admin/orders";

// 관리자 화면의 서버 액션. 관리자 확인은 lib/admin/orders.ts의 각 함수가 맨 앞에서 합니다
// (세션 클라이언트로 is_admin() 확인 → 통과한 뒤에만 service_role로 DB 함수 호출).
// 폼에서 읽는 값은 주문 id, 확인 체크, 상태 이름, 메모뿐입니다. 금액과 처리한 사람은 폼에서 받지 않습니다.

export type AdminFormState = { error?: string; message?: string };

// 관리자 화면은 저장해 두는 화면이 아니라 매번 새로 그리므로, 처리 뒤에는 보고 있는 화면만 새로 고칩니다.
// 화면이 새로 그려지면 버튼 옆의 안내 문구는 함께 사라집니다. 처리 결과는 새로 그려진 화면의
// 상태 표시와 처리 기록(메모는 "마지막 저장" 시각)으로 확인합니다.
function finish(result: AdminActionResult): AdminFormState {
  if (!result.ok) return { error: result.message };
  refresh();
  return { message: result.message };
}

// 수동 입금 확인
export async function confirmPaymentAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const orderId = formData.get("orderId");
  return finish(await adminConfirmPayment(orderId, formData.get("confirmed") === "on"));
}

// 환불 기록(전액)
export async function refundAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const orderId = formData.get("orderId");
  return finish(await adminRefund(orderId, formData.get("confirmed") === "on"));
}

// 상태 변경(진행, 한 칸 되돌리기, 결제 전 취소)
export async function changeStatusAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const orderId = formData.get("orderId");
  return finish(await adminChangeStatus(orderId, formData.get("from"), formData.get("to")));
}

// 내부 메모 저장
export async function saveNoteAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const orderId = formData.get("orderId");
  return finish(await adminSaveNote(orderId, formData.get("note")));
}
