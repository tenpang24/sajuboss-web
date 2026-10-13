import "server-only";
import { APPLY_CLOSED_MESSAGE } from "@/lib/apply/options";
import { getUser } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { hasSignupConsents } from "@/lib/consents";
import { orderAmount } from "@/lib/pricing";
import {
  APPLY_FORMS_OPEN,
  DELETABLE_STATUSES,
  PACKAGE_REQUIRED,
  PACKAGES,
  PRODUCTS,
  REPORT_2027_IS_PREORDER,
  type OrderStatus,
  type Package,
  type Product,
} from "@/lib/products";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOneOf, isUuid, parseEmail, parsePhone } from "@/lib/validation";

// 신청(주문) 저장과 삭제 요청. 모든 신청 서버 액션이 이 파일의 함수를 거칩니다.
// - user_id는 auth.getUser()가 돌려준 값만 씁니다. 클라이언트가 보낸 user_id는 받지 않습니다.
// - 금액은 lib/pricing.ts로 서버에서 계산합니다. 클라이언트가 보낸 금액은 받지 않습니다.
// - 쓰기는 service_role로만 합니다.
// - 이메일·전화·payload는 로그에 남기지 않습니다(오류 코드만 기록).

const PAYLOAD_MAX_BYTES = 8 * 1024; // payload 크기 상한(JSON 기준)
const COOLDOWN_SECONDS = 20; // 같은 사용자의 연속 제출 간격
const HOURLY_LIMIT = 10; // 같은 사용자의 1시간 신청 수

export type NewOrderInput = {
  product: unknown;
  pkg?: unknown;
  partner?: boolean; // 개업택일 동업자 추가
  contactEmail?: unknown; // 비우면 계정 이메일을 씁니다.
  contactPhone?: unknown;
  payload: Record<string, unknown>; // 폼별 서버 액션이 검증을 마친 값만 넣습니다.
  consentPrivacy: boolean;
  consentDisclaimer: boolean;
};

export type OrderResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      reason: "login" | "signup_consent" | "invalid" | "rate" | "closed" | "error";
      message: string;
      field?: "email" | "phone"; // 어느 입력이 틀렸는지(화면이 그 칸으로 안내할 때 씁니다)
    };

