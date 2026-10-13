import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ConfirmPaymentControl,
  NoteForm,
  RefundControl,
  StatusMoveControl,
} from "@/components/admin/AdminActions";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  adminBadgeTone,
  eventNames,
  formatDayTime,
  paymentMethod,
  paymentStatusNames,
  productTitle,
  statusText,
} from "@/lib/admin/format";
import { ADMIN_NOTE_MAX, STATUS_MOVES, getAdminOrder, type AdminOrderDetail } from "@/lib/admin/orders";
import { payloadRows } from "@/lib/admin/payload";
import { requireAdmin } from "@/lib/auth";
import { formatPhone } from "@/lib/order-view";
import { formatKrw } from "@/lib/pricing";
import { orderNumber, statusLabels, type OrderStatus } from "@/lib/products";

export const metadata: Metadata = { title: "신청 상세" };

const REFUNDABLE: OrderStatus[] = ["paid", "in_progress", "delivered"];

const moveNotes: Record<string, string> = {
  "paid>in_progress": "풀이·후보 작성을 시작한 신청으로 표시합니다.",
  "in_progress>delivered": "결과를 이메일로 보낸 뒤 눌러 주세요. 이 버튼은 메일을 보내지 않습니다.",
  "delivered>in_progress": "전달 완료를 잘못 누른 경우에 한 칸 되돌립니다.",
  "in_progress>paid": "진행 중을 잘못 누른 경우에 한 칸 되돌립니다.",
  "preorder>canceled": "사전신청을 취소합니다. 신청 내용과 연락처는 지우지 않습니다. 취소하면 되돌릴 수 없습니다.",
  "requested>canceled":
    "결제 전 신청을 취소합니다. 신청 내용과 연락처는 지우지 않고, 입금 확인 요청이 있으면 함께 취소됩니다. 취소하면 되돌릴 수 없습니다.",
};

// 처리 버튼. 지금 상태에서 할 수 있는 것만 보여 줍니다.
function Controls({ order }: { order: AdminOrderDetail }) {
  const orderNo = orderNumber(order.id);
  const amount = formatKrw(order.amountKrw);
  const moves = STATUS_MOVES.filter((move) => move.from === order.status);
  const refundable = REFUNDABLE.includes(order.status);
  const none = order.status !== "requested" && moves.length === 0 && !refundable;

  return (
    <Card className="my-card">
      <strong className="my-card-title">처리</strong>
      {none && <p className="muted">이 상태에서는 더 처리할 것이 없습니다.</p>}
      {order.status === "requested" && (
        <ConfirmPaymentControl orderId={order.id} orderNo={orderNo} amount={amount} />
      )}
      {moves.map((move) => (
        <StatusMoveControl
          key={`${move.from}>${move.to}`}
          orderId={order.id}
          from={move.from}
          to={move.to}
          label={move.label}
          note={`${statusLabels[move.from]} → ${statusLabels[move.to]}. ${moveNotes[`${move.from}>${move.to}`] ?? ""}`}
          danger={move.back || move.to === "canceled"}
        />
      ))}
      {refundable && <RefundControl orderId={order.id} orderNo={orderNo} amount={amount} />}
      <p className="muted small">
        환불 규정 [확정 후 기재]. 결과 전달은 이메일로 직접 보냅니다(자동 발송 없음).
      </p>
    </Card>
  );
}

