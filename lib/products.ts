// 상품과 주문 상태의 허용값. DB의 check 제약(supabase/migrations/20261011150100_orders.sql)과 맞춥니다.
export const PRODUCTS = ["report_2027", "date", "name_biz", "name_person"] as const;
export type Product = (typeof PRODUCTS)[number];

export const PACKAGES = ["basic", "detail"] as const;
export type Package = (typeof PACKAGES)[number];

// 작명 2종은 패키지 필수, 리포트·택일은 패키지 없음
export const PACKAGE_REQUIRED: Record<Product, boolean> = {
  report_2027: false,
  date: false,
  name_biz: true,
  name_person: true,
};

export const productNames: Record<Product, string> = {
  report_2027: "2027 신년 사업운 월별 리포트",
  date: "개업택일",
  name_biz: "상호·브랜드 작명",
  name_person: "개인·개명 작명",
};

export const packageNames: Record<Package, string> = { basic: "기본", detail: "상세" };

export const ORDER_STATUSES = [
  "preorder",
  "requested",
  "paid",
  "in_progress",
  "delivered",
  "canceled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const statusLabels: Record<OrderStatus, string> = {
  preorder: "사전 신청 완료",
  requested: "결제 확인 대기",
  paid: "결제 확인",
  in_progress: "풀이 진행 중",
  delivered: "전달 완료",
  canceled: "취소됨",
  refunded: "환불됨",
};

// 사용자의 삭제 요청으로 바로 비울 수 있는 상태(결제 전). 그 외 상태는 비우지 않습니다.
export const DELETABLE_STATUSES: OrderStatus[] = ["preorder", "requested"];

// 신년 리포트는 12월 1일 오픈 전까지 사전신청(결제 아님)으로 받습니다. 오픈하면 false로 바꿉니다.
export const REPORT_2027_IS_PREORDER = true;

// 신청 폼 3종(개업택일, 상호·브랜드 작명, 개인·개명 작명)의 접수 스위치.
// false이면 화면은 보이되 제출 버튼이 "오픈 준비 중"으로 바뀌고, 서버 액션과 createOrder도 접수하지 않습니다.
// 검증할 때만 로컬에서 true로 바꾸고, 커밋에는 false로 남깁니다.
export const APPLY_FORMS_OPEN = false;

// 신청 번호: 주문 id 앞 8자리
export function orderNumber(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}
