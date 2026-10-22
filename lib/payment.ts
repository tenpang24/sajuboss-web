import "server-only";
import { randomUUID } from "node:crypto";
import { getUser } from "@/lib/auth";
import { TBD } from "@/lib/brand";
import { PAYMENT_MODE, PAYMENT_PG_PROVIDER } from "@/lib/products";
import { generateAfterPayment } from "@/lib/report/generate";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation";

// 결제. PG(결제대행사)를 바꾸거나 붙일 때 고치는 곳은 이 파일의 provider 하나입니다.
//
// 지켜야 하는 규칙(6-B에서도 그대로):
// 1) 결제 성공 여부와 금액은 항상 서버가 PG 서버 API(또는 서명 검증된 웹훅)로 확인합니다.
//    클라이언트가 보낸 금액·성공 값은 읽지 않습니다.
// 2) 확인된 금액이 orders.amount_krw와 다르면 거부하고 payments에 failed로 기록만 남깁니다.
// 3) orders.status를 requested → paid로 바꾸는 곳은 DB 함수 confirm_order_payment 하나입니다.
//    PG 결제는 이 파일의 settlePayment가, 관리자의 수동 입금 확인은 lib/admin/orders.ts가 그 함수를 거칩니다.
//    payments 기록과 주문 상태 변경이 한 트랜잭션으로 처리되고, 이미 반영된 결제는 다시 반영하지 않습니다.
//    paid → refunded는 관리자 처리(lib/admin/orders.ts, DB 함수 refund_order_payment)에서만 합니다. 사용자 서버 액션이 status를 직접 바꾸지 않습니다.
// 4) 결제 키, 이메일, 신청 내용은 로그에 남기지 않습니다(오류 코드와 결과 종류만 기록).
// 5) 카드번호·계좌번호 같은 결제 수단 정보는 받지도 저장하지도 않습니다.

// ── 계좌이체 안내(수동 확인 모드) ──
// 계좌 정보는 코드에 쓰지 않고 서버 환경변수에서 읽습니다. 비어 있으면 "[확정 후 기재]"가 그대로 보입니다.
export type BankInfo = { bank: string; holder: string; account: string; complete: boolean };

export function getBankInfo(): BankInfo {
  const read = (value: string | undefined) => (value ?? "").trim();
  const bank = read(process.env.BANK_NAME);
  const holder = read(process.env.BANK_HOLDER);
  const account = read(process.env.BANK_ACCOUNT);
  return {
    bank: bank || TBD,
    holder: holder || TBD,
    account: account || TBD,
    complete: Boolean(bank && holder && account),
  };
}

// ── provider(결제대행사 연결부) ──
export type PayableOrder = { id: string; amountKrw: number };

// prepare: 결제창을 띄우는 데 필요한 값. 6-B에서 PG에 맞게 채웁니다.
// instant는 결제창 없이 바로 확인 단계로 가는 경우(모의 결제)에만 씁니다.
export type PrepareResult =
  | { ok: true; kind: "instant"; providerPaymentId: string }
  | { ok: true; kind: "window"; params: Record<string, string> }
  | { ok: false; reason: ProviderFailure };

// confirm: PG 서버에 물어 확인한 결과. amountKrw는 PG가 알려 준 실제 결제 금액입니다.
export type ProviderConfirmResult =
  | { ok: true; providerPaymentId: string; amountKrw: number }
  | { ok: false; reason: ProviderFailure };

export type ProviderFailure = "not_connected" | "refused" | "failed";

export type PaymentProvider = {
  name: string; // payments.provider_name에 저장되는 PG 이름
  prepare(order: PayableOrder): Promise<PrepareResult>;
  // amountKrw는 서버가 DB에서 읽은 주문 금액입니다(PG에 "이 금액이 맞는지" 확인을 요청하는 용도).
  confirm(input: {
    orderId: string;
    providerPaymentId: string;
    amountKrw: number;
  }): Promise<ProviderConfirmResult>;
  cancel(input: { providerPaymentId: string; reason: string }): Promise<{ ok: boolean }>;
  // 웹훅 본문의 서명을 검증하고, 검증된 결제 키만 돌려줍니다. 금액은 confirm으로 다시 확인합니다.
  verifyWebhook(request: Request): Promise<{ ok: true; providerPaymentId: string } | { ok: false }>;
};