async function DetailContent({ params }: Pick<PageProps<"/admin/orders/[orderId]">, "params">) {
  const { orderId } = await params;
  await requireAdmin(`/admin/orders/${orderId}`);
  const order = await getAdminOrder(orderId);
  if (!order) notFound();

  const deleted = order.deletedAt !== null;
  // 신청 내용은 이름표와 글자로만 바꿔 텍스트로 출력합니다.
  const rows = deleted || order.payload === null ? [] : payloadRows(order.payload, order.product);
  const noteEvent = order.events.find((event) => event.action === "note_updated");

  return (
    <div className="split">
      <div className="split-main my-main">
        <Card className="my-card">
          <div className="order-meta">
            <Badge tone={adminBadgeTone[order.status]}>{statusText(order.status)}</Badge>
            {deleted && <Badge tone="line">삭제 요청됨</Badge>}
            <span className="muted small">신청 번호 {orderNumber(order.id)}</span>
          </div>
          <strong className="order-name">{productTitle(order.product, order.package)}</strong>
          <div className="sum-row">
            <span>금액</span>
            <span>{formatKrw(order.amountKrw)}</span>
          </div>
          <div className="sum-row">
            <span>신청일</span>
            <span>{formatDayTime(order.createdAt)}</span>
          </div>
          <div className="sum-row">
            <span>마지막 변경</span>
            <span>{formatDayTime(order.updatedAt)}</span>
          </div>
          {deleted && (
            <div className="sum-row">
              <span>삭제 요청</span>
              <span>{formatDayTime(order.deletedAt)}</span>
            </div>
          )}
        </Card>

        <Card className="my-card">
          <strong className="my-card-title">신청자 연락처</strong>
          {deleted ? (
            <p className="muted">
              신청자가 삭제를 요청해 신청 내용과 연락처가 지워졌습니다. 상태만 남아 있습니다.
            </p>
          ) : (
            <>
              <div className="sum-row">
                <span>결과 받을 이메일</span>
                <span className="admin-text">{order.contactEmail ?? "-"}</span>
              </div>
              <div className="sum-row">
                <span>휴대폰 번호</span>
                <span className="admin-text">
                  {order.contactPhone ? formatPhone(order.contactPhone) : "입력하지 않음"}
                </span>
              </div>
              <div className="sum-row">
                <span>개인정보 수집·이용 동의</span>
                <span>{formatDayTime(order.consentPrivacyAt)}</span>
              </div>
              <div className="sum-row">
                <span>참고용 자료 확인</span>
                <span>{formatDayTime(order.consentDisclaimerAt)}</span>
              </div>
            </>
          )}
        </Card>

        {!deleted && (
          <Card className="my-card">
            <strong className="my-card-title">신청 내용</strong>
            {rows.length === 0 ? (
              <p className="muted">신청 내용이 없습니다.</p>
            ) : (
              <dl className="admin-kv">
                {rows.map((row, index) => (
                  <div key={index}>
                    <dt>{row.label}</dt>
                    <dd className="admin-text">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        )}

        {!deleted && (
          <Card className="my-card">
            <strong className="my-card-title">같은 사주로 들어온 다른 신청</strong>
            {!order.hasSaju && <p className="muted">사주 정보 없음(비교 안 함)</p>}
            {order.hasSaju && order.sameSaju.length === 0 && <p className="muted">없습니다.</p>}
            {order.hasSaju && order.sameSaju.length > 0 && (
              <>
                <p className="muted small">
                  생년월일, 양력·음력, 태어난 시각, 성별이 모두 같은 신청입니다. 삭제 요청된 신청과
                  동업자 사주는 비교하지 않습니다. 아기 이름은 출산 예정일 기준일 수 있습니다.
                </p>
                <ul className="admin-same">
                  {order.sameSaju.map((item) => (
                    <li key={item.id}>
                      <Link href={`/admin/orders/${item.id}`}>{orderNumber(item.id)}</Link>
                      <span>{productTitle(item.product, null)}</span>
                      <span className="muted">
                        {statusText(item.status)} · {formatDayTime(item.createdAt)} ·{" "}
                        {item.sameAccount ? "같은 계정" : "다른 계정"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        )}

        <Card className="my-card">
          <strong className="my-card-title">결제 기록</strong>
          {order.payments.length === 0 && <p className="muted">결제 기록이 없습니다.</p>}
          {order.payments.length > 0 && (
            <ul className="admin-log">
              {order.payments.map((payment) => (
                <li key={payment.id}>
                  <strong>{paymentStatusNames[payment.status] ?? payment.status}</strong>
                  <span>
                    {paymentMethod(payment.provider, payment.providerName)} · {formatKrw(payment.amountKrw)}
                  </span>
                  <span className="muted">
                    {payment.paidAt
                      ? `${formatDayTime(payment.paidAt)} 확인`
                      : `${formatDayTime(payment.createdAt)} 기록`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="my-card">
          <strong className="my-card-title">처리 기록</strong>
          {order.events.length === 0 && <p className="muted">관리자 처리 기록이 없습니다.</p>}
          {order.events.length > 0 && (
            <ul className="admin-log">
              {order.events.map((event) => (
                <li key={event.id}>
                  <strong>{eventNames[event.action] ?? event.action}</strong>
                  {event.fromStatus && event.toStatus && (
                    <span>
                      {statusText(event.fromStatus)} → {statusText(event.toStatus)}
                    </span>
                  )}
                  <span className="muted">
                    {formatDayTime(event.createdAt)} · {event.byMe ? "내가 처리" : "다른 관리자"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <aside className="split-side my-side" aria-label="처리">
        <Controls order={order} />
        <Card className="my-card">
          <NoteForm
            orderId={order.id}
            note={order.adminNote ?? ""}
            max={ADMIN_NOTE_MAX}
            savedAt={noteEvent ? formatDayTime(noteEvent.createdAt) : null}
          />
        </Card>
      </aside>
    </div>
  );
}

export default function AdminOrderDetailPage({ params }: PageProps<"/admin/orders/[orderId]">) {
  return (
    <>
      <div className="wrap my-head admin-head">
        <ButtonLink href="/admin/orders" variant="g" size="sm">
          ← 신청 목록
        </ButtonLink>
        <h1 className="t1 t1-sm">신청 상세</h1>
      </div>
      <section className="wrap my-body admin-body">
        <Suspense fallback={<Card className="my-empty my-loading" aria-busy="true" />}>
          <DetailContent params={params} />
        </Suspense>
      </section>
    </>
  );
}
