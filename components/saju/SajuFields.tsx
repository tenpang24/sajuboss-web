"use client";

import { useState } from "react";
import {
  CALENDARS,
  GENDERS,
  GENDER_UNKNOWN,
  calendarNames,
  genderNames,
  genderUnknownName,
  type LunarSuggestion,
} from "@/lib/validation";

// 숫자 키패드에는 '-'와 ':'가 없어서, 숫자만 받고 구분 기호를 자동으로 넣습니다.
export function formatBirth(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join("-");
}

export function formatTime(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return [digits.slice(0, 2), digits.slice(2, 4)].filter(Boolean).join(":");
}

// 2026-03-25 → 2026년 3월 25일
function koreanDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
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
  namePrefix = "",
  withGender = true,
  allowUnknownGender = false,
  birthLabel = "생년월일",
  birthPlaceholder = "예: 1972-03-15",
  timePlaceholder = "예: 14:30",
  unknownNote,
  error,
  errorField,
  lunar,
}: {
  idPrefix: string;
  defaults?: SajuDefaults;
  withLabel?: boolean; // 누구의 사주인지 적는 칸(다른 사람 사주 입력용)
  namePrefix?: string; // 한 폼에 두 벌을 넣을 때 입력 이름 앞에 붙는 말(readSajuForm의 prefix와 같게)
  withGender?: boolean;
  allowUnknownGender?: boolean; // 성별에 "아직 몰라요"를 추가(아기 이름 신청 전용)
  birthLabel?: string;
  birthPlaceholder?: string;
  timePlaceholder?: string;
  unknownNote?: string;
  error?: string; // 서버 검증 오류 문구
  errorField?: string; // 오류가 난 입력의 name
  lunar?: LunarSuggestion; // 음력 2월 29·30일 등을 양력으로 바꿔 넣으라는 서버 안내
}) {
  const [birth, setBirth] = useState(defaults?.birth ?? "");
  // 양력·음력도 상태로 둡니다(서버 오류 뒤 폼이 초기화돼도 고른 값이 남고, "양력으로 바꿔 넣기"로 바꿀 수 있게).
  const [calendar, setCalendar] = useState(defaults?.calendar ?? "solar");
  // "양력으로 바꿔 넣기"를 누른 안내. 날짜나 양력·음력을 다시 고치면 지웁니다.
  const [converted, setConverted] = useState<LunarSuggestion | null>(null);
  const [time, setTime] = useState(defaults?.time ?? "");
  const [timeUnknown, setTimeUnknown] = useState(defaults?.timeUnknown ?? false);

  const name = (key: string) => `${namePrefix}${key}`;
  const errorId = `${idPrefix}-saju-error`;
  const ownsError = Boolean(
    error &&
      errorField &&
      ["birth", "calendar", "time", "gender", "label"].some((key) => name(key) === errorField),
  );
  const invalid = (key: string) =>
    ownsError && errorField === name(key)
      ? ({ "aria-invalid": true, "aria-describedby": errorId } as const)
      : {};
  // 이 입력 묶음의 생년월일에 대한 안내만 받습니다(동업자 칸과 구분).
  const suggestion = lunar && lunar.field === name("birth") ? lunar : null;
  // 바꿔 넣은 뒤 다른 이유로 다시 오류가 나도 원래 입력(숨은 칸)은 날짜를 고치기 전까지 남깁니다.
  const isConverted = converted !== null;
  const convertToSolar = () => {
    if (!suggestion) return;
    setBirth(suggestion.solarDate);
    setCalendar("solar");
    setConverted(suggestion);
  };

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
              name={name("label")}
              type="text"
              maxLength={40}
              placeholder="예: 동업자, 배우자"
              {...invalid("label")}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor={`${idPrefix}-birth`}>{birthLabel}</label>
          <input
            className="input"
            id={`${idPrefix}-birth`}
            name={name("birth")}
            type="text"
            inputMode="numeric"
            placeholder={birthPlaceholder}
            maxLength={10}
            value={birth}
            onChange={(event) => {
              setBirth(formatBirth(event.target.value));
              setConverted(null);
            }}
            required
            {...invalid("birth")}
          />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-cal`}>양력·음력</label>
          <select
            className="input"
            id={`${idPrefix}-cal`}
            name={name("calendar")}
            value={calendar}
            onChange={(event) => {
              setCalendar(event.target.value);
              setConverted(null);
            }}
            {...invalid("calendar")}
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
            name={name("time")}
            type="text"
            inputMode="numeric"
            placeholder={timePlaceholder}
            maxLength={5}
            value={time}
            // 시각을 입력하면 "몰라요" 체크가 풀리고, 체크하면 입력한 시각이 지워집니다.
            onChange={(event) => {
              setTime(formatTime(event.target.value));
              if (event.target.value) setTimeUnknown(false);
            }}
            {...invalid("time")}
          />
        </div>
        {withGender && (
          <div className="field">
            <label htmlFor={`${idPrefix}-gender`}>성별</label>
            <select
              className="input"
              id={`${idPrefix}-gender`}
              name={name("gender")}
              defaultValue={defaults?.gender ?? "female"}
              {...invalid("gender")}
            >
              {GENDERS.map((value) => (
                <option key={value} value={value}>
                  {genderNames[value]}
                </option>
              ))}
              {allowUnknownGender && <option value={GENDER_UNKNOWN}>{genderUnknownName}</option>}
            </select>
            {allowUnknownGender && (
              <p className="help">
                아직 모르면 &lsquo;{genderUnknownName}&rsquo;를 골라 주세요. 태어난 뒤 알게 되시면 이름을
                정할 때 알려 주세요.
              </p>
            )}
          </div>
        )}
      </div>
      <label className="check">
        <input
          type="checkbox"
          name={name("timeUnknown")}
          checked={timeUnknown}
          onChange={(event) => {
            setTimeUnknown(event.target.checked);
            if (event.target.checked) setTime("");
          }}
        />
        <span>
          태어난 시각을 몰라요{unknownNote && <span className="muted small"> {unknownNote}</span>}
        </span>
      </label>
      {isConverted && converted && (
        <>
          <input
            type="hidden"
            name={name("originalLunar")}
            value={`${converted.original.calendar}:${converted.original.date}`}
          />
          <p className="notice notice-ok saju-lunar" role="status">
            생년월일을 양력 {koreanDate(converted.solarDate)}로 바꿔 넣었습니다. 확인한 뒤 저장·신청 버튼을 다시 눌러 주세요.
          </p>
        </>
      )}
      {ownsError && !(isConverted && converted === suggestion) && (
        <div className="saju-lunar">
          <p className="field-error" id={errorId} role="alert">
            {error}
          </p>
          {suggestion && (
            <button type="button" className="btn btn-o btn-sm" onClick={convertToSolar}>
              양력으로 바꿔 넣기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
