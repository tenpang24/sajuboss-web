import "server-only";
import { sajuKey } from "@/lib/admin/payload";
import { getUser, isAdmin } from "@/lib/auth";
import { generateAfterPayment, generateOrderReport } from "@/lib/report/generate";
import {
  ORDER_STATUSES,
  PACKAGES,
  PRODUCTS,
  type OrderStatus,
  type Package,
  type Product,
} from "@/lib/products";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOneOf, isUuid, parseDate } from "@/lib/validation";

// 관리자 화면의 조회와 처리. 이 파일의 모든 함수는 맨 앞에서 관리자인지 확인합니다.
//
// 지켜야 하는 규칙
// 1) 관리자 확인은 로그인 세션 클라이언트로 is_admin()을 호출해서 합니다(lib/auth.ts의 isAdmin).
//    통과한 뒤에만 service_role을 씁니다. 확인에 실패하거나 오류가 나면 관리자가 아닌 것으로 처리합니다.
// 2) 주문 상태와 메모를 바꾸는 일은 DB 함수 4개로만 합니다(supabase/migrations/20261013150000_admin_actions.sql).
//    함수가 상태 변경과 처리 기록(order_events)을 한 트랜잭션으로 씁니다. 이 파일은 orders·payments를 직접 고치지 않습니다.
// 3) 처리한 사람(p_actor_id)은 세션의 사용자 id입니다. 폼에서 받지 않습니다.
// 4) 금액은 폼에서 받지 않습니다. 입금 확인은 DB의 주문 금액으로 처리됩니다.
// 5) 신청 내용(payload), 이메일, 전화, 메모는 로그에 남기지 않습니다(오류 코드와 결과 종류만 기록).
// 6) orders 조회는 컬럼을 명시합니다. 목록과 같은 사주 비교에서는 payload 전체를 읽지 않고 사주 값만 읽습니다.

// 관리자면 세션의 사용자 id, 아니면 null
async function adminActor(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  return (await isAdmin()) ? user.id : null;
}

// ── 목록 ──
export const ADMIN_PAGE_SIZE = 30;