// 아직 연결되지 않은 PG(6-A의 기본값). 모든 호출이 "연결되지 않음"으로 끝납니다.
const notConnectedProvider: PaymentProvider = {
  name: "none",
  prepare: async () => ({ ok: false, reason: "not_connected" }),
  confirm: async () => ({ ok: false, reason: "not_connected" }),
  cancel: async () => ({ ok: false }),
  verifyWebhook: async () => ({ ok: false }),
};

// 모의 결제(개발·테스트 전용).
// 운영 환경(NODE_ENV=production)에서는 어떤 경우에도 결제를 성공 처리하지 않습니다.
// prepare와 confirm 양쪽에서 막고, 스위치(PAYMENT_PG_PROVIDER)가 실수로 "mock"인 채 배포돼도 거부됩니다.
const mockRefused = () => process.env.NODE_ENV === "production";

export const mockProvider: PaymentProvider = {
  name: "mock",
  prepare: async () => {
    if (mockRefused()) return { ok: false, reason: "refused" };
    return { ok: true, kind: "instant", providerPaymentId: `mock_${randomUUID()}` };
  },
  confirm: async ({ providerPaymentId, amountKrw }) => {
    if (mockRefused()) return { ok: false, reason: "refused" };
    if (!providerPaymentId.startsWith("mock_")) return { ok: false, reason: "failed" };
    return { ok: true, providerPaymentId, amountKrw };
  },
  cancel: async () => ({ ok: !mockRefused() }),
  verifyWebhook: async () => ({ ok: false }),
};

export function getProvider(): PaymentProvider {
  return PAYMENT_PG_PROVIDER === "mock" ? mockProvider : notConnectedProvider;
}

// ── 결제 반영(주문 상태를 바꾸는 유일한 곳) ──
export type SettleOutcome =
  | "paid"
  | "already_paid"
  | "amount_mismatch"
  | "duplicate_payment"
  | "not_payable"
  | "not_found"
  | "invalid"
  | "error";

const SETTLE_OUTCOMES: readonly SettleOutcome[] = [
  "paid",
  "already_paid",
  "amount_mismatch",
  "duplicate_payment",
  "not_payable",
  "not_found",
  "invalid",
];

// verifiedAmountKrw는 서버가 확인한 금액만 넣습니다. DB 함수가 주문 금액과 비교하고,
// payments 기록과 orders.status 변경을 한 트랜잭션으로 처리합니다.
async function settlePayment(input: {
  orderId: string;
  provider: "manual" | "pg";
  providerName: string | null;
  providerPaymentId: string | null;
  verifiedAmountKrw: number;
}): Promise<SettleOutcome> {
  const admin = await createAdminClient();
  const { data, error } = await admin.rpc("confirm_order_payment", {
    p_order_id: input.orderId,
    p_provider: input.provider,
    p_provider_name: input.providerName,
    p_provider_payment_id: input.providerPaymentId,
    p_amount_krw: input.verifiedAmountKrw,
  });
  if (error) {
    console.error("settlePayment failed", error.code);
    return "error";
  }
  const outcome = SETTLE_OUTCOMES.find((item) => item === data) ?? "error";
  if (outcome !== "paid" && outcome !== "already_paid") {
    console.error("settlePayment rejected", outcome);
  }
  return outcome;
}

export type PaymentResult =
  | { ok: true; outcome: "paid" | "already_paid" | "deposit_requested" }
  | { ok: false; reason: "login" | "not_found" | "not_payable" | "not_connected" | "refused" | "failed"; message: string };

