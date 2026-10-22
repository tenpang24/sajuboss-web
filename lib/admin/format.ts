import {
  packageNames,
  productNames,
  statusLabels,
  type OrderStatus,
  type Package,
  type Product,
} from "@/lib/products";

// 관리자 화면 표시용 이름과 날짜 형식

export const adminBadgeTone: Partial<Record<OrderStatus, "y" | "done" | "line">> = {
  requested: "y",
  delivered: "done",
  canceled: "line",
  refunded: "line",
};

export function productTitle(product: Product | null, pkg: Package | null) {
  if (!product) return "알 수 없는 상품";
  return `${productNames[product]}${pkg ? ` (${packageNames[pkg]})` : ""}`;
}

export function statusText(status: string | null) {
  return status && status in statusLabels ? statusLabels[status as OrderStatus] : "확인 필요";
}

const dayTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDayTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dayTime.format(date);
}

export const eventNames: Record<string, string> = {
  payment_confirmed: "입금 확인",
  status_changed: "상태 변경",
  refunded: "환불 기록",
  canceled: "관리자 취소",
  note_updated: "메모 수정",
  report_generated: "리포트 생성",
  report_regenerated: "리포트 다시 만들기",
  report_viewed: "고객이 리포트 열어 봄",
};

export const paymentStatusNames: Record<string, string> = {
  ready: "입금 확인 대기",
  paid: "확인됨",
  failed: "거부됨(금액 불일치 등)",
  canceled: "취소됨",
  refunded: "환불됨",
};

export function paymentMethod(provider: string, providerName: string | null) {
  if (provider === "manual") return "계좌이체(수동 확인)";
  return providerName ? `결제대행사(${providerName})` : "결제대행사";
}
