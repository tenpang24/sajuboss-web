"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

type Errors = { birth?: string; time?: string };

// 숫자 키패드에는 '-'와 ':'가 없어서, 숫자만 받고 구분 기호를 자동으로 넣습니다.
function formatBirth(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join("-");
}

function formatTime(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return [digits.slice(0, 2), digits.slice(2, 4)].filter(Boolean).join(":");
}

function validateBirth(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "생년월일 8자리를 입력해 주세요. 예: 1972-03-15";
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real) return "달력에 없는 날짜입니다. 다시 확인해 주세요.";
  if (year < 1900 || date.getTime() > Date.now()) return "생년월일을 다시 확인해 주세요.";
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

export function TodayForm() {
  const [birth, setBirth] = useState("");
  const [time, setTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [checked, setChecked] = useState(false);
  const birthRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Errors = {
      birth: validateBirth(birth),
      time: timeUnknown ? undefined : validateTime(time),
    };
    setErrors(next);
    // 실제 사주 계산과 풀이 표시는 8단계에서 연결합니다. 입력값은 저장하거나 기록하지 않습니다.
    setChecked(!next.birth && !next.time);
    // 키보드가 올라와 있어도 오류가 보이도록 첫 오류 입력으로 포커스를 옮깁니다.
    if (next.birth) birthRef.current?.focus();
    else if (next.time) timeRef.current?.focus();
  }

  return (
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
            onChange={(event) => setBirth(formatBirth(event.target.value))}
            aria-invalid={Boolean(errors.birth)}
            aria-describedby={errors.birth ? "m-birth-error" : undefined}
          />
          {errors.birth && (
            <p id="m-birth-error" className="field-error" role="alert">
              {errors.birth}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="m-cal">양력·음력</label>
          <select className="input" id="m-cal" name="calendar" defaultValue="solar">
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
            onChange={(event) => setTime(formatTime(event.target.value))}
            disabled={timeUnknown}
            aria-invalid={Boolean(errors.time)}
            aria-describedby={errors.time ? "m-time-error" : undefined}
          />
          {errors.time && (
            <p id="m-time-error" className="field-error" role="alert">
              {errors.time}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="m-sex">성별</label>
          <select className="input" id="m-sex" name="sex" defaultValue="female">
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </div>
        <Button type="submit" className="today-submit">
          오늘의 사업운 보기
        </Button>
      </div>

      {checked && (
        <p className="notice notice-ok" role="status">
          입력을 확인했습니다. 내 사주로 보는 오늘의 사업운은 준비 중입니다.
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
              setErrors((prev) => ({ ...prev, time: undefined }));
            }}
          />
          태어난 시각을 몰라요
        </label>
        <span className="muted small">
          입력한 정보는 풀이에만 쓰고, 가입하면 저장해서 매일 바로 볼 수 있습니다.
        </span>
      </div>
    </form>
  );
}