const failure = (
  reason: Exclude<PaymentResult, { ok: true }>["reason"],
  message: string,
): PaymentResult => ({ ok: false, reason, message });

const NOT_CONNECTED = "온라인 결제는 아직 연결되지 않았습니다. 준비되면 이 화면에서 결제할 수 있습니다.";
const NOT_PAYABLE = "지금은 결제할 수 없는 신청입니다. 내 신청에서 상태를 확인해 주세요.";
const FAILED = "결제를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";

// 본인 주문을 서버에서 다시 읽습니다. 금액은 여기서 읽은 DB 값만 씁니다.
async function loadOwnOrder(userId: string, orderId: string) {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("id, user_id, status, amount_krw, deleted_at")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("loadOwnOrder failed", error.code);
    return null;
  }
  return data && !data.deleted_at ? data : null;
}

function toResult(outcome: SettleOutcome): PaymentResult {
  if (outcome === "paid" || outcome === "already_paid") return { ok: true, outcome };
  if (outcome === "not_found") return failure("not_found", "신청 내역을 찾지 못했습니다.");
  if (outcome === "not_payable") return failure("not_payable", NOT_PAYABLE);
  if (outcome === "amount_mismatch") {
    return failure("failed", "결제 금액이 신청 금액과 달라 결제를 확인하지 못했습니다. 고객센터로 문의해 주세요.");
  }
  return failure("failed", FAILED);
}

// PG 결제 확인. 결제창에서 돌아온 뒤(6-B) 또는 모의 결제에서 호출합니다.
// 받는 값은 주문 id와 PG 결제 키뿐입니다. 금액과 성공 여부는 받지 않습니다.
export async function confirmPayment(orderId: unknown, providerPaymentId: unknown): Promise<PaymentResult> {
  const user = await getUser();
  if (!user) return failure("login", "로그인 후 이용해 주세요.");
  if (PAYMENT_MODE !== "pg") return failure("not_connected", NOT_CONNECTED);
  if (!isUuid(orderId) || typeof providerPaymentId !== "string" || providerPaymentId.length > 200) {
    return failure("not_found", "신청 내역을 찾지 못했습니다.");
  }

  const order = await loadOwnOrder(user.id, orderId);
  if (!order) return failure("not_found", "신청 내역을 찾지 못했습니다.");
  if (order.status === "paid") return { ok: true, outcome: "already_paid" };
  if (order.status !== "requested") return failure("not_payable", NOT_PAYABLE);

  const provider = getProvider();
  const confirmed = await provider.confirm({
    orderId: order.id,
    providerPaymentId,
    amountKrw: order.amount_krw,
  });
  if (!confirmed.ok) {
    if (confirmed.reason === "not_connected") return failure("not_connected", NOT_CONNECTED);
    if (confirmed.reason === "refused") {
      return failure("refused", "이 결제 방식은 사용할 수 없습니다.");
    }
    return failure("failed", FAILED);
  }

  const outcome = await settlePayment({
    orderId: order.id,
    provider: "pg",
    providerName: provider.name,
    providerPaymentId: confirmed.providerPaymentId,
    verifiedAmountKrw: confirmed.amountKrw, // PG가 알려 준 금액. DB 함수가 주문 금액과 비교합니다.
  });
  // 결제 확인 직후 신년 리포트 생성(다른 상품은 아무것도 하지 않음). 실패해도 결제 확인은 그대로 두고 paid로 남깁니다.
  if (outcome === "paid") await generateAfterPayment(order.id);
  return toResult(outcome);
}

