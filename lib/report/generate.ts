import "server-only";
import { buildReport, phrasesBlocked } from "@/lib/report/build";
import { createAdminClient } from "@/lib/supabase/admin";

// 신년 리포트 생성·저장. 저장과 주문 상태 변경(→ delivered), 처리 기록은 DB 함수 save_order_report가 한 번에 한다
// (supabase/migrations/20261022120000_order_reports.sql).
//
// 부르는 곳
//  - 결제 확인 직후 자동 생성(lib/payment.ts confirmPayment, lib/admin/orders.ts adminConfirmPayment): actorId = null
//  - 관리자 "리포트 만들기/다시 만들기"(lib/admin/orders.ts adminRegenerateReport): actorId = 관리자 id
// 이 함수는 권한을 확인하지 않는다. 부르는 쪽이 결제 확인 성공 또는 관리자 확인을 마친 뒤에 부른다.
// 신청 내용(사주), 리포트 내용은 로그에 남기지 않는다(결과 종류와 오류 코드만).

export type GenerateOutcome =
  | "saved"
  | "regenerated"
  | "already_exists"
  | "viewed_locked"
  | "not_payable"
  | "forbidden"
  | "not_found"
  | "invalid"
  | "phrases_unconfirmed"
  | "invalid_input"
  | "not_report"
  | "error";

const DB_OUTCOMES: readonly GenerateOutcome[] = [
  "saved",
  "regenerated",
  "already_exists",
  "viewed_locked",
  "not_payable",
  "forbidden",
  "not_found",
  "invalid",
];

export async function generateOrderReport(orderId: string, actorId: string | null): Promise<GenerateOutcome> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("id, product, saju:payload->saju")
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    console.error("generateOrderReport load failed", error.code);
    return "error";
  }
  const order = data as { id: string; product: string; saju: unknown } | null;
  if (!order) return "not_found";
  if (order.product !== "report_2027") return "not_report";
  if (phrasesBlocked()) {
    console.error("generateOrderReport refused", "phrases_unconfirmed");
    return "phrases_unconfirmed";
  }

  const built = buildReport(order.id, order.saju);
  if (!built.ok) {
    console.error("generateOrderReport build failed", built.error);
    return built.error === "phrases_unconfirmed" ? "phrases_unconfirmed" : "invalid_input";
  }

  const saved = await admin.rpc("save_order_report", {
    p_order_id: order.id,
    p_engine_version: built.report.engineVersion,
    p_phrase_version: built.report.phraseVersion,
    p_input: built.input,
    p_report: built.report,
    p_actor_id: actorId,
  });
  if (saved.error) {
    console.error("save_order_report failed", saved.error.code);
    return "error";
  }
  const outcome = DB_OUTCOMES.find((item) => item === saved.data) ?? "error";
  if (outcome !== "saved" && outcome !== "regenerated") {
    console.error("save_order_report rejected", outcome);
  }
  return outcome;
}

/** 결제 확인 직후 자동 생성. 신년 리포트 주문이 아니면 아무것도 하지 않는다(not_report). 실패해도 예외를 던지지 않는다
 * (결제 확인은 되돌리지 않고 주문은 paid로 남는다. 관리자 상세 화면의 "리포트 만들기"로 다시 시도). */
export async function generateAfterPayment(orderId: string): Promise<GenerateOutcome> {
  try {
    return await generateOrderReport(orderId, null);
  } catch (error) {
    console.error("generateAfterPayment threw", error instanceof Error ? error.name : "unknown");
    return "error";
  }
}