export type AdminOrderFilters = {
  product: Product | null;
  status: OrderStatus | null;
  min: number | null; // 금액 하한
  max: number | null; // 금액 상한
  from: string | null; // 신청일 시작(한국 날짜, YYYY-MM-DD)
  to: string | null; // 신청일 끝
  number: string | null; // 신청 번호(주문 id 앞 8자리)
  page: number;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function parseAmount(value: string | undefined): number | null {
  if (!value || !/^\d{1,9}$/.test(value.trim())) return null;
  return Number(value.trim());
}

// 주소의 검색 조건을 읽습니다. 형식에 맞지 않는 값은 버립니다.
export function readAdminFilters(
  params: Record<string, string | string[] | undefined>,
): AdminOrderFilters {
  const product = first(params.product);
  const status = first(params.status);
  const number = (first(params.no) ?? "").trim().toLowerCase();
  const page = Number(first(params.page));
  return {
    product: isOneOf(product, PRODUCTS) ? product : null,
    status: isOneOf(status, ORDER_STATUSES) ? status : null,
    min: parseAmount(first(params.min)),
    max: parseAmount(first(params.max)),
    from: parseDate(first(params.from)),
    to: parseDate(first(params.to)),
    number: /^[0-9a-f]{8}$/.test(number) ? number : null,
    page: Number.isInteger(page) && page >= 1 && page <= 10000 ? page : 1,
  };
}

export type AdminOrderRow = {
  id: string;
  product: Product | null;
  package: Package | null;
  status: OrderStatus | null;
  amountKrw: number;
  createdAt: string;
  deleted: boolean; // 사용자가 삭제 요청한 주문
  waitingDeposit: boolean; // 입금 확인 요청이 들어와 있음
  sameSaju: number; // 같은 사주로 들어온 다른 신청 수
  dueDate: boolean; // 아기 이름(생년월일이 출산 예정일일 수 있음)
};

export type AdminOrderList = { rows: AdminOrderRow[]; total: number; page: number; pages: number };

// 사주 값만 읽는 컬럼 목록(payload 전체를 읽지 않습니다).
const SAJU_COLUMNS =
  "s_birth_date:payload->saju->>birth_date, s_calendar:payload->saju->>calendar, " +
  "s_birth_time:payload->saju->>birth_time, s_gender:payload->saju->>gender";

type SajuColumns = {
  s_birth_date: string | null;
  s_calendar: string | null;
  s_birth_time: string | null;
  s_gender: string | null;
};

const keyOf = (row: SajuColumns) =>
  sajuKey({
    birth_date: row.s_birth_date,
    calendar: row.s_calendar,
    birth_time: row.s_birth_time,
    gender: row.s_gender,
  });

type ListRow = SajuColumns & {
  id: string;
  product: string;
  package: string | null;
  status: string;
  amount_krw: number;
  created_at: string;
  deleted_at: string | null;
  kind: string | null;
};

export async function listAdminOrders(filters: AdminOrderFilters): Promise<AdminOrderList | null> {
  if (!(await adminActor())) return null;
  const admin = await createAdminClient();

  let query = admin
    .from("orders")
    .select(
      `id, product, package, status, amount_krw, created_at, deleted_at, kind:payload->>kind, ${SAJU_COLUMNS}`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });
  if (filters.product) query = query.eq("product", filters.product);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.min !== null) query = query.gte("amount_krw", filters.min);
  if (filters.max !== null) query = query.lte("amount_krw", filters.max);
  // 신청일은 한국 날짜 기준입니다.
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00+09:00`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999+09:00`);
  if (filters.number) {
    query = query
      .gte("id", `${filters.number}-0000-0000-0000-000000000000`)
      .lte("id", `${filters.number}-ffff-ffff-ffff-ffffffffffff`);
  }
  const start = (filters.page - 1) * ADMIN_PAGE_SIZE;
  const { data, error, count } = await query.range(start, start + ADMIN_PAGE_SIZE - 1);
  if (error) {
    console.error("listAdminOrders failed", error.code);
    return null;
  }
  const list = (data ?? []) as unknown as ListRow[];
  const ids = list.map((row) => row.id);

  // 입금 확인 요청(결제 대기 행)이 있는 주문
  const waiting = new Set<string>();
  if (ids.length) {
    const ready = await admin.from("payments").select("order_id").in("order_id", ids).eq("status", "ready");
    if (ready.error) console.error("listAdminOrders payments failed", ready.error.code);
    for (const row of ready.data ?? []) waiting.add(row.order_id as string);
  }

  // 같은 사주: 이 쪽에 나온 생년월일과 같은 주문의 사주 값만 읽어 서버에서 비교합니다.
  const sameCount = new Map<string, number>();
  const dates = [...new Set(list.map((row) => row.s_birth_date).filter((d): d is string => Boolean(d)))];
  if (dates.length) {
    const same = await admin
      .from("orders")
      .select(`id, ${SAJU_COLUMNS}`)
      .in("payload->saju->>birth_date", dates)
      .limit(2000);
    if (same.error) console.error("listAdminOrders saju failed", same.error.code);
    for (const row of (same.data ?? []) as unknown as (SajuColumns & { id: string })[]) {
      const key = keyOf(row);
      if (key) sameCount.set(key, (sameCount.get(key) ?? 0) + 1);
    }
  }

  const total = count ?? list.length;
  return {
    rows: list.map((row) => {
      const key = keyOf(row);
      return {
        id: row.id,
        product: isOneOf(row.product, PRODUCTS) ? row.product : null,
        package: isOneOf(row.package, PACKAGES) ? row.package : null,
        status: isOneOf(row.status, ORDER_STATUSES) ? row.status : null,
        amountKrw: row.amount_krw,
        createdAt: row.created_at,
        deleted: row.deleted_at !== null,
        waitingDeposit: waiting.has(row.id),
        sameSaju: key ? Math.max((sameCount.get(key) ?? 1) - 1, 0) : 0,
        dueDate: row.kind === "baby",
      };
    }),
    total,
    page: filters.page,
    pages: Math.max(Math.ceil(total / ADMIN_PAGE_SIZE), 1),
  };
}

