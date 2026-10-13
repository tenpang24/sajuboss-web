import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { loadOwnOrderView } from "@/lib/order-view";
import { getPaymentState } from "@/lib/payment";
import { formatKrw } from "@/lib/pricing";
import { orderNumber, statusLabels, type OrderStatus } from "@/lib/products";

export const metadata: Metadata = { title: "신청 완료" };

type Tone = "y" | "done" | "line" | undefined;

// 상태별 제목·안내·결제 상태 표시. 확정되지 않은 전달 시기·환불 내용은 약속하지 않습니다.
function describe(status: OrderStatus, waitingDeposit: boolean) {
  if (status === "paid" || status === "in_progress" || status === "delivered") {
    return {
      title: "결제가 확인되었습니다",
      lead: "신청 내용대로 진행합니다. 진행 상황은 내 신청에서 언제든 볼 수 있습니다.",
      badge: status === "paid" ? "결제 확인" : statusLabels[status],
      tone: (status === "delivered" ? "done" : undefined) as Tone,
      step: status === "paid" ? 2 : 3,
    };
  }
  if (status === "preorder") {
    return {
      title: "사전신청이 접수되었습니다",
      lead: "사전신청은 결제가 아닙니다. 12월 1일 오픈하면 이메일로 알려 드립니다.",
      badge: statusLabels.preorder,
      tone: undefined as Tone,
      step: 1,
    };
  }
  if (status === "canceled" || status === "refunded") {
    return {
      title: status === "canceled" ? "취소된 신청입니다" : "환불된 신청입니다",
      lead: "진행 상황은 내 신청에서 볼 수 있습니다.",
      badge: statusLabels[status],
      tone: "line" as Tone,
      step: 0,
    };
  }
  if (waitingDeposit) {
    return {
      title: "입금 확인을 요청하셨습니다",
      lead: "입금 확인 후 안내드립니다. 확인되면 내 신청의 상태가 바뀝니다.",
      badge: "입금 확인 대기",
      tone: "y" as Tone,
      step: 1,
    };
  }
  return {
    title: "신청이 접수되었습니다",
    lead: "진행 상황은 내 신청에서 언제든 볼 수 있습니다.",
    badge: statusLabels.requested,
    tone: "y" as Tone,
    step: 1,
  };
}

async function DoneContent({ params }: Pick<PageProps<"/done/[orderId]">, "params">) {
  const { orderId } = await params;
  await requireUser(`/done/${orderId}`);
  // 다른 사람의 주문·없는 주문·삭제된 주문은 404(proxy.ts에서도 화면을 그리기 전에 막습니다).
  const order = await loadOwnOrderView(orderId);
  if (!order) notFound();

  const payment = order.status === "requested" ? await getPaymentState(order.id) : null;
  const view = describe(order.status, Boolean(payment?.waitingDeposit));
  const steps = [
    {
      title: "접수 완료",
      body:
        order.status === "preorder"
          ? "사전신청을 접수했습니다. 오픈하면 이메일로 알려 드립니다."
          : "신청 내용을 확인하고 결제 방법을 안내합니다. [안내 방식 확정 후 기재]",
    },
    { title: "풀이·후보 작성과 검수", body: "소요 기간 [확정 후 기재]" },
    { title: "결과 전달", body: "전달 방법과 시기 [확정 후 기재]" },
  ];

  return (
    <section className="wrap done">
      <div className="done-head">
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
          <circle cx="36" cy="36" r="34" fill="#0B7A5A" />
          <path
            d="M22 37l10 10 18-20"
            fill="none"
            stroke="#FFD84D"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="t1 t1-sm">{view.title}</h1>
        <p className="lead">{view.lead}</p>
      </div>

      <Card className="done-card">
        <strong className="sum-title">접수 내역</strong>
        <div className="sum-row">
          <span>신청 번호</span>
          <strong className="done-number">{orderNumber(order.id)}</strong>
        </div>
        <div className="sum-row">
          <span>상품</span>
          <span>{order.title}</span>
        </div>
        <div className="sum-row">
          <span>금액</span>
          <span>{formatKrw(order.amountKrw)}</span>
        </div>
        <div className="sum-row">
          <span>결제 상태</span>
          <span>
            <Badge tone={view.tone}>{view.badge}</Badge>
          </span>
        </div>
        <div className="sum-row">
          <span>결과 전달</span>
          <span>[확정 후 기재]</span>
        </div>
      </Card>

      {view.step > 0 && (
        <Card className="done-card">
          <strong className="sum-title">앞으로 이렇게 진행됩니다</strong>
          <ol className="done-steps">
            {steps.map((step, index) => (
              <li key={step.title} aria-current={index + 1 === view.step ? "step" : undefined}>
                <span
                  className={index + 1 <= view.step ? "num" : "num pay-step-off"}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <p className="muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="done-actions">
        <ButtonLink href="/my" size="lg">
          내 신청 보기
        </ButtonLink>
        <ButtonLink href="/" variant="o" size="lg">
          홈으로
        </ButtonLink>
      </div>
      <p className="muted small done-foot">신청 취소·환불 문의: 고객센터 {brand.support}</p>
    </section>
  );
}

export default function DonePage({ params }: PageProps<"/done/[orderId]">) {
  return (
    <Suspense
      fallback={
        <section className="wrap done" aria-busy="true">
          <div className="card done-card apply-loading" />
        </section>
      }
    >
      <DoneContent params={params} />
    </Suspense>
  );
}