// 결제 시작. pg 모드에서 결제 버튼을 눌렀을 때 호출합니다.
// 6-A에서는 PG가 연결되지 않아 "아직 연결되지 않음"으로 끝납니다(모의 결제는 개발 환경에서만 진행).
export async function startPayment(orderId: unknown): Promise<PaymentResult> {
  const user = await getUser();
  if (!user) return failure("login", "로그인 후 이용해 주세요.");
  if (PAYMENT_MODE !== "pg") return failure("not_connected", NOT_CONNECTED);
  if (!isUuid(orderId)) return failure("not_found", "신청 내역을 찾지 못했습니다.");

  const order = await loadOwnOrder(user.id, orderId);
  if (!order) return failure("not_found", "신청 내역을 찾지 못했습니다.");
  if (order.status === "paid") return { ok: true, outcome: "already_paid" };
  if (order.status !== "requested") return failure("not_payable", NOT_PAYABLE);

  const prepared = await getProvider().prepare({ id: order.id, amountKrw: order.amount_krw });
  if (!prepared.ok) {
    if (prepared.reason === "refused") return failure("refused", "이 결제 방식은 사용할 수 없습니다.");
    return failure("not_connected", NOT_CONNECTED);
  }
  if (prepared.kind === "window") {
    // 결제창을 띄우는 흐름은 6-B에서 만듭니다.
    return failure("not_connected", NOT_CONNECTED);
  }
  return confirmPayment(order.id, prepared.providerPaymentId);
}

// 입금 확인 요청(manual 모드). 사용자가 입금 안내를 보고 누릅니다.
// payments에 결제 대기(ready) 행을 하나 만들 뿐이고, 주문 상태는 바꾸지 않습니다.
export async function requestManualPayment(orderId: unknown): Promise<PaymentResult> {
  const user = await getUser();
  if (!user) return failure("login", "로그인 후 이용해 주세요.");
  if (PAYMENT_MODE !== "manual") return failure("not_connected", NOT_CONNECTED);
  if (!isUuid(orderId)) return failure("not_found", "신청 내역을 찾지 못했습니다.");

  const order = await loadOwnOrder(user.id, orderId);
  if (!order) return failure("not_found", "신청 내역을 찾지 못했습니다.");
  if (order.status === "paid") return { ok: true, outcome: "already_paid" };
  if (order.status !== "requested") return failure("not_payable", NOT_PAYABLE);

  const admin = await createAdminClient();
  const { error } = await admin.from("payments").insert({
    order_id: order.id,
    provider: "manual",
    amount_krw: order.amount_krw, // DB의 주문 금액
    status: "ready",
  });
  // 23505: 이미 대기 행이 있음(버튼을 다시 누른 경우). 그대로 성공으로 봅니다.
  if (error && error.code !== "23505") {
    console.error("requestManualPayment failed", error.code);
    return failure("failed", "입금 확인 요청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return { ok: true, outcome: "deposit_requested" };
}

// 입금 확인(관리자 전용)은 lib/admin/orders.ts의 adminConfirmPayment가 합니다.
// DB 함수 admin_confirm_manual_payment가 confirm_order_payment(manual)를 호출하고 처리 기록을 함께 남깁니다.

// 주문의 결제 진행 상태(화면 표시용). 주문이 본인 것인지 확인한 뒤에만 호출합니다.
// payments에는 사용자용 조회 권한이 없어 서버(service_role)로 읽습니다.
export type PaymentState = { waitingDeposit: boolean; paidAt: string | null };

export async function getPaymentState(orderId: string): Promise<PaymentState> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select("provider, status, paid_at")
    .eq("order_id", orderId)
    .in("status", ["ready", "paid"]);
  if (error) {
    console.error("getPaymentState failed", error.code);
    return { waitingDeposit: false, paidAt: null };
  }
  return {
    waitingDeposit: data.some((row) => row.provider === "manual" && row.status === "ready"),
    paidAt: data.find((row) => row.status === "paid")?.paid_at ?? null,
  };
}

// 결제 전 주문을 취소할 때(삭제 요청) 남아 있는 결제 대기 행을 취소로 바꿉니다.
export async function cancelPendingPayments(orderId: string): Promise<void> {
  const admin = await createAdminClient();
  const { error } = await admin
    .from("payments")
    .update({ status: "canceled" })
    .eq("order_id", orderId)
    .eq("status", "ready");
  if (error) console.error("cancelPendingPayments failed", error.code);
}
