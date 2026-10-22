import "server-only";

// 출생 시각 보정 옵션과 근거 표.
// 기본값(사장님 확정 2026-10-22): 서머타임·표준시 이력 켜짐, 진태양시 꺼짐, 자시 00:00. 모두 끄면 적힌 시각을 지금의 한국 표준시(UTC+9)로 본다.
// 한국천문연구원 24기 입기시각 표도 같은 가정(과거 표준자오선 변경·서머타임 미반영)이다.

export type ZiHourRule =
  | "midnight" // 날짜는 00:00에 바뀐다. 23:00~23:59의 시주 천간은 다음 날 기준(lunar-javascript 기본 동작)
  | "day-changes-at-23"; // 23:00부터 다음 날의 일주로 본다

export type CorrectionOptions = {
  /** 진태양시 보정. minutes는 UTC+9 기준 자오선(동경 135도)과의 차이(분). 예: 서울 약 -32. 균시차는 넣지 않는다. */
  trueSolarTime: { enabled: boolean; minutes: number };
  /** 서머타임 기간이면 1시간을 뺀다(아래 표). */
  summerTime: boolean;
  /** 그 시기의 표준시를 쓴다(1908 전 지방평균시, 1908~1911·1954~1961 UTC+8:30). 끄면 항상 UTC+9. */
  standardTimeHistory: boolean;
  ziHour: ZiHourRule;
};

export const DEFAULT_CORRECTIONS: CorrectionOptions = {
  trueSolarTime: { enabled: false, minutes: 0 },
  summerTime: true,
  standardTimeHistory: true,
  ziHour: "midnight",
};

export const KST_OFFSET_SECONDS = 9 * 3600;

// 서울 시간대 이력. 출처: IANA tz database 2026c `asia` 파일의 Asia/Seoul(Zone·Rule ROK).
// fromUtc부터 다음 구간 전까지 standard(표준시, 초)와 summer(서머타임 여부)가 적용된다.
// 1954년 변경은 국가기록원 자료(1954-03-17 관보 '표준자오선 변경에 관한 건', 3월 21일부터 동경 127.5도)와 일치.
// 다만 국가기록원 자료는 바뀌는 시각을 "오전 0시 30분"으로 적어 IANA(00:00)와 30분 차이가 있다.
// 1961-08-10 복귀는 IANA 자료로만 확인했다. 표가 IANA와 같은지는 tests/saju-engine/corrections.test.ts가 확인한다.
export const SEOUL_TIME_HISTORY: ReadonlyArray<{ fromUtc: string; standard: number; summer: boolean }> = [
  { fromUtc: "1800-01-01T00:00:00Z", standard: 8 * 3600 + 27 * 60 + 52, summer: false }, // 지방평균시(LMT)
  { fromUtc: "1908-03-31T15:32:08Z", standard: 8.5 * 3600, summer: false },
  { fromUtc: "1911-12-31T15:30:00Z", standard: 9 * 3600, summer: false },
  { fromUtc: "1948-05-31T15:00:00Z", standard: 9 * 3600, summer: true },
  { fromUtc: "1948-09-12T14:00:00Z", standard: 9 * 3600, summer: false },
  { fromUtc: "1949-04-02T15:00:00Z", standard: 9 * 3600, summer: true },
  { fromUtc: "1949-09-10T14:00:00Z", standard: 9 * 3600, summer: false },
  { fromUtc: "1950-03-31T15:00:00Z", standard: 9 * 3600, summer: true },
  { fromUtc: "1950-09-09T14:00:00Z", standard: 9 * 3600, summer: false },
  { fromUtc: "1951-05-05T15:00:00Z", standard: 9 * 3600, summer: true },
  { fromUtc: "1951-09-08T14:00:00Z", standard: 9 * 3600, summer: false },
  { fromUtc: "1954-03-20T15:00:00Z", standard: 8.5 * 3600, summer: false },
  { fromUtc: "1955-05-04T15:30:00Z", standard: 8.5 * 3600, summer: true },
  { fromUtc: "1955-09-08T14:30:00Z", standard: 8.5 * 3600, summer: false },
  { fromUtc: "1956-05-19T15:30:00Z", standard: 8.5 * 3600, summer: true },
  { fromUtc: "1956-09-29T14:30:00Z", standard: 8.5 * 3600, summer: false },
  { fromUtc: "1957-05-04T15:30:00Z", standard: 8.5 * 3600, summer: true },
  { fromUtc: "1957-09-21T14:30:00Z", standard: 8.5 * 3600, summer: false },
  { fromUtc: "1958-05-03T15:30:00Z", standard: 8.5 * 3600, summer: true },
  { fromUtc: "1958-09-20T14:30:00Z", standard: 8.5 * 3600, summer: false },
  { fromUtc: "1959-05-02T15:30:00Z", standard: 8.5 * 3600, summer: true },
  { fromUtc: "1959-09-19T14:30:00Z", standard: 8.5 * 3600, summer: false },
  { fromUtc: "1960-04-30T15:30:00Z", standard: 8.5 * 3600, summer: true },
  { fromUtc: "1960-09-17T14:30:00Z", standard: 8.5 * 3600, summer: false },
  { fromUtc: "1961-08-09T15:30:00Z", standard: 9 * 3600, summer: false },
  { fromUtc: "1987-05-09T17:00:00Z", standard: 9 * 3600, summer: true },
  { fromUtc: "1987-10-10T17:00:00Z", standard: 9 * 3600, summer: false },
  { fromUtc: "1988-05-07T17:00:00Z", standard: 9 * 3600, summer: true },
  { fromUtc: "1988-10-08T17:00:00Z", standard: 9 * 3600, summer: false },
];

