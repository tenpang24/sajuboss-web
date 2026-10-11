"use client";

import { useState, type FormEvent } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { PREORDER_FORM_ID } from "./ids";

export function PreorderForm() {
  const [notice, setNotice] = useState(false);

  // 4단계에서 주문 저장 서버 액션으로 교체합니다(로그인 확인 → orders 저장 → /done/[id] 이동).
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(true);
  }

  return (
    <form id={PREORDER_FORM_ID} className="card preorder" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="d-who">풀이할 사주</label>
        <select className="input" id="d-who" name="target" defaultValue="self">
          <option value="self">내 사주 (저장된 정보)</option>
          <option value="other">다른 사람 사주 입력</option>
        </select>
      </div>
      {notice && (
        <p className="notice notice-ok" role="status">
          사전신청 접수는 준비 중입니다. 곧 열어 드리겠습니다.
        </p>
      )}
      <Button type="submit" size="lg" block>
        사전신청하기
      </Button>
      <a href="#preview" className={buttonClass({ variant: "g", block: true })}>
        미리보기 먼저 보기
      </a>
      <p className="help">
        사전신청은 결제가 아닙니다. 12월 1일 오픈하면 이메일로 알려 드립니다.
      </p>
    </form>
  );
}
