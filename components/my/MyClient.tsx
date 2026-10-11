"use client";

import { useActionState, useState } from "react";
import {
  agreeToTerms,
  deleteMySaju,
  requestMyOrderDeletion,
  saveMySaju,
  type MyFormState,
} from "@/app/my/actions";
import { ConsentBox } from "@/components/auth/AuthForms";
import { SajuFields } from "@/components/saju/SajuFields";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { calendarNames, genderNames, type Calendar, type Gender } from "@/lib/validation";

const initialState: MyFormState = {};

function Notice({ state }: { state: MyFormState }) {
  if (state.error) {
    return (
      <p className="notice notice-error" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p className="notice notice-ok" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

// 가입 때 약관 동의가 기록되지 않은 계정에만 보입니다.
export function ConsentForm() {
  const [state, action, pending] = useActionState(agreeToTerms, initialState);
  return (
    <form action={action} className="my-form">
      <ConsentBox />
      <Notice state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "저장하는 중…" : "동의하고 계속하기"}
      </Button>
    </form>
  );
}

export type SavedSaju = {
  id: string;
  birth_date: string;
  calendar: Calendar;
  birth_time: string | null;
  time_unknown: boolean;
  gender: Gender;
};

function formatBirthDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

// 내 사주 정보: 보기 / 입력·수정 / 삭제 확인
export function SajuPanel({ saju }: { saju: SavedSaju | null }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const [saveState, saveAction, saving] = useActionState(async (prev: MyFormState, formData: FormData) => {
    const result = await saveMySaju(prev, formData);
    if (!result.error) setMode("view");
    return result;
  }, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(
    async (prev: MyFormState, formData: FormData) => {
      const result = await deleteMySaju(prev, formData);
      setMode("view");
      return result;
    },
    initialState,
  );

  const editing = mode === "edit" || !saju;

  return (
    <>
      <div className="my-card-head">
        <strong className="my-card-title">내 사주 정보</strong>
        {saju && <Badge>저장됨</Badge>}
      </div>

      {saju && !editing && (
        <>
          <div className="sum-row">
            <span>생년월일</span>
            <span>
              {formatBirthDate(saju.birth_date)} ({calendarNames[saju.calendar]})
            </span>
          </div>
          <div className="sum-row">
            <span>태어난 시각</span>
            <span>{saju.birth_time ?? "모름"}</span>
          </div>
          <div className="sum-row">
            <span>성별</span>
            <span>{genderNames[saju.gender]}</span>
          </div>
        </>
      )}

      {editing && (
        <form action={saveAction} className="my-form">
          {!saju && <p className="muted">저장해 두면 신청할 때 다시 입력하지 않아도 됩니다.</p>}
          <SajuFields
            key={saju?.id ?? "new"}
            idPrefix="my"
            defaults={
              saju
                ? {
                    birth: saju.birth_date,
                    calendar: saju.calendar,
                    time: saju.birth_time,
                    timeUnknown: saju.time_unknown,
                    gender: saju.gender,
                  }
                : undefined
            }
          />
          {saveState.error && <Notice state={saveState} />}
          <div className="my-actions">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "저장하는 중…" : "저장"}
            </Button>
            {saju && (
              <Button type="button" variant="g" size="sm" onClick={() => setMode("view")}>
                취소
              </Button>
            )}
          </div>
        </form>
      )}

      {saju && mode === "view" && (
        <>
          {saveState.message && <Notice state={saveState} />}
          <div className="my-actions">
            <Button type="button" variant="g" size="sm" onClick={() => setMode("edit")}>
              수정
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={() => setMode("confirm")}>
              삭제
            </Button>
          </div>
        </>
      )}

      {saju && mode === "confirm" && (
        <form action={deleteAction} className="my-confirm" role="alertdialog" aria-label="사주 정보 삭제 확인">
          <input type="hidden" name="sajuId" value={saju.id} />
          <p>저장된 내 사주 정보를 삭제할까요? 삭제하면 되돌릴 수 없습니다.</p>
          <div className="my-actions">
            <Button type="submit" variant="danger" size="sm" disabled={deleting}>
              {deleting ? "삭제하는 중…" : "삭제하기"}
            </Button>
            <Button type="button" variant="g" size="sm" onClick={() => setMode("view")}>
              취소
            </Button>
          </div>
        </form>
      )}

      {!saju && deleteState.message && <Notice state={deleteState} />}
      {deleteState.error && <Notice state={deleteState} />}

      <p className="help">
        삭제하면 저장된 생년월일시가 지워집니다. 이미 접수한 신청의 입력 정보는 신청 목록에서
        신청별로 삭제를 요청할 수 있습니다. 결제된 신청의 보관 기간은 [확정 후 기재]
      </p>
    </>
  );
}

// 신청 삭제 요청: 버튼 → 확인 단계 → 서버 액션
export function OrderDeleteControl({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: MyFormState, formData: FormData) => {
      const result = await requestMyOrderDeletion(prev, formData);
      setConfirming(false);
      return result;
    },
    initialState,
  );

  return (
    <div className="order-delete">
      {!confirming && (
        <Button type="button" variant="g" size="sm" onClick={() => setConfirming(true)}>
          삭제 요청
        </Button>
      )}
      {confirming && (
        <form action={action} className="my-confirm" role="alertdialog" aria-label="신청 삭제 확인">
          <input type="hidden" name="orderId" value={orderId} />
          <p>
            이 신청을 취소하고 입력한 정보(생년월일시, 연락처)를 삭제할까요? 삭제하면 되돌릴 수
            없습니다.
          </p>
          <div className="my-actions">
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              {pending ? "처리하는 중…" : "삭제 요청하기"}
            </Button>
            <Button type="button" variant="g" size="sm" onClick={() => setConfirming(false)}>
              취소
            </Button>
          </div>
        </form>
      )}
      <Notice state={state} />
    </div>
  );
}