const HISTORY_MS = SEOUL_TIME_HISTORY.map((s) => ({ ...s, from: Date.parse(s.fromUtc) }));

function segmentAt(utcMs: number) {
  let found = HISTORY_MS[0];
  for (const s of HISTORY_MS) {
    if (s.from <= utcMs) found = s;
    else break;
  }
  return found;
}

function offsetFor(utcMs: number, options: CorrectionOptions): { offset: number; standard: number; summer: boolean } {
  const s = segmentAt(utcMs);
  const standard = options.standardTimeHistory ? s.standard : KST_OFFSET_SECONDS;
  const summer = options.summerTime && s.summer;
  return { offset: standard + (summer ? 3600 : 0), standard, summer };
}

export type ClockResolution = {
  /** 출생 순간(UTC, ms) */
  utcMs: number;
  /** 적힌 시각에 적용한 UTC 차이(초) */
  offsetSeconds: number;
  /** 서머타임을 뺐는지 */
  summerApplied: boolean;
  /** 적용한 표준시(초). 보정이 꺼져 있으면 UTC+9 */
  standardSeconds: number;
  /** 서머타임 시작 때 건너뛴 시각(존재하지 않음) 또는 끝날 때 두 번 있던 시각 */
  clockIssue: "nonexistent" | "ambiguous" | null;
};

/** 적힌 벽시계 시각(UTC로 적은 값처럼 다룬 ms)을 출생 순간으로 바꾼다. */
export function resolveClock(clockAsUtcMs: number, options: CorrectionOptions): ClockResolution {
  // 가능한 해석을 모두 시험한다: 각 후보 offset으로 순간을 구하고, 그 순간의 offset이 같으면 일관된 해석.
  const candidates = new Set<number>();
  for (const s of HISTORY_MS) {
    const standard = options.standardTimeHistory ? s.standard : KST_OFFSET_SECONDS;
    candidates.add(standard);
    if (options.summerTime && s.summer) candidates.add(standard + 3600);
  }
  const consistent: ClockResolution[] = [];
  for (const offset of candidates) {
    const utcMs = clockAsUtcMs - offset * 1000;
    const at = offsetFor(utcMs, options);
    if (at.offset === offset) {
      consistent.push({
        utcMs,
        offsetSeconds: offset,
        summerApplied: at.summer,
        standardSeconds: at.standard,
        clockIssue: null,
      });
    }
  }
  if (consistent.length === 1) return consistent[0];
  if (consistent.length > 1) {
    // 두 번 있던 시각: 먼저 온 쪽(서머타임 쪽)을 쓴다.
    consistent.sort((a, b) => a.utcMs - b.utcMs);
    return { ...consistent[0], clockIssue: "ambiguous" };
  }
  // 건너뛴 시각: 바뀌기 전 offset으로 본다.
  const before = offsetFor(clockAsUtcMs - KST_OFFSET_SECONDS * 1000 - 2 * 3600 * 1000, options);
  return {
    utcMs: clockAsUtcMs - before.offset * 1000,
    offsetSeconds: before.offset,
    summerApplied: before.summer,
    standardSeconds: before.standard,
    clockIssue: "nonexistent",
  };
}

/** 보정 옵션과 관계없이, 그 순간이 서머타임 기간인지·표준시가 UTC+9가 아니었는지(안내용) */
export function periodNotes(utcMs: number): Array<"summer-time-period" | "non-kst-standard-period"> {
  const s = segmentAt(utcMs);
  const notes: Array<"summer-time-period" | "non-kst-standard-period"> = [];
  if (s.summer) notes.push("summer-time-period");
  if (s.standard !== KST_OFFSET_SECONDS) notes.push("non-kst-standard-period");
  return notes;
}

/** 일주·시주 계산에 쓰는 지방 시각(UTC로 적은 값처럼 다룬 ms) */
export function calcLocalMs(resolution: ClockResolution, options: CorrectionOptions): number {
  if (options.trueSolarTime.enabled) {
    return resolution.utcMs + (KST_OFFSET_SECONDS + options.trueSolarTime.minutes * 60) * 1000;
  }
  // 서머타임만 빼고 그 시기의 표준시로 본다(보정이 꺼져 있으면 적힌 시각 그대로).
  return resolution.utcMs + resolution.standardSeconds * 1000;
}
