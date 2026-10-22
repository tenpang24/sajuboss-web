import "server-only";
import { PENDING } from "@/lib/report/phrases";
import type { ReportJson } from "@/lib/report/build";
import { previewReport, type ReportPreview } from "@/lib/report/preview";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

// 고객 화면용 신년 리포트 읽기.
// 조회는 사용자 세션 클라이언트(RLS)로 합니다. order_reports 정책이 "본인 주문 + 삭제 안 됨 + delivered"만 돌려주므로
// 남의 주문, 전달 전 주문, 환불된 주문의 리포트는 없는 것으로 보입니다. 컬럼은 명시해서 읽습니다(input_snapshot, created_by 제외).
// 처음 열어 본 시각 기록(mark_report_viewed)은 service_role 함수로, 세션의 사용자 id를 넘깁니다.

/** 운영(production)에서는 문구 확정 전 자리표시를 화면에 내지 않습니다(null). 개발 환경에서는 그대로 보여 줍니다. */
export function visibleText(text: string | undefined | null): string | null {
  if (!text) return null;
  if (text === PENDING && process.env.NODE_ENV === "production") return null;
  return text;
}

/** 저장된 리포트. 앞서 저장된 리포트에는 사업 기질·반기 제안·충합 보조가 없을 수 있습니다. */
export type StoredReport = Omit<ReportJson, "dayGanPhrase" | "halves"> & Partial<Pick<ReportJson, "dayGanPhrase" | "halves">>;

function readStoredReport(value: unknown): StoredReport | null {
  if (typeof value !== "object" || value === null) return null;
  const report = value as Partial<StoredReport>;
  if (report.schemaVersion !== 1 || !report.calc || !Array.isArray(report.months)) return null;
  if (!Array.isArray(report.calc.months) || report.calc.months.length !== 12 || report.months.length !== 12) return null;
  return report as StoredReport;
}

export type OwnReport = {
  orderId: string;
  firstViewedAt: string | null;
  createdAt: string;
  report: StoredReport | null; // 형식이 맞지 않으면 null(화면은 안내만)
};

export async function loadOwnReport(orderId: unknown): Promise<OwnReport | null> {
  if (!isUuid(orderId)) return null;
  const supabase = await createClient();
  const order = await supabase.from("orders").select("id, product, status").eq("id", orderId).maybeSingle();
  if (order.error) {
    console.error("loadOwnReport order failed", order.error.code);
    return null;
  }
  if (!order.data || order.data.product !== "report_2027" || order.data.status !== "delivered") return null;

  const { data, error } = await supabase
    .from("order_reports")
    .select("order_id, report, first_viewed_at, created_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) {
    console.error("loadOwnReport failed", error.code);
    return null;
  }
  if (!data) return null;
  return {
    orderId: data.order_id as string,
    firstViewedAt: data.first_viewed_at as string | null,
    createdAt: data.created_at as string,
    report: readStoredReport(data.report),
  };
}

export type MarkViewedOutcome = "viewed" | "already_viewed" | "not_found" | "invalid" | "error";

/** 처음 열어 본 시각 기록. userId는 서버 액션이 세션에서 확인한 값만 넣습니다. */
export async function markReportViewed(orderId: string, userId: string): Promise<MarkViewedOutcome> {
  const admin = await createAdminClient();
  const { data, error } = await admin.rpc("mark_report_viewed", { p_order_id: orderId, p_user_id: userId });
  if (error) {
    console.error("mark_report_viewed failed", error.code);
    return "error";
  }
  const outcomes: MarkViewedOutcome[] = ["viewed", "already_viewed", "not_found", "invalid"];
  return outcomes.find((item) => item === data) ?? "error";
}

/** 신년 리포트 주문의 사주로 미리보기(사주표 + 세운 총평 1문장). 세션 클라이언트로 본인 주문의 사주만 읽고, 저장하지 않습니다. */
export async function loadOwnPreview(orderId: string): Promise<Extract<ReportPreview, { ok: true }> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("product, saju:payload->saju")
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    console.error("loadOwnPreview failed", error.code);
    return null;
  }
  const row = data as { product: string; saju: unknown } | null;
  if (!row || row.product !== "report_2027") return null;
  const preview = previewReport(row.saju);
  return preview.ok ? preview : null;
}
