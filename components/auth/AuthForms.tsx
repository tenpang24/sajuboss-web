"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthFormState,
} from "@/app/login/actions";
import { Button } from "@/components/ui/Button";

const initialState: AuthFormState = {};

function FormNotice({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <p className="form-notice form-notice--error" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p className="form-notice form-notice--ok" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

function EmailField() {
  return (
    <label className="field">
      <span className="field__label">이메일</span>
      <input
        className="field__input"
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
      />
    </label>
  );
}

function PasswordField({
  name,
  label,
  autoComplete,
  hint,
}: {
  name: string;
  label: string;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="password"
        name={name}
        autoComplete={autoComplete}
        minLength={autoComplete === "new-password" ? 8 : undefined}
        required
      />
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initialState);
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      <EmailField />
      <PasswordField name="password" label="비밀번호" autoComplete="current-password" />
      <FormNotice state={state} />
      <Button type="submit" disabled={pending} block>
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUp, initialState);
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      <EmailField />
      <PasswordField
        name="password"
        label="비밀번호"
        autoComplete="new-password"
        hint="8자 이상"
      />
      <PasswordField name="passwordConfirm" label="비밀번호 확인" autoComplete="new-password" />
      <FormNotice state={state} />
      <Button type="submit" disabled={pending} block>
        {pending ? "가입 처리 중…" : "무료 회원가입"}
      </Button>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <form action={action} className="form">
      <EmailField />
      <FormNotice state={state} />
      <Button type="submit" disabled={pending} block>
        {pending ? "보내는 중…" : "재설정 메일 받기"}
      </Button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return (
    <form action={action} className="form">
      <PasswordField
        name="password"
        label="새 비밀번호"
        autoComplete="new-password"
        hint="8자 이상"
      />
      <PasswordField name="passwordConfirm" label="새 비밀번호 확인" autoComplete="new-password" />
      <FormNotice state={state} />
      <Button type="submit" disabled={pending} block>
        {pending ? "변경 중…" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
