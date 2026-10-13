import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PayView } from "@/components/pay/PayView";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { formatDay, formatPhone, loadOwnOrderView, type OrderView } from "@/lib/order-view";
import { getBankInfo, getPaymentState } from "@/lib/payment";
import { formatKrw } from "@/lib/pricing";
import { PAYMENT_MODE, orderNumber, packageNames, productNames } from "@/lib/products";

export const metadata: Metadata = { title: "결제하기" };

// 진행 단계 표시(1 신청서 작성 → 2 결제 → 3 접수 완료)
function PayHeader() {
  return (
    <div className="wrap apply-head">
      <ol className="pay-steps" aria-label="진행 단계">
        <li>
          <span className="num pay-step-num pay-step-off" aria-hidden="true">
            1
          </span>
          신청서 작성
        </li>
        <li className="pay-step-on" aria-current="step">
          <span className="num pay-step-num" aria-hidden="true">
            2
          </span>
          결제
        </li>
        <li>
          <span className="num pay-step-num pay-step-off" aria-hidden="true">
            3
          </span>
          접수 완료
        </li>
      </ol>
      <div>
        <h1 className="t1 t1-sm">결제하기</h1>
        <p className="lead">주문 내용을 확인하고 결제를 진행해 주세요.</p>
      </div>
    </div>
  );
}

function StepHead({ num, title, help }: { num: number; title: string; help?: string }) {
  return (
    <div className="step-h">
      <span className="num" aria-hidden="true">
        {num}
      </span>
      <div>
        <h2 className="t3">{title}</h2>
        {help && <p className="help step-help">{help}</p>}
      </div>
    </div>
  );
}

// 결제할 수 없는 상태의 주문(사전신청, 이미 결제됨, 취소·환불)
function NotPayable({ order }: { order: OrderView }) {
  const paid = ["paid", "in_progress", "delivered"].includes(order.status);
  const message =
    order.status === "preorder"
      ? "사전신청은 결제 단계가 없습니다. 오픈하면 이메일로 알려 드립니다."
      : paid
        ? "이미 결제가 확인된 신청입니다."
        : "취소되었거나 환불된 신청은 결제할 수 없습니다.";
  return (
    <section className="wrap apply-body">
      <Card className="pay-blocked">
        <strong className="my-empty-title">결제할 수 없는 신청입니다</strong>
        <p className="muted">
          {order.title} · 신청 번호 {orderNumber(order.id)}
        </p>
        <p>{message}</p>
        <div className="pay-blocked-actions">
          {paid && <ButtonLink href={`/done/${order.id}`}>접수 내역 보기</ButtonLink>}
          <ButtonLink href="/my" variant={paid ? "o" : "p"}>
            내 신청 보기
          </ButtonLink>
        </div>
      </Card>
    </section>
  );
}

// 결제 수단 안내(모드별). 계좌 정보는 서버 환경변수에서 읽고, 비어 있으면 "[확정 후 기재]"가 그대로 보입니다.
function PaymentMethod({ order }: { order: OrderView }) {
  if (PAYMENT_MODE === "manual") {
    const bank = getBankInfo();
    return (
      <div className="step">
        <StepHead num={3} title="결제 수단" help="계좌이체로 입금하시면 확인 후 진행합니다." />
        <div className="card-tint pay-bank">
          <div className="sum-row">
            <span>은행</span>
            <span>{bank.bank}</span>
          </div>
          <div className="sum-row">
            <span>예금주</span>
            <span>{bank.holder}</span>
          </div>
          <div className="sum-row">
            <span>계좌번호</span>
            <span className="pay-account">{bank.account}</span>
          </div>
          <div className="sum-row">
            <span>입금 금액</span>
            <strong>{formatKrw(order.amountKrw)}</strong>
          </div>
        </div>
        <p className="help">
          입금하실 때 입금자명 뒤에 신청 번호({orderNumber(order.id)})를 함께 적어 주세요. 입금 확인에
          걸리는 시간은 [확정 후 기재]
        </p>
        {!bank.complete && (
          <p className="notice notice-error" role="alert">
            입금 계좌가 아직 등록되지 않았습니다. 계좌가 표시되기 전에는 입금하지 마세요.
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="step">
      <StepHead
        num={3}
        title="결제 수단"
        help={
          PAYMENT_MODE === "pg"
            ? "결제 수단은 결제 연동 후 확정합니다."
            : "온라인 결제를 준비하고 있습니다. 결제 수단은 결제 연동 후 확정합니다."
        }
      />
      <ul className="pay-list">
        <li>신용·체크카드: [결제 연동 후 기재]</li>
        <li>간편결제: [제공 업체 확정 후 기재]</li>
        <li>계좌이체: [확정 후 기재]</li>
      </ul>
    </div>
  );
}

async function PayContent({ params }: Pick<PageProps<"/pay/[orderId]">, "params">) {
  const { orderId } = await params;
  await requireUser(`/pay/${orderId}`);
  // 다른 사람의 주문·없는 주문·삭제된 주문은 404(proxy.ts에서도 화면을 그리기 전에 막습니다).
  const order = await loadOwnOrderView(orderId);
  if (!order) notFound();
  if (order.status !== "requested") return <NotPayable order={order} />;

  const payment = await getPaymentState(order.id);
  const rows = [
    { label: "상품", value: productNames[order.product] },
    ...(order.package ? [{ label: "패키지", value: packageNames[order.package] }] : []),
    { label: "신청 번호", value: orderNumber(order.id) },
    { label: "상품 금액", value: formatKrw(order.amountKrw) },
  ];

  return (
    <PayView
      orderId={order.id}
      amount={order.amountKrw}
      mode={PAYMENT_MODE}
      waitingDeposit={payment.waitingDeposit}
      bankReady={PAYMENT_MODE === "manual" ? getBankInfo().complete : false}
      rows={rows}
    >
      <div className="step">
        <StepHead num={1} title="주문 상품" />
        <div className="pay-item">
          <div className="pay-item-info">
            <strong>{order.title}</strong>
            <p className="muted">{order.summary} · 전달 시기 [확정 후 기재]</p>
          </div>
          <strong className="pay-item-price">{formatKrw(order.amountKrw)}</strong>
        </div>
        <p className="help">
          신청 내용을 바꾸려면 내 신청에서 이 신청을 삭제 요청한 뒤 다시 신청해 주세요.
        </p>
      </div>

      <div className="step">
        <StepHead num={2} title="신청자 확인" help="신청할 때 입력하고 동의하신 내용입니다." />
        <div className="pay-rows">
          <div className="sum-row">
            <span>결과 받을 이메일</span>
            <span>{order.contactEmail ?? "-"}</span>
          </div>
          <div className="sum-row">
            <span>휴대폰 번호</span>
            <span>{order.contactPhone ? formatPhone(order.contactPhone) : "입력하지 않음"}</span>
          </div>
          <div className="sum-row">
            <span>개인정보 수집·이용 동의</span>
            <span>{formatDay(order.consentPrivacyAt)} 동의</span>
          </div>
          <div className="sum-row">
            <span>참고용 자료 확인</span>
            <span>{formatDay(order.consentDisclaimerAt)} 확인</span>
          </div>
        </div>
      </div>

      <PaymentMethod order={order} />
    </PayView>
  );
}

export default function PayPage({ params }: PageProps<"/pay/[orderId]">) {
  return (
    <>
      <PayHeader />
      <Suspense
        fallback={
          <section className="wrap apply-body" aria-busy="true">
            <div className="step apply-loading" />
          </section>
        }
      >
        <PayContent params={params} />
      </Suspense>
    </>
  );
}
