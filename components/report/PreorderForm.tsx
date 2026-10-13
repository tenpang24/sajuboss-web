"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitReportPreorder, type PreorderState } from "@/app/report/2027/actions";
import { OrderConsents } from "@/components/order/OrderConsents";
import { SajuFields } from "@/components/saju/SajuFields";
import { Button, buttonClass } from "@/components/ui/Button";
import { PREORDER_FORM_ID } from "./ids";

const initialState: PreorderState = {};

// 신년 리포트 사전신청(결제 아님). 저장은 서버 액션이 하고, 로그인하지 않았으면 로그인 화면으로 보냅니다.
export function PreorderForm() {
  const [state, action, pending] = useActionState(submitReportPreorder, initialState);
  const [target, setTarget] = useState("self");

  return (
    <form id={PREORDER_FORM_ID} className="card preorder" action={action}>
      <div className="field">
        <label htmlFor="d-who">풀이할 사주</label>
        <select
          className="input"
          id="d-who"
          name="target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          <option value="self">내 사주 (저장된 정보)</option>
          <option value="other">다른 사람 사주 입력</option>
        </select>
      </div>

      {target === "other" && <SajuFields idPrefix="d" withLabel />}

      <OrderConsents
        className="preorder-consents"
        disclaimer="결과는 전통 명리 원리에 따른 참고용 자료이며, 사업 성과를 보장하지 않는다는 점을 확인했습니다."
      />

      {state.error && (
        <p className="notice notice-error" role="alert">
          {state.error}{" "}
          {(state.needsConsent || state.needsSaju) && <Link href="/my">내 신청으로 가기</Link>}
        </p>
      )}

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "신청하는 중…" : "사전신청하기"}
      </Button>
      <a href="#preview" className={buttonClass({ variant: "g", block: true })}>
        미리보기 먼저 보기
      </a>
      <p className="help">
        사전신청은 결제가 아닙니다. 12월 1일 오픈하면 이메일로 알려 드립니다. 로그인한 뒤 신청할 수
        있습니다.
      </p>
    </form>
  );
}