const fail = (
  reason: Exclude<OrderResult, { ok: true }>["reason"],
  message: string,
  field?: "email" | "phone",
): OrderResult => ({ ok: false, reason, message, field });
export async function createOrder(input: NewOrderInput): Promise<OrderResult> {
  // 1) 로그인한 사용자만. id는 서버가 세션에서 확인한 값입니다.
  const user = await getUser();
  if (!user) {
    return fail("login", "로그인 후 신청할 수 있습니다.");
  }

  // 2) 상품·패키지 허용값과 규칙
  if (!isOneOf(input.product, PRODUCTS)) {
    return fail("invalid", "신청할 상품을 다시 선택해 주세요.");
  }
  const product: Product = input.product;
  // 신청 폼 3종은 오픈 스위치가 켜져 있을 때만 접수합니다(폼 서버 액션에서도 먼저 막습니다).
  if (product !== "report_2027" && !APPLY_FORMS_OPEN) {
    return fail("closed", APPLY_CLOSED_MESSAGE);
  }
  let pkg: Package | null = null;
  if (PACKAGE_REQUIRED[product]) {
    if (!isOneOf(input.pkg, PACKAGES)) {
      return fail("invalid", "패키지를 선택해 주세요.");
    }
    pkg = input.pkg;
  } else if (input.pkg !== undefined && input.pkg !== null && input.pkg !== "") {
    return fail("invalid", "이 상품에는 패키지가 없습니다.");
  }

  // 3) 신청 동의 2개(개인정보 수집·이용, 참고용 자료 확인)
  if (input.consentPrivacy !== true || input.consentDisclaimer !== true) {
    return fail("invalid", "필수 동의 항목을 모두 확인해 주세요.");
  }

  // 4) 연락처
  const contactEmail =
    input.contactEmail === undefined || input.contactEmail === null || input.contactEmail === ""
      ? parseEmail(user.email)
      : parseEmail(input.contactEmail);
  if (!contactEmail) {
    return fail("invalid", "결과를 받을 이메일 주소를 확인해 주세요.", "email");
  }
  const contactPhone = parsePhone(input.contactPhone);
  if (contactPhone === undefined) {
    return fail("invalid", "휴대폰 번호를 다시 확인해 주세요. 예: 010-0000-0000", "phone");
  }

  // 5) payload 크기 상한
  let payloadJson: string;
  try {
    payloadJson = JSON.stringify(input.payload);
  } catch {
    return fail("invalid", "입력 내용을 다시 확인해 주세요.");
  }
  if (new TextEncoder().encode(payloadJson).length > PAYLOAD_MAX_BYTES) {
    return fail("invalid", "입력 내용이 너무 깁니다. 줄여서 다시 신청해 주세요.");
  }

  // 6) 가입 약관 동의(필수 3개)가 없는 계정은 신청할 수 없습니다.
  if (!(await hasSignupConsents(user.id))) {
    return fail("signup_consent", "약관 동의가 필요합니다. 내 신청에서 약관에 동의한 뒤 다시 신청해 주세요.");
  }

  // 7) 같은 사용자의 연속 제출 제한
  const admin = await createAdminClient();
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await admin
    .from("orders")
    .select("created_at")
    .eq("user_id", user.id)
    .gte("created_at", sinceHour)
    .order("created_at", { ascending: false })
    .limit(HOURLY_LIMIT);
  if (recent.error) {
    console.error("createOrder rate check failed", recent.error.code);
    return fail("error", "신청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  const latest = recent.data[0]?.created_at;
  if (latest && Date.now() - new Date(latest).getTime() < COOLDOWN_SECONDS * 1000) {
    return fail("rate", "방금 신청이 접수됐습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (recent.data.length >= HOURLY_LIMIT) {
    return fail("rate", "신청이 너무 많습니다. 한 시간 뒤에 다시 시도해 주세요.");
  }

  // 8) 저장. 금액·상태·동의 시각은 모두 서버가 정합니다.
  const status: OrderStatus =
    product === "report_2027" && REPORT_2027_IS_PREORDER ? "preorder" : "requested";
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      product,
      package: pkg,
      status,
      amount_krw: orderAmount(product, pkg, { partner: input.partner === true }),
      contact_email: contactEmail,
      contact_phone: contactPhone,
      consent_privacy_at: now,
      consent_disclaimer_at: now,
      payload: JSON.parse(payloadJson),
    })
    .select("id")
    .single();

  if (error) {
    console.error("createOrder insert failed", error.code);
    return fail("error", "신청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return { ok: true, orderId: data.id };
}

export type DeletionResult =
  | { ok: true; outcome: "deleted" }
  | { ok: true; outcome: "kept"; message: string } // 결제 이후 주문: 비우지 않고 안내만
  | { ok: false; message: string };

// 삭제 요청. 결제 전(preorder, requested) 주문만 canceled로 바꾸고 입력 정보를 비웁니다.
// 결제 이후 상태(paid, in_progress, delivered, refunded)는 데이터를 건드리지 않고 안내 문구만 돌려줍니다.
export async function requestOrderDeletion(orderId: unknown): Promise<DeletionResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, message: "로그인 후 이용해 주세요." };
  }
  if (!isUuid(orderId)) {
    return { ok: false, message: "신청 내역을 찾지 못했습니다." };
  }

  const admin = await createAdminClient();
  // 본인 주문인지 서버에서 확인합니다(user_id 조건).
  const found = await admin
    .from("orders")
    .select("id, status, deleted_at")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (found.error) {
    console.error("requestOrderDeletion lookup failed", found.error.code);
    return { ok: false, message: "삭제 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!found.data || found.data.deleted_at) {
    return { ok: false, message: "신청 내역을 찾지 못했습니다." };
  }

  if (!isOneOf(found.data.status, DELETABLE_STATUSES)) {
    if (found.data.status === "canceled") {
      return { ok: false, message: "이미 취소된 신청입니다." };
    }
    return {
      ok: true,
      outcome: "kept",
      message: `결제가 확인된 신청은 바로 삭제할 수 없습니다. 고객센터 ${brand.support}로 문의해 주세요.`,
    };
  }

  // 조회와 갱신 사이에 상태가 바뀌었을 수 있으므로, 갱신 조건에도 상태와 소유자를 다시 겁니다.
  const updated = await admin
    .from("orders")
    .update({
      status: "canceled",
      payload: null,
      contact_email: null,
      contact_phone: null,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .in("status", DELETABLE_STATUSES)
    .is("deleted_at", null)
    .select("id");
  if (updated.error) {
    console.error("requestOrderDeletion update failed", updated.error.code);
    return { ok: false, message: "삭제 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (updated.data.length === 0) {
    return { ok: false, message: "신청 상태가 바뀌어 삭제하지 못했습니다. 화면을 새로 고쳐 주세요." };
  }
  return { ok: true, outcome: "deleted" };
}