// ── 상세 ──
export type AdminPayment = {
  id: string;
  provider: string;
  providerName: string | null;
  amountKrw: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

export type AdminEvent = {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
  byMe: boolean; // 지금 보고 있는 관리자가 한 처리
};

export type SameSajuOrder = {
  id: string;
  product: Product | null;
  status: OrderStatus | null;
  createdAt: string;
  sameAccount: boolean;
};

// 신년 리포트(order_reports). 리포트 내용과 계산 입력은 읽지 않습니다.
export type AdminReport = {
  createdAt: string;
  byAdmin: boolean; // 관리자가 만들었는지(자동 생성이면 false)
  firstViewedAt: string | null;
  engineVersion: string;
  phraseVersion: string;
};

export type AdminOrderDetail = {
  id: string;
  product: Product;
  package: Package | null;
  status: OrderStatus;
  amountKrw: number;
  contactEmail: string | null;
  contactPhone: string | null;
  consentPrivacyAt: string;
  consentDisclaimerAt: string;
  payload: unknown; // 화면에서는 lib/admin/payload.ts로 글자로만 바꿔 출력합니다.
  adminNote: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  payments: AdminPayment[];
  events: AdminEvent[];
  hasSaju: boolean; // 사주 값이 있어 같은 사주 비교를 했는지
  sameSaju: SameSajuOrder[];
  report: AdminReport | null; // 신년 리포트 주문에서만 읽습니다.
};

export async function getAdminOrder(orderId: unknown): Promise<AdminOrderDetail | null> {
  const actor = await adminActor();
  if (!actor || !isUuid(orderId)) return null;
  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("orders")
    .select(
      "id, user_id, product, package, status, amount_krw, contact_email, contact_phone, " +
        "consent_privacy_at, consent_disclaimer_at, payload, admin_note, deleted_at, created_at, updated_at",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    console.error("getAdminOrder failed", error.code);
    return null;
  }
  const order = data as unknown as {
    id: string;
    user_id: string;
    product: string;
    package: string | null;
    status: string;
    amount_krw: number;
    contact_email: string | null;
    contact_phone: string | null;
    consent_privacy_at: string;
    consent_disclaimer_at: string;
    payload: unknown;
    admin_note: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  if (!order || !isOneOf(order.product, PRODUCTS) || !isOneOf(order.status, ORDER_STATUSES)) {
    return null;
  }

  // 결제 기록. 결제 키(provider_payment_id)는 화면에 필요하지 않아 읽지 않습니다.
  const payments = await admin
    .from("payments")
    .select("id, provider, provider_name, amount_krw, status, paid_at, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });
  if (payments.error) console.error("getAdminOrder payments failed", payments.error.code);

  const events = await admin
    .from("order_events")
    .select("id, actor_id, action, from_status, to_status, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (events.error) console.error("getAdminOrder events failed", events.error.code);

  let report: AdminReport | null = null;
  if (order.product === "report_2027") {
    const saved = await admin
      .from("order_reports")
      .select("created_at, created_by, first_viewed_at, engine_version, phrase_version")
      .eq("order_id", order.id)
      .maybeSingle();
    if (saved.error) console.error("getAdminOrder report failed", saved.error.code);
    if (saved.data) {
      report = {
        createdAt: saved.data.created_at as string,
        byAdmin: saved.data.created_by !== null,
        firstViewedAt: saved.data.first_viewed_at as string | null,
        engineVersion: saved.data.engine_version as string,
        phraseVersion: saved.data.phrase_version as string,
      };
    }
  }

  // 같은 사주: 생년월일이 같은 주문의 사주 값만 읽어 서버에서 비교합니다.
  const payload = order.payload;
  const saju =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).saju
      : null;
  const mine =
    typeof saju === "object" && saju !== null && !Array.isArray(saju)
      ? sajuKey(saju as { birth_date: unknown; calendar: unknown; birth_time: unknown; gender: unknown })
      : null;
  const sameSaju: SameSajuOrder[] = [];
  if (mine) {
    const birthDate = mine.split("|")[0];
    const same = await admin
      .from("orders")
      .select(`id, user_id, product, status, created_at, ${SAJU_COLUMNS}`)
      .eq("payload->saju->>birth_date", birthDate)
      .neq("id", order.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (same.error) console.error("getAdminOrder saju failed", same.error.code);
    type SameRow = SajuColumns & {
      id: string;
      user_id: string;
      product: string;
      status: string;
      created_at: string;
    };
    for (const row of (same.data ?? []) as unknown as SameRow[]) {
      if (keyOf(row) !== mine) continue;
      sameSaju.push({
        id: row.id,
        product: isOneOf(row.product, PRODUCTS) ? row.product : null,
        status: isOneOf(row.status, ORDER_STATUSES) ? row.status : null,
        createdAt: row.created_at,
        sameAccount: row.user_id === order.user_id,
      });
    }
  }

  return {
    id: order.id,
    product: order.product,
    package: isOneOf(order.package, PACKAGES) ? order.package : null,
    status: order.status,
    amountKrw: order.amount_krw,
    contactEmail: order.contact_email,
    contactPhone: order.contact_phone,
    consentPrivacyAt: order.consent_privacy_at,
    consentDisclaimerAt: order.consent_disclaimer_at,
    payload: order.payload,
    adminNote: order.admin_note,
    deletedAt: order.deleted_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    payments: (payments.data ?? []).map((row) => ({
      id: row.id as string,
      provider: row.provider as string,
      providerName: row.provider_name as string | null,
      amountKrw: row.amount_krw as number,
      status: row.status as string,
      paidAt: row.paid_at as string | null,
      createdAt: row.created_at as string,
    })),
    events: (events.data ?? []).map((row) => ({
      id: row.id as string,
      action: row.action as string,
      fromStatus: row.from_status as string | null,
      toStatus: row.to_status as string | null,
      createdAt: row.created_at as string,
      byMe: row.actor_id === actor,
    })),
    hasSaju: mine !== null,
    sameSaju,
    report,
  };
}

// ── 처리 ──
export type AdminActionResult = { ok: boolean; message: string };

const done = (message: string): AdminActionResult => ({ ok: true, message });
const fail = (message: string): AdminActionResult => ({ ok: false, message });

const NOT_FOUND = "신청 내역을 찾지 못했습니다.";
const FAILED = "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const CHANGED = "그 사이 신청 상태가 바뀌었습니다. 화면을 새로 고친 뒤 다시 확인해 주세요.";

// 화면에서 고를 수 있는 상태 변경. DB 함수 admin_change_order_status가 허용하는 여섯 개와 같습니다.
// (requested → paid는 입금 확인, → refunded는 환불로만 합니다.)
export const STATUS_MOVES: readonly { from: OrderStatus; to: OrderStatus; label: string; back?: boolean }[] = [
  { from: "paid", to: "in_progress", label: "풀이 진행 중으로" },
  { from: "in_progress", to: "delivered", label: "전달 완료로" },
  { from: "delivered", to: "in_progress", label: "풀이 진행 중으로 되돌리기", back: true },
  { from: "in_progress", to: "paid", label: "결제 확인으로 되돌리기", back: true },
  { from: "preorder", to: "canceled", label: "신청 취소" },
  { from: "requested", to: "canceled", label: "신청 취소" },
];

type RpcName =
  | "admin_confirm_manual_payment"
  | "refund_order_payment"
  | "admin_change_order_status"
  | "admin_set_order_note";

// 관리자 확인 뒤 DB 함수를 호출하고 결과 문자열을 돌려줍니다. 관리자가 아니면 null.
async function callAdminFunction(
  name: RpcName,
  orderId: unknown,
  args: Record<string, unknown> = {},
): Promise<string | null> {
  const actor = await adminActor();
  if (!actor) return null;
  if (!isUuid(orderId)) return "not_found";
  const admin = await createAdminClient();
  const { data, error } = await admin.rpc(name, { p_order_id: orderId, p_actor_id: actor, ...args });
  if (error) {
    console.error(`${name} failed`, error.code);
    return "error";
  }
  const outcome = typeof data === "string" ? data : "error";
  if (!["paid", "refunded", "changed", "saved"].includes(outcome)) {
    console.error(`${name} rejected`, outcome);
  }
  return outcome;
}

// 수동 입금 확인. 관리자가 주문 금액 전액 입금을 확인하고 체크한 뒤에만 호출합니다.
export async function adminConfirmPayment(orderId: unknown, checked: boolean): Promise<AdminActionResult> {
  if (!checked) return fail("주문 금액 전액이 입금된 것을 확인하고 체크해 주세요.");
  const outcome = await callAdminFunction("admin_confirm_manual_payment", orderId);
  if (outcome === null || outcome === "not_found" || outcome === "forbidden") return fail(NOT_FOUND);
  if (outcome === "paid") {
    // 신년 리포트는 입금 확인 직후 자동으로 만듭니다(다른 상품은 아무것도 하지 않음).
    // 실패해도 입금 확인은 그대로이고 주문은 결제 확인(paid)으로 남습니다. 결과는 화면의 리포트 상태로 확인합니다.
    const report = isUuid(orderId) ? await generateAfterPayment(orderId) : "not_report";
    if (report === "not_report") return done("입금을 확인했습니다. 상태가 결제 확인으로 바뀌었습니다.");
    if (report === "saved") return done("입금을 확인했고 신년 리포트를 만들었습니다. 상태가 전달 완료로 바뀌었습니다.");
    return done("입금을 확인했습니다. 신년 리포트는 만들지 못해 결제 확인 상태로 남았습니다. 리포트 상태에서 다시 만들어 주세요.");
  }
  if (outcome === "already_paid") return fail("이미 결제가 확인된 신청입니다.");
  if (outcome === "not_payable") return fail("결제 확인 대기 상태의 신청만 입금 확인할 수 있습니다.");
  return fail(FAILED);
}

// 환불 반영(전액). 관리자가 돈을 실제로 돌려주고 체크한 뒤에만 호출합니다. 기록만 바꿉니다.
export async function adminRefund(orderId: unknown, checked: boolean): Promise<AdminActionResult> {
  if (!checked) return fail("환불 금액을 실제로 돌려준 것을 확인하고 체크해 주세요.");
  const outcome = await callAdminFunction("refund_order_payment", orderId);
  if (outcome === null || outcome === "not_found" || outcome === "forbidden") return fail(NOT_FOUND);
  if (outcome === "refunded") return done("환불로 기록했습니다.");
  if (outcome === "already_refunded") return fail("이미 환불로 기록된 신청입니다.");
  if (outcome === "not_refundable") return fail("결제가 확인된 신청만 환불로 기록할 수 있습니다.");
  if (outcome === "no_payment") {
    return fail("이 신청에는 확인된 결제 기록이 없어 환불로 기록할 수 없습니다.");
  }
  return fail(FAILED);
}

// 상태 변경(진행, 한 칸 되돌리기, 결제 전 취소). from은 화면을 열었을 때의 상태입니다.
export async function adminChangeStatus(
  orderId: unknown,
  from: unknown,
  to: unknown,
): Promise<AdminActionResult> {
  const move = STATUS_MOVES.find((item) => item.from === from && item.to === to);
  if (!move) return fail("할 수 없는 상태 변경입니다.");
  const outcome = await callAdminFunction("admin_change_order_status", orderId, {
    p_from: move.from,
    p_to: move.to,
  });
  if (outcome === null || outcome === "not_found" || outcome === "forbidden") return fail(NOT_FOUND);
  if (outcome === "changed") {
    return done(move.to === "canceled" ? "신청을 취소했습니다." : "상태를 바꿨습니다.");
  }
  if (outcome === "conflict") return fail(CHANGED);
  if (outcome === "invalid") return fail("할 수 없는 상태 변경입니다.");
  return fail(FAILED);
}

// 신년 리포트 만들기·다시 만들기. 사용자가 처음 열어 보기 전까지만 다시 만들 수 있습니다(DB 함수가 확인).
export async function adminRegenerateReport(orderId: unknown): Promise<AdminActionResult> {
  const actor = await adminActor();
  if (!actor || !isUuid(orderId)) return fail(NOT_FOUND);
  const outcome = await generateOrderReport(orderId, actor);
  if (outcome === "saved") return done("리포트를 만들었습니다. 상태가 전달 완료로 바뀌었습니다.");
  if (outcome === "regenerated") return done("리포트를 다시 만들었습니다.");
  if (outcome === "viewed_locked") return fail("고객이 이미 열어 본 리포트는 다시 만들 수 없습니다.");
  if (outcome === "not_payable") {
    return fail("결제가 확인된 신년 리포트 신청만 리포트를 만들 수 있습니다(환불·취소된 신청 제외).");
  }
  if (outcome === "phrases_unconfirmed") {
    return fail("리포트 문구가 확정되기 전이라 운영 환경에서는 리포트를 만들 수 없습니다.");
  }
  if (outcome === "invalid_input") return fail("신청 내용의 사주 정보로 계산하지 못했습니다. 신청 내용을 확인해 주세요.");
  if (outcome === "not_report") return fail("신년 리포트 신청이 아닙니다.");
  if (outcome === "not_found" || outcome === "forbidden") return fail(NOT_FOUND);
  return fail(FAILED);
}

export const ADMIN_NOTE_MAX = 2000;

// 내부 메모 저장. 메모는 사용자에게 보이지 않습니다.
export async function adminSaveNote(orderId: unknown, note: unknown): Promise<AdminActionResult> {
  if (typeof note !== "string") return fail("메모를 다시 확인해 주세요.");
  // 브라우저는 여러 줄 입력의 줄바꿈을 \r\n으로 보냅니다. \n으로 맞춰 저장합니다.
  const text = note.replace(/\r\n?/g, "\n");
  if (text.trim().length > ADMIN_NOTE_MAX) {
    return fail(`메모는 ${ADMIN_NOTE_MAX.toLocaleString("ko-KR")}자 이하로 적어 주세요.`);
  }
  const outcome = await callAdminFunction("admin_set_order_note", orderId, { p_note: text });
  if (outcome === null || outcome === "not_found" || outcome === "forbidden") return fail(NOT_FOUND);
  if (outcome === "saved") return done("메모를 저장했습니다.");
  if (outcome === "invalid") {
    return fail(`메모는 ${ADMIN_NOTE_MAX.toLocaleString("ko-KR")}자 이하로 적어 주세요.`);
  }
  return fail(FAILED);
}
