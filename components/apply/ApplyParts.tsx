"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { SajuFields } from "@/components/saju/SajuFields";
import { buttonClass } from "@/components/ui/Button";
import { MobileBar } from "@/components/ui/MobileBar";
import { APPLY_CLOSED_MESSAGE, LIMITS, type ApplyState } from "@/lib/apply/options";
import { formatKrw } from "@/lib/pricing";
import { packageNames, type Package } from "@/lib/products";
import { calendarNames, genderNames, type Calendar, type Gender } from "@/lib/validation";

// 신청 폼 3종(개업택일, 상호·브랜드 작명, 개인·개명 작명)이 함께 쓰는 화면 조각.

// 폼을 보는 사람의 상태. 서버(app/apply/*/page.tsx)가 세션에서 확인해 넘겨줍니다.
export type ApplyViewer = {
  open: boolean; // 접수 스위치(lib/products.ts의 APPLY_FORMS_OPEN)
  loggedIn: boolean;
  email: string | null;
  saju: {
    birth_date: string;
    calendar: Calendar;
    birth_time: string | null;
    gender: Gender;
  } | null;
  today: string; // 한국 시각 기준 오늘(YYYY-MM-DD)
};

type Action = (prev: ApplyState, formData: FormData) => Promise<ApplyState>;

