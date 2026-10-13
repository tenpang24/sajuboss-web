"use client";

import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";
import {
  changeStatusAction,
  confirmPaymentAction,
  refundAction,
  saveNoteAction,
  type AdminFormState,
} from "@/app/admin/orders/actions";
import { Button } from "@/components/ui/Button";

const initialState: AdminFormState = {};

type Action = (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;

function Notice({ state }: { state: AdminFormState }) {
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

// 버튼을 누르면 확인 문구가 펼쳐지고, 한 번 더 눌러야 처리됩니다.
// check를 주면 그 체크박스를 체크해야 제출됩니다(서버도 같은 값을 확인합니다).
function GuardedAction({
  action,
  orderId,
  label,
  submitLabel,
  title,
  check,
  danger,
  fields,
  children,
}: {
  action: Action;
  orderId: string;
  label: string;
  submitLabel: string;
  title: string;
  check?: string;
  danger?: boolean;
  fields?: Record<string, string>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, dispatch, pending] = useActionState(async (prev: AdminFormState, formData: FormData) => {
    const result = await action(prev, formData);
    setOpen(false);
    return result;
  }, initialState);

  return (
    <div className="admin-action">
      {!open && (
        <Button type="button" variant={danger ? "g" : "p"} block onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}
      {open && (
        <form action={dispatch} className="my-confirm" role="alertdialog" aria-label={title}>
          <input type="hidden" name="orderId" value={orderId} />
          {Object.entries(fields ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <strong>{title}</strong>
          {children}
          {check && (
            <label className="check">
              <input type="checkbox" name="confirmed" required />
              <span>{check}</span>
            </label>
          )}
          <div className="my-actions">
            <Button type="submit" variant={danger ? "danger" : "p"} size="sm" disabled={pending}>
              {pending ? "처리하는 중…" : submitLabel}
            </Button>
            <Button type="button" variant="g" size="sm" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </div>
        </form>
      )}
      <Notice state={state} />
    </div>
  );
}

// 수동 입금 확인. 금액은 화면에 보여 주기만 하고 폼으로 보내지 않습니다.
export function ConfirmPaymentControl({
  orderId,
  orderNo,
  amount,
}: {
  orderId: string;
  orderNo: string;
  amount: string;
}) {
  return (
    <GuardedAction
      action={confirmPaymentAction}
      orderId={orderId}
      label="입금 확인"
      submitLabel="입금 확인 처리"
      title="입금 확인"
      check="주문 금액 전액이 입금된 것을 확인했습니다."
    >
      <p>
        신청 번호 {orderNo}, 주문 금액 <strong>{amount}</strong>. 통장에서 이 금액이 전부 들어왔는지
        확인한 뒤 처리해 주세요. 일부만 입금됐다면 처리하지 말고 메모로 남겨 주세요.
      </p>
    </GuardedAction>
  );
}

// 환불 기록(전액). 돈을 움직이지 않고 기록만 바꿉니다.
export function RefundControl({
  orderId,
  orderNo,
  amount,
}: {
  orderId: string;
  orderNo: string;
  amount: string;
}) {
  return (
    <GuardedAction
      action={refundAction}
      orderId={orderId}
      label="환불로 기록"
      submitLabel="환불로 기록"
      title="환불 기록"
      check="환불 금액을 실제로 돌려주었습니다."
      danger
    >
      <p>
        신청 번호 {orderNo}, 환불 금액 <strong>{amount}</strong>(전액). 이 버튼은 돈을 보내지 않고
        기록만 바꿉니다. 먼저 고객에게 실제로 환불한 뒤 처리해 주세요. 환불로 기록하면 되돌릴 수
        없습니다.
      </p>
    </GuardedAction>
  );
}

// 상태 변경 버튼 하나. from은 화면을 열었을 때의 상태이고, 그 사이 상태가 바뀌었으면 서버가 거부합니다.
export function StatusMoveControl({
  orderId,
  from,
  to,
  label,
  note,
  danger,
}: {
  orderId: string;
  from: string;
  to: string;
  label: string;
  note: string;
  danger?: boolean;
}) {
  return (
    <GuardedAction
      action={changeStatusAction}
      orderId={orderId}
      label={label}
      submitLabel={label}
      title="상태 변경"
      fields={{ from, to }}
      danger={danger}
    >
      <p>{note}</p>
    </GuardedAction>
  );
}

// 내부 메모. 사용자에게 보이지 않습니다.
// savedAt: 마지막으로 메모를 저장한 시각(처리 기록에서 읽은 값). 저장하면 화면이 새로 그려져 이 값이 바뀝니다.
export function NoteForm({
  orderId,
  note,
  max,
  savedAt,
}: {
  orderId: string;
  note: string;
  max: number;
  savedAt: string | null;
}) {
  const [state, dispatch, pending] = useActionState(saveNoteAction, initialState);
  // 저장에 실패해도 적던 메모가 지워지지 않게, 폼 초기화가 따라오지 않는 방식으로 제출합니다.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return (
    <form action={dispatch} onSubmit={onSubmit} className="admin-note">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="field">
        <label htmlFor="admin-note">내부 메모</label>
        <textarea className="input" id="admin-note" name="note" defaultValue={note} maxLength={max} rows={5} />
        <p className="help">신청자에게 보이지 않습니다. {max.toLocaleString("ko-KR")}자 이하.</p>
        {savedAt && (
          <p className="help" role="status">
            마지막 저장: {savedAt}
          </p>
        )}
      </div>
      <Button type="submit" variant="o" size="sm" disabled={pending}>
        {pending ? "저장하는 중…" : "메모 저장"}
      </Button>
      <Notice state={state} />
    </form>
  );
}
