"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { showToday, type TodayState } from "@/app/actions";
import { PREORDER_FORM_ID } from "@/components/report/ids";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { TodayView } from "@/lib/today/today";

type Errors = { birth?: string; time?: string };

const initialState: TodayState = {};

// 숫자 키패드에는 '-'와 ':'가 없어서, 숫자만 받고 구분 기호를 자동으로 넣습니다.
function formatBirth(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join("-");
}

function formatTime(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return [digits.slice(0, 2), digits.slice(2, 4)].filter(Boolean).join(":");
}

// 화면에서는 형식만 봅니다. 달력에 있는 날짜인지(음력 2월 30일 등 포함)는 서버가 확인합니다.
function validateBirth(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "생년월일 8자리를 입력해 주세요. 예: 1972-03-15";
  return undefined;
}

// 태어난 시각은 선택 입력입니다. 넣었을 때만 형식을 확인합니다.
function validateTime(value: string) {
  if (!value) return undefined;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return "태어난 시각 4자리를 24시간 기준으로 입력해 주세요. 예: 14:30";
  }
  return undefined;
}

// 길 80%·좋음, 중 60%·보통, 흉 35%·조심
const toneView = {
  길: { percent: 80, text: "좋음" },
  중: { percent: 60, text: "보통" },
  흉: { percent: 35, text: "조심" },
} as const;

function dateLabel(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일`;
}

function koreanDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

// 결과 카드. 메인 예시 카드(.sample)와 같은 모양입니다.
export function TodayResultCard({ view, mine }: { view: TodayView; mine?: boolean }) {
  return (
    <div className="card sample today-result" role="region" aria-label="오늘의 사업운 결과">
      <div className="sample-head">
        <strong>{mine ? "내 사주로 본 오늘의 사업운" : "오늘의 사업운"}</strong>
        <Badge>
          {dateLabel(view.date)} · {view.iljin}일
        </Badge>
      </div>
      <div className="sample-today">
        <div className="sample-tarot" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 48 48">
            <path
              d="M24 5 L28.4 18.6 L43 19 L31.3 27.6 L35.6 41.5 L24 33.3 L12.4 41.5 L16.7 27.6 L5 19 L19.6 18.6 Z"
              fill="none"
              stroke="#FFD84D"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="sample-text">
          <div className="muted small">오늘의 한마디</div>
          <p>{view.oneLiner}</p>
        </div>
      </div>
      <div className="sample-scores">
        {view.fields.map((field) => (
          <div key={field.field} className="score">
            <span className="score-label">{field.field}</span>
            <div className="score-bar" aria-hidden="true">
              <div style={{ width: `${toneView[field.tone].percent}%` }} />
            </div>
            <span className="score-text muted">{toneView[field.tone].text}</span>
          </div>
        ))}
      </div>
      <dl className="today-lines">
        {view.fields.map((field) => (
          <div key={field.field}>
            <dt>{field.field}</dt>
            <dd>{field.text}</dd>
          </div>
        ))}
      </dl>
      <p className="muted small">
        내 일주 {view.dayPillar}와 오늘 일진 {view.iljin}의 관계({view.relation})로 본 풀이입니다. 전통 명리 원리에
        따른 참고용 자료이며 투자·법률·의료 판단을 대신하지 않습니다.
      </p>
      <ButtonLink href={`/report/2027#${PREORDER_FORM_ID}`} variant="y" block>
        2027 신년 리포트 사전신청
      </ButtonLink>
    </div>
  );
}

