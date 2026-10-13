import "server-only";
import { dateSummary, packageSummaries } from "@/lib/apply/options";
import {
  ORDER_STATUSES,
  PACKAGES,
  PRODUCTS,
  packageNames,
  productNames,
  type OrderStatus,
  type Package,
  type Product,
} from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { isOneOf, isUuid } from "@/lib/validation";

// 결제·완료 화면에 보여 줄 본인 주문. 사용자 세션 클라이언트로 읽으므로 RLS가
// 본인의 삭제되지 않은 주문만 돌려줍니다(다른 사람의 주문 id는 없는 것으로 보입니다).
// 컬럼은 명시해서 읽고(select('*') 금지), 신청 내용(payload)은 읽지 않습니다.
export type OrderView = {
  id: string;
  product: Product;
  package: Package | null;
  status: OrderStatus;
  amountKrw: number;
  contactEmail: string | null;
  contactPhone: string | null;
  consentPrivacyAt: string;
  consentDisclaimerAt: string;
  title: string; // 예: 상호·브랜드 작명 (기본)
  summary: string; // 예: 후보 5개 + 추천 1~2개
};

export async function loadOwnOrderView(orderId: unknown): Promise<OrderView | null> {
  if (!isUuid(orderId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, product, package, status, amount_krw, contact_email, contact_phone, consent_privacy_at, consent_disclaimer_at",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    console.error("loadOwnOrderView failed", error.code);
    return null;
  }
  if (!data || !isOneOf(data.product, PRODUCTS) || !isOneOf(data.status, ORDER_STATUSES)) {
    return null;
  }

  const pkg = isOneOf(data.package, PACKAGES) ? data.package : null;
  const summary =
    data.product === "date"
      ? dateSummary
      : data.product === "report_2027"
        ? "12개월 흐름과 조심할 달·확장하기 좋은 달"
        : packageSummaries[pkg ?? "basic"];
  return {
    id: data.id,
    product: data.product,
    package: pkg,
    status: data.status,
    amountKrw: data.amount_krw,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    consentPrivacyAt: data.consent_privacy_at,
    consentDisclaimerAt: data.consent_disclaimer_at,
    title: `${productNames[data.product]}${pkg ? ` (${packageNames[pkg]})` : ""}`,
    summary,
  };
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatDay(value: string) {
  return dateFormat.format(new Date(value));
}

// 010-1234-5678 형태로 보여 줍니다(저장은 숫자만).
export function formatPhone(digits: string) {
  return digits.replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3");
}
