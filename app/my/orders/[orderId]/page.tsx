import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportGate } from "@/components/report/ReportGate";
import { ReportView } from "@/components/report/ReportView";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { orderNumber } from "@/lib/products";
import { loadOwnReport } from "@/lib/report/view";

export const metadata: Metadata = { title: "신년 사업운 리포트" };

// 고객용 신년 리포트. 본인 주문이고 전달 완료(delivered)인 신년 리포트만 열립니다(그 밖은 404).
// 처음 열 때는 안내 카드를 먼저 보여 주고, "리포트 열기"를 눌러야 내용이 보입니다(처음 열어 본 시각 기록).
async function ReportContent({ params }: Pick<PageProps<"/my/orders/[orderId]">, "params">) {
  const { orderId } = await params;
  await requireUser(`/my/orders/${orderId}`);
  const own = await loadOwnReport(orderId);
  if (!own) notFound();
  const orderNo = orderNumber(own.orderId);

  if (!own.firstViewedAt) return <ReportGate orderId={own.orderId} orderNo={orderNo} />;
  if (!own.report) {
    return (
      <Card className="rv-gate">
        <strong className="rv-gate-title">리포트를 표시하지 못했습니다</strong>
        <p>잠시 후 다시 열어 주세요. 계속 열리지 않으면 고객센터로 알려 주세요. 신청 번호 {orderNo}</p>
        <ButtonLink href="/my" variant="g">
          내 신청으로
        </ButtonLink>
      </Card>
    );
  }
  return <ReportView report={own.report} orderNo={orderNo} />;
}

export default function ReportPage({ params }: PageProps<"/my/orders/[orderId]">) {
  return (
    <section className="wrap rv-wrap">
      <Suspense fallback={<Card className="my-empty my-loading" aria-busy="true" />}>
        <ReportContent params={params} />
      </Suspense>
    </section>
  );
}
