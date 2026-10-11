"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthFormState,
} from "@/app/login/actions";
import { Button, buttonClass } from "@/components/ui/Button";

const initialState: AuthFormState = {};

function FormNotice({ state }: { state: AuthFormState }) {
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

function EmailField({ id, label = "이메일", help }: { id: string; label?: string; help?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        className="input"
        id={id}
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="example@email.com"
        required
      />
      {help && <p className="help">{help}</p>}
    </div>
  );
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        className="input"
        id={id}
        type="password"
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={autoComplete === "new-password" ? 8 : undefined}
        required
      />
    </div>
  );
}

const requiredConsents = [
  { name: "agreeAge", label: "만 14세 이상입니다", link: false },
  { name: "agreeTerms", label: "이용약관 동의", link: true },
  { name: "agreePrivacy", label: "개인정보 수집·이용 동의", link: true },
] as const;
const optionalConsent = { name: "agreeMarketing", label: "오픈·할인 소식 이메일 받기" } as const;
const consentNames = [...requiredConsents.map((item) => item.name), optionalConsent.name];

// 약관 동의: 전체, 필수 3개, 선택 1개. 동의 시각 저장은 4단계에서 주문 동의와 함께 설계합니다.
function ConsentBox() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const all = consentNames.every((name) => checked[name]);

  const toggle = (name: string, value: boolean) =>
    setChecked((prev) => ({ ...prev, [name]: value }));

  return (
    <fieldset className="consent">
      <legend className="sr-only">약관 동의</legend>
      <label className="check consent-all">
        <input
          type="checkbox"
          checked={all}
          onChange={(event) =>
            setChecked(Object.fromEntries(consentNames.map((name) => [name, event.target.checked])))
          }
        />
        약관 전체 동의
      </label>
      {requiredConsents.map((item) => (
        <label key={item.name} className="check">
          <input
            type="checkbox"
            name={item.name}
            checked={Boolean(checked[item.name])}
            onChange={(event) => toggle(item.name, event.target.checked)}
          />
          <span>
            [필수] {item.label}{" "}
            {/* 약관·처리방침 문서는 아직 없습니다. 확정되면 실제 주소로 연결합니다. */}
            {item.link && <a href="#">보기</a>}
          </span>
        </label>
      ))}
      <label className="check">
        <input
          type="checkbox"
          name={optionalConsent.name}
          checked={Boolean(checked[optionalConsent.name])}
          onChange={(event) => toggle(optionalConsent.name, event.target.checked)}
        />
        <span>[선택] {optionalConsent.label}</span>
      </label>
    </fieldset>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initialState);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <EmailField id="l-email" />
      <PasswordField id="l-pw" name="password" label="비밀번호" autoComplete="current-password" />
      <FormNotice state={state} />
      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </Button>
      <Link href="/login?mode=reset" className={buttonClass({ variant: "g", block: true })}>
        비밀번호를 잊으셨나요?
      </Link>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUp, initialState);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <EmailField id="s-email" help="인증 메일과 결과 안내를 받을 주소입니다." />
      <PasswordField
        id="s-pw"
        name="password"
        label="비밀번호"
        autoComplete="new-password"
        placeholder="영문·숫자 포함 8자 이상"
      />
      <PasswordField
        id="s-pw2"
        name="passwordConfirm"
        label="비밀번호 확인"
        autoComplete="new-password"
        placeholder="한 번 더 입력해 주세요"
      />
      <ConsentBox />
      <FormNotice state={state} />
      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "가입 처리 중…" : "가입하고 인증 메일 받기"}
      </Button>
      <p className="help auth-center">
        메일의 인증 버튼을 누르면 가입이 끝납니다. 메일이 안 보이면 스팸함을 확인해 주세요.
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <form action={action} className="auth-form">
      <p className="auth-text">
        가입한 이메일을 넣으시면 비밀번호를 새로 정하는 링크를 보내 드립니다.
      </p>
      <EmailField id="r-email" label="가입한 이메일" />
      <FormNotice state={state} />
      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "보내는 중…" : "재설정 메일 보내기"}
      </Button>
      <Link href="/login" className={buttonClass({ variant: "g", block: true })}>
        로그인으로 돌아가기
      </Link>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return (
    <form action={action} className="auth-form">
      <PasswordField
        id="u-pw"
        name="password"
        label="새 비밀번호"
        autoComplete="new-password"
        placeholder="영문·숫자 포함 8자 이상"
      />
      <PasswordField
        id="u-pw2"
        name="passwordConfirm"
        label="새 비밀번호 확인"
        autoComplete="new-password"
        placeholder="한 번 더 입력해 주세요"
      />
      <FormNotice state={state} />
      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "변경 중…" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