// 메인의 "내 사주로 오늘의 사업운 보기". saved가 있으면(로그인 + 저장된 내 사주) 입력 없이 결과부터 보여 줍니다.
export function TodayForm({ saved }: { saved?: TodayView | null }) {
  const [state, dispatch, pending] = useActionState(showToday, initialState);
  const [birth, setBirth] = useState("");
  const [calendar, setCalendar] = useState("solar");
  const [time, setTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [useOther, setUseOther] = useState(false);
  const birthRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  // 서버가 돌려준 생년월일 오류(음력에 없는 날짜, 양력으로 바꿔 넣기 안내 등)
  const serverBirthError = state.field === "birth" ? state.error : undefined;
  const serverTimeError = state.field === "time" ? state.error : undefined;
  const birthError = errors.birth ?? serverBirthError;
  const timeError = errors.time ?? serverTimeError;
  const formNotice = state.error && !state.field ? state.error : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Errors = {
      birth: validateBirth(birth),
      time: timeUnknown ? undefined : validateTime(time),
    };
    setErrors(next);
    // 키보드가 올라와 있어도 오류가 보이도록 첫 오류 입력으로 포커스를 옮깁니다.
    if (next.birth) return birthRef.current?.focus();
    if (next.time) return timeRef.current?.focus();
    if (pending) return;
    // 입력값은 계산에만 쓰고 저장하지 않습니다. 오류가 나도 입력이 지워지지 않게 자동 초기화 없이 보냅니다.
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  const convertToSolar = () => {
    if (!state.lunar) return;
    setBirth(state.lunar.solarDate);
    setCalendar("solar");
    setErrors({});
  };

  if (saved && !useOther && !state.result) {
    return (
      <div className="today-out">
        <TodayResultCard view={saved} mine />
        <Button type="button" variant="g" onClick={() => setUseOther(true)}>
          다른 생년월일로 보기
        </Button>
      </div>
    );
  }

  return (
    <div className="today-out">
      <form className="today-form" onSubmit={handleSubmit} noValidate>
        <div className="grid-form today-fields">
          <div className="field">
            <label htmlFor="m-birth">생년월일</label>
            <input
              ref={birthRef}
              className="input"
              id="m-birth"
              name="birth"
              type="text"
              inputMode="numeric"
              placeholder="예: 1972-03-15"
              autoComplete="bday"
              maxLength={10}
              value={birth}
              onChange={(event) => {
                setBirth(formatBirth(event.target.value));
                setErrors((prev) => ({ ...prev, birth: undefined }));
              }}
              aria-invalid={Boolean(birthError)}
              aria-describedby={birthError ? "m-birth-error" : undefined}
            />
            {birthError && (
              <div className="saju-lunar">
                <p id="m-birth-error" className="field-error" role="alert">
                  {birthError}
                </p>
                {!errors.birth && state.lunar && birth !== state.lunar.solarDate && (
                  <button type="button" className="btn btn-o btn-sm" onClick={convertToSolar}>
                    양력으로 바꿔 넣기
                  </button>
                )}
              </div>
            )}
            {state.lunar && birth === state.lunar.solarDate && calendar === "solar" && (
              <p className="notice notice-ok saju-lunar" role="status">
                생년월일을 양력 {koreanDate(state.lunar.solarDate)}로 바꿔 넣었습니다. 다시 눌러 보세요.
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="m-cal">양력·음력</label>
            <select
              className="input"
              id="m-cal"
              name="calendar"
              value={calendar}
              onChange={(event) => setCalendar(event.target.value)}
            >
              <option value="solar">양력</option>
              <option value="lunar">음력</option>
              <option value="lunar_leap">음력(윤달)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="m-time">
              태어난 시각 <span className="opt">(선택)</span>
            </label>
            <input
              ref={timeRef}
              className="input"
              id="m-time"
              name="time"
              type="text"
              inputMode="numeric"
              placeholder="예: 14:30"
              maxLength={5}
              value={time}
              onChange={(event) => {
                setTime(formatTime(event.target.value));
                setErrors((prev) => ({ ...prev, time: undefined }));
              }}
              disabled={timeUnknown}
              aria-invalid={Boolean(timeError)}
              aria-describedby={timeError ? "m-time-error" : undefined}
            />
            {timeError && (
              <p id="m-time-error" className="field-error" role="alert">
                {timeError}
              </p>
            )}
          </div>
          <Button type="submit" className="today-submit" disabled={pending}>
            {pending ? "계산하는 중…" : "오늘의 사업운 보기"}
          </Button>
        </div>

        {formNotice && (
          <p className="notice notice-error" role="alert">
            {formNotice}
          </p>
        )}

        <div className="today-foot">
          <label className="check">
            <input
              type="checkbox"
              name="timeUnknown"
              checked={timeUnknown}
              onChange={(event) => {
                setTimeUnknown(event.target.checked);
                if (event.target.checked) setTime("");
                setErrors((prev) => ({ ...prev, time: undefined }));
              }}
            />
            태어난 시각을 몰라요
          </label>
          <span className="muted small">
            입력한 생년월일은 풀이에만 쓰고 저장하지 않습니다. 가입하고 내 사주를 저장하면 매일 바로 볼 수 있습니다.
          </span>
        </div>
      </form>

      {state.result && <TodayResultCard view={state.result} />}
    </div>
  );
}