// 서버 액션 연결. 오류가 나도 입력한 내용이 지워지지 않게 직접 제출하고,
// 오류가 난 칸(없으면 오류 문구)으로 초점을 옮깁니다.
export function useApplyForm(action: Action) {
  const [state, dispatch, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return; // 제출 중 중복 클릭 방지
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  // 오류가 난 칸 아래에 문구가 보이면 그 칸으로, 아니면 폼 맨 아래 문구로 초점을 옮깁니다.
  // (칸 아래에 이미 보인 오류는 맨 아래에서 한 번 더 읽어 주지 않도록 숨깁니다.)
  useLayoutEffect(() => {
    const form = formRef.current;
    const notice = noticeRef.current;
    if (!state.error || !form) return;
    const shownAtField = Boolean(form.querySelector(".field-error"));
    if (notice) notice.hidden = shownAtField;

    const found = state.field ? form.elements.namedItem(state.field) : null;
    const candidates = found instanceof RadioNodeList ? [...found] : [found];
    const target = candidates.find(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el.getAttribute("type") !== "hidden" && el.offsetParent !== null,
    );
    const focusOn = shownAtField && target ? target : notice;
    focusOn?.focus({ preventScroll: true });
    focusOn?.scrollIntoView({ block: "center" });
  }, [state]);

  return {
    state,
    pending,
    formProps: { ref: formRef, action: dispatch, onSubmit },
    // 특정 입력의 오류 문구(그 칸 아래에 보여 줍니다)
    errorOf: (name: string) => (state.field === name ? state.error : undefined),
    // 폼 맨 아래 오류 문구. 어느 칸에도 속하지 않는 오류(제출 제한, 약관 동의 등)가 여기에 보입니다.
    formError: state.error ? (
      <p className="notice notice-error" role="alert" tabIndex={-1} ref={noticeRef}>
        {state.error} {state.needsConsent && <Link href="/my">내 신청으로 가기</Link>}
      </p>
    ) : null,
  };
}

export function Step({
  num,
  title,
  help,
  children,
}: {
  num: number;
  title: ReactNode;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="step">
      <div className="step-h">
        <span className="num" aria-hidden="true">
          {num}
        </span>
        <div>
          <h2 className="t3">{title}</h2>
          {help && <p className="help step-help">{help}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldShell({
  id,
  label,
  opt,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  opt?: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {opt && <span className="opt">({opt})</span>}
      </label>
      {children}
      {help && <p className="help">{help}</p>}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { id: string; label: string; opt?: string; help?: string; error?: string };
const invalidProps = (id: string, error?: string) =>
  error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};

export function TextField({
  id,
  label,
  opt,
  help,
  error,
  maxLength = LIMITS.line,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell id={id} label={label} opt={opt} help={help} error={error}>
      <input
        className="input"
        id={id}
        type="text"
        maxLength={maxLength}
        {...invalidProps(id, error)}
        {...rest}
      />
    </FieldShell>
  );
}

export function AreaField({
  id,
  label,
  opt,
  help,
  error,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell id={id} label={label} opt={opt} help={help} error={error}>
      <textarea
        className="input"
        id={id}
        maxLength={LIMITS.long}
        {...invalidProps(id, error)}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  opt,
  help,
  error,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell id={id} label={label} opt={opt} help={help} error={error}>
      <select className="input" id={id} {...invalidProps(id, error)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

type Option<T extends string> = { value: T; label: string };

export function toOptions<T extends string>(values: readonly T[], names: Record<T, string>) {
  return values.map((value) => ({ value, label: names[value] }));
}

// 하나만 고르는 칩(라디오)
export function ChipRadio<T extends string>({
  id,
  name,
  label,
  opt,
  options,
  value,
  onChange,
  error,
}: {
  id: string;
  name: string;
  label: string;
  opt?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <div className="field">
      <span className="lbl" id={`${id}-label`}>
        {label} {opt && <span className="opt">({opt})</span>}
      </span>
      <div className="chips" role="radiogroup" aria-labelledby={`${id}-label`}>
        {options.map((option) => (
          <label key={option.value} className={option.value === value ? "chip on" : "chip"}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// 여러 개 고르는 칩(체크박스)
export function ChipChecks<T extends string>({
  id,
  name,
  label,
  opt,
  options,
  defaults = [],
}: {
  id: string;
  name: string;
  label: string;
  opt?: string;
  options: Option<T>[];
  defaults?: T[];
}) {
  const [picked, setPicked] = useState<T[]>(defaults);
  return (
    <div className="field">
      <span className="lbl" id={`${id}-label`}>
        {label} {opt && <span className="opt">({opt})</span>}
      </span>
      <div className="chips" role="group" aria-labelledby={`${id}-label`}>
        {options.map((option) => {
          const on = picked.includes(option.value);
          return (
            <label key={option.value} className={on ? "chip on" : "chip"}>
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={on}
                onChange={(event) =>
                  setPicked((prev) =>
                    event.target.checked
                      ? [...prev, option.value]
                      : prev.filter((item) => item !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// 패키지 선택(기본/상세). 금액은 lib/pricing.ts에서 읽은 값을 받습니다.
export function PackagePicker({
  value,
  onChange,
  prices,
  descriptions,
}: {
  value: Package;
  onChange: (value: Package) => void;
  prices: Record<Package, number>;
  descriptions: Record<Package, string>;
}) {
  return (
    <div className="grid-form" role="radiogroup" aria-label="패키지 선택">
      {(["basic", "detail"] as const).map((pkg) => (
        <label key={pkg} className={pkg === value ? "pkg on" : "pkg"}>
          <input
            className="sr-only"
            type="radio"
            name="package"
            value={pkg}
            checked={pkg === value}
            onChange={() => onChange(pkg)}
          />
          <span className="pkg-title">
            {packageNames[pkg]} · {formatKrw(prices[pkg])}
          </span>
          <span className="muted pkg-desc">{descriptions[pkg]}</span>
        </label>
      ))}
    </div>
  );
}

function formatBirthDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

// 대표자(또는 이름 받을 분) 사주: 저장된 내 사주를 쓰거나 직접 입력합니다.
// 저장된 내 사주를 고르면 서버가 DB에서 읽어 신청 내용에 복사합니다(화면의 값은 보내지 않습니다).
export function SajuSource({
  form,
  viewer,
  allowSelf = true,
  allowUnknownGender = false,
  errorOf,
  fieldError,
  birthLabel,
  birthPlaceholder,
  timePlaceholder,
  unknownNote,
}: {
  form: string;
  viewer: ApplyViewer;
  allowSelf?: boolean;
  allowUnknownGender?: boolean;
  errorOf: (name: string) => string | undefined;
  fieldError: { error?: string; field?: string };
  birthLabel?: string;
  birthPlaceholder?: string;
  timePlaceholder?: string;
  unknownNote?: string;
}) {
  const canUseSaved = Boolean(viewer.saju) && allowSelf;
  const [choice, setChoice] = useState<"self" | "input">("self");
  const source = canUseSaved ? choice : "input";
  const saved = viewer.saju;

  return (
    <>
      {canUseSaved ? (
        <ChipRadio
          id={`${form}-source`}
          name="sajuSource"
          label="사주 정보"
          options={[
            { value: "self", label: "저장된 내 사주 사용" },
            { value: "input", label: "직접 입력" },
          ]}
          value={source}
          onChange={setChoice}
          error={errorOf("sajuSource")}
        />
      ) : (
        <input type="hidden" name="sajuSource" value="input" />
      )}

      {source === "self" && saved ? (
        <div className="card-tint apply-saved">
          <div className="sum-row">
            <span>생년월일</span>
            <span>
              {formatBirthDate(saved.birth_date)} ({calendarNames[saved.calendar]})
            </span>
          </div>
          <div className="sum-row">
            <span>태어난 시각</span>
            <span>{saved.birth_time ?? "모름"}</span>
          </div>
          <div className="sum-row">
            <span>성별</span>
            <span>{genderNames[saved.gender]}</span>
          </div>
          <p className="help">
            저장된 내 사주는 <Link href="/my">내 신청</Link>에서 고칠 수 있습니다.
          </p>
        </div>
      ) : (
        <SajuFields
          idPrefix={form}
          birthLabel={birthLabel}
          birthPlaceholder={birthPlaceholder}
          timePlaceholder={timePlaceholder}
          unknownNote={unknownNote}
          allowUnknownGender={allowUnknownGender}
          error={fieldError.error}
          errorField={fieldError.field}
        />
      )}
    </>
  );
}

// 받는 방법: 이메일(비우면 계정 이메일), 휴대폰 번호(선택)
export function ContactFields({
  form,
  viewer,
  errorOf,
}: {
  form: string;
  viewer: ApplyViewer;
  errorOf: (name: string) => string | undefined;
}) {
  return (
    <div className="grid-form">
      <TextField
        id={`${form}-email`}
        name="email"
        label="이메일"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={254}
        placeholder="example@email.com"
        defaultValue={viewer.email ?? ""}
        help="비워 두면 가입한 이메일로 보내 드립니다."
        error={errorOf("email")}
      />
      <TextField
        id={`${form}-phone`}
        name="phone"
        label="휴대폰 번호"
        opt="선택, 알림톡"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={13}
        placeholder="010-0000-0000"
        error={errorOf("phone")}
      />
    </div>
  );
}

// 안내 상자(작명 유의사항 등)
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="card-tint apply-note">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" fill="none" stroke="#0B7A5A" strokeWidth="1.8" />
        <path d="M11 6.5v6M11 15.5v.5" stroke="#0B7A5A" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p>{children}</p>
    </div>
  );
}

// 폼 맨 위 안내: 오픈 전이거나 로그인하지 않은 경우
export function ApplyTopNotice({ viewer, path }: { viewer: ApplyViewer; path: string }) {
  if (!viewer.open) {
    return (
      <p className="notice notice-ok" role="status">
        {APPLY_CLOSED_MESSAGE}
      </p>
    );
  }
  if (!viewer.loggedIn) {
    return (
      <p className="notice notice-ok" role="status">
        로그인한 뒤 신청할 수 있습니다. 입력한 내용은 로그인 화면으로 가면 지워지니 먼저{" "}
        <Link href={`/login?next=${encodeURIComponent(path)}`}>로그인</Link>해 주세요.
      </p>
    );
  }
  return null;
}

// 제출 버튼. 오픈 전에는 "오픈 준비 중", 로그인 전에는 로그인 링크로 바뀝니다.
function SubmitButton({
  viewer,
  path,
  formId,
  pending,
  large,
  className,
}: {
  viewer: ApplyViewer;
  path: string;
  formId: string;
  pending: boolean;
  large?: boolean;
  className?: string;
}) {
  const style = { size: large ? ("lg" as const) : undefined, block: large };
  if (!viewer.open) {
    return (
      <button type="button" className={buttonClass(style, className)} disabled>
        오픈 준비 중
      </button>
    );
  }
  if (!viewer.loggedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(path)}`} className={buttonClass(style, className)}>
        로그인하고 신청하기
      </Link>
    );
  }
  return (
    <button type="submit" form={formId} className={buttonClass(style, className)} disabled={pending}>
      {pending ? "신청하는 중…" : "신청하기"}
    </button>
  );
}

// 신청 요약(옆 칸)과 모바일 하단 고정 바. 금액은 lib/pricing.ts의 orderAmount로 계산한 값을 받습니다.
export function ApplySummary({
  viewer,
  path,
  formId,
  pending,
  rows,
  amount,
}: {
  viewer: ApplyViewer;
  path: string;
  formId: string;
  pending: boolean;
  rows: { label: string; value: string }[];
  amount: number;
}) {
  return (
    <aside className="split-side" aria-label="신청 요약">
      <div className="sum">
        <strong className="sum-title">신청 요약</strong>
        {rows.map((row) => (
          <div key={row.label} className="sum-row">
            <span>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
        <div className="sum-row">
          <span>역술가 검수</span>
          <span>[범위 확정 후 기재]</span>
        </div>
        <div className="sum-row">
          <span>전달 시기</span>
          <span>[확정 후 기재]</span>
        </div>
        <div className="total">
          <span className="total-label">결제 예정 금액</span>
          <strong aria-live="polite">{formatKrw(amount)}</strong>
        </div>
        {/* 좁은 화면에서는 아래 고정 바의 버튼을 씁니다. */}
        <div className="hide-m">
          <SubmitButton viewer={viewer} path={path} formId={formId} pending={pending} large />
        </div>
        <p className="help">결제수단과 환불 규정은 [확정 후 기재]</p>
      </div>
    </aside>
  );
}

export function ApplyMobileBar({
  viewer,
  path,
  formId,
  pending,
  amount,
}: {
  viewer: ApplyViewer;
  path: string;
  formId: string;
  pending: boolean;
  amount: number;
}) {
  return (
    <MobileBar label="결제 예정 금액" amount={formatKrw(amount)}>
      <SubmitButton viewer={viewer} path={path} formId={formId} pending={pending} />
    </MobileBar>
  );
}
