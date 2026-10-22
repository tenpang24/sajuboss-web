"use client";

import { useActionState } from "react";
import { openReport, type OpenReportState } from "@/app/my/orders/[orderId]/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const initialState: OpenReportState = {};

// 처음 열기 전 안내. "리포트 열기"를 누르면 처음 열어 본 시각이 기록되고 내용이 보입니다.
export function ReportGate({ orderId, orderNo }: { orderId: string; orderNo: string }) {
  const [state, action, pending] = useActionState(openReport, initialState);
  return (
    <Card className="rv-gate">
      <span className="muted small">신청 번호 {orderNo}</span>
      <strong className="rv-gate-title">2027 신년 사업운 월별 리포트가 준비됐습니다</strong>
      <p>리포트를 열면 환불이 제한됩니다(환불 정책 참고). 열어 보시겠어요?</p>
      <p className="muted small">환불 정책 [확정 후 기재]</p>
      <form action={action} className="rv-gate-actions">
        <input type="hidden" name="orderId" value={orderId} />
        <Button type="submit" disabled={pending}>
          {pending ? "여는 중…" : "리포트 열기"}
        </Button>
        <ButtonLink href="/my" variant="g">
          내 신청으로
        </ButtonLink>
      </form>
      {state.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
    </Card>
  );
}
