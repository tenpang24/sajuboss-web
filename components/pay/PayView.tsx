"use client";

import Link from "next/link";
import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";
import { submitPayment, type PayState } from "@/app/pay/[orderId]/actions";
import { buttonClass } from "@/components/ui/Button";
import { MobileBar } from "@/components/ui/MobileBar";
import { formatKrw } from "@/lib/pricing";
import type { PaymentMode } from "@/lib/products";

const FORM_ID = "pay-form";
const initialState: PayState = {};

// 결제 화면의 동의·버튼 부분. 주문 상품·신청자·결제 수단 안내(children)는 서버에서 그려 넘겨받습니다.
// 금액은 서버가 DB에서 읽은 값을 표시만 합니다. 폼으로 보내는 값은 주문 id와 동의 체크뿐입니다.
export function PayView({
  orderId,
  amount,
  mode,
  waitingDeposit,
  bankReady,
  rows,
  preview,
  children,
}: {
  orderId: string;
  amount: number;
  mode: PaymentMode;
  waitingDeposit: boolean; // 입금 확인을 이미 요청한 주문
  bankReady: boolean; // 입금 계좌가 등록돼 있는지(manual 모드)
  rows: { label: string; value: string }[];
  preview?: ReactNode; // 신년 리포트 미리보기(결제 요약과 버튼 위)
  children: ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(submitPayment, initialState);
  const price = formatKrw(amount);
  const canSubmit = mode === "pg" || (mode === "manual" && !waitingDeposit && bankReady);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return; // 제출 중 중복 클릭 방지
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  const submitLabel = pending
    ? "처리하는 중…"
    : mode === "manual"
      ? "입금 확인 요청하기"
      : `${price} 결제하기`;

  // 모드별 주 버튼. large는 요약 칸, 기본은 모바일 하단 바.
  const mainButton = (large: boolean) => {
    const style = { size: large ? ("lg" as const) : undefined, block: large };
    if (mode === "off") {
      return large ? (
        <button type="button" className={buttonClass(style)} disabled>
          {price} 결제하기 (준비 중)
        </button>
      ) : (
        <Link href="/my?notice=requested" className={buttonClass(style)}>
          신청 접수하기
        </Link>
      );
    }
    if (mode === "manual" && waitingDeposit) {
      return (
        <Link href={`/done/${orderId}`} className={buttonClass(style)}>
          접수 내역 보기
        </Link>
      );
    }
    return (
      <button type="submit" form={FORM_ID} className={buttonClass(style)} disabled={pending || !canSubmit}>
        {submitLabel}
      </button>
    );
  };

  return (
    <>
      <section className="wrap apply-body">
        <div className="split">
          <div className="split-main">
            {children}

            <div className="step">
              <div className="step-h">
                <span className="num" aria-hidden="true">
                  4
                </span>
                <div>
                  <h2 className="t3">환불·결제 안내</h2>
                </div>
              </div>
              <ul className="pay-list">
                <li>환불 규정: [확정 후 기재]</li>
                <li>작업이 시작된 뒤의 환불 범위: [확정 후 기재]</li>
                <li>영수증·현금영수증 발급: [확정 후 기재]</li>
              </ul>
              <form id={FORM_ID} action={dispatch} onSubmit={onSubmit} className="pay-form">
                <input type="hidden" name="orderId" value={orderId} />
                {canSubmit && (
                  <label className="check pay-agree">
                    <input type="checkbox" name="agreePay" required />
                    <span>[필수] 주문 내용과 환불 규정을 확인했으며 결제에 동의합니다.</span>
                  </label>
                )}
                {state.error && (
                  <p className="notice notice-error" role="alert">
                    {state.error}
                  </p>
                )}
              </form>
            </div>
          </div>

          <aside className="split-side" aria-label="결제 요약">
            {preview}
            <div className="sum">
              <strong className="sum-title">결제 요약</strong>
              {rows.map((row) => (
                <div key={row.label} className="sum-row">
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
              <div className="total">
                <span className="total-label">결제 금액</span>
                <strong>{price}</strong>
              </div>
              {/* 좁은 화면에서는 아래 고정 바의 버튼을 씁니다. off 모드의 안내 버튼은 좁은 화면에서도 보입니다. */}
              <div className={mode === "off" ? undefined : "hide-m"}>{mainButton(true)}</div>
              {mode === "off" && (
                <>
                  <Link href="/my?notice=requested" className={buttonClass({ variant: "o", block: true })}>
                    신청만 먼저 접수하기
                  </Link>
                  <p className="help">
                    지금은 온라인 결제를 준비하고 있습니다. 신청은 이미 접수됐으며 결제 방법은 따로
                    안내해 드립니다. [안내 방식 확정 후 기재]
                  </p>
                </>
              )}
              {mode === "manual" && waitingDeposit && (
                <p className="help">입금 확인을 요청하셨습니다. 확인되면 내 신청의 상태가 바뀝니다.</p>
              )}
            </div>
          </aside>
        </div>
      </section>

      <MobileBar label="결제 금액" amount={price}>
        {mainButton(false)}
      </MobileBar>
    </>
  );
}
