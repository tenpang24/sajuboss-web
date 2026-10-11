"use client";

import { useState } from "react";
import { CALENDARS, GENDERS, calendarNames, genderNames } from "@/lib/validation";

// 숫자 키패드에는 '-'와 ':'가 없어서, 숫자만 받고 구분 기호를 자동으로 넣습니다.
export function formatBirth(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join("-");
}

export function formatTime(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return [digits.slice(0, 2), digits.slice(2, 4)].filter(Boolean).join(":");
}

export type SajuDefaults = {
  birth?: string;
  calendar?: string;
  time?: string | null;
  timeUnknown?: boolean;
  gender?: string;
};

// 사주 입력 묶음(생년월일, 양력·음력, 태어난 시각, 성별). 폼 안에 넣어 쓰고,
// 서버에서는 lib/saju.ts의 readSajuForm이 같은 name으로 읽어 다시 검증합니다.
export function SajuFields({
  idPrefix,
  defaults,
  withLabel,
}: {
  idPrefix: string;
  defaults?: SajuDefaults;
  withLabel?: boolean; // 누구의 사주인지 적는 칸(다른 사람 사주 입력용)
}) {
  const [birth, setBirth] = useState(defaults?.birth ?? "");
  const [time, setTime] = useState(defaults?.time ?? "");
  const [timeUnknown, setTimeUnknown] = useState(defaults?.timeUnknown ?? false);

  return (
    <div className="saju-fields">
      <div className="grid-form">
        {withLabel && (
          <div className="field">
            <label htmlFor={`${idPrefix}-label`}>
              누구의 사주인가요 <span className="opt">(선택)</span>
            </label>
            <input
              className="input"
              id={`${idPrefix}-label`}
              name="label"
              type="text"
              maxLength={40}
              placeholder="예: 동업자, 배우자"
            />
          </div>
        )}
        <div className="field">
          <label htmlFor={`${idPrefix}-birth`}>생년월일</label>
          <input
            className="input"
            id={`${idPrefix}-birth`}
            name="birth"
            type="text"
            inputMode="numeric"
            placeholder="예: 1972-03-15"
            maxLength={10}
            value={birth}
            onChange={(event) => setBirth(formatBirth(event.target.value))}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-cal`}>양력·음력</label>
          <select
            className="input"
            id={`${idPrefix}-cal`}
            name="calendar"
            defaultValue={defaults?.calendar ?? "solar"}
          >
            {CALENDARS.map((value) => (
              <option key={value} value={value}>
                {calendarNames[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-time`}>
            태어난 시각 <span className="opt">(선택)</span>
          </label>
          <input
            className="input"
            id={`${idPrefix}-time`}
            name="time"
            type="text"
            inputMode="numeric"
            placeholder="예: 14:30"
            maxLength={5}
            value={time}
            // 시각을 입력하면 "몰라요" 체크가 풀리고, 체크하면 입력한 시각이 지워집니다.
            onChange={(event) => {
              setTime(formatTime(event.target.value));
              if (event.target.value) setTimeUnknown(false);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-gender`}>성별</label>
          <select
            className="input"
            id={`${idPrefix}-gender`}
            name="gender"
            defaultValue={defaults?.gender ?? "female"}
          >
            {GENDERS.map((value) => (
              <option key={value} value={value}>
                {genderNames[value]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="check">
        <input
          type="checkbox"
          name="timeUnknown"
          checked={timeUnknown}
          onChange={(event) => {
            setTimeUnknown(event.target.checked);
            if (event.target.checked) setTime("");
          }}
        />
        태어난 시각을 몰라요
      </label>
    </div>
  );
}
