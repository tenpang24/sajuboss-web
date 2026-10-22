import "server-only";
import lunarJs from "lunar-javascript";
import {
  DEFAULT_CORRECTIONS,
  calcLocalMs,
  periodNotes,
  resolveClock,
  type ClockResolution,
  type CorrectionOptions,
} from "./corrections.ts";
import { koreanLunarToSolar } from "./korean-lunar.ts";
import { GAN_OHAENG, ZHI_OHAENG, type Ohaeng } from "./relation.ts";

// 사주 4주 계산. 원본은 _import/sosangkong/lib/saju/buildBazi.ts(소상공닷컴 3c08968).
// 원본과 다른 점:
//  - lunar-javascript의 절기는 중국 기준시(UTC+8)다. 출생 순간을 UTC+8 벽시계로 바꿔 넣어 절입 시각과 비교한다.
//  - 년주·월주는 입춘·절입 "시각" 기준(...Exact). 원본은 "당일" 기준이었다.
//  - 음력 입력은 한국천문연구원 기준 한국 음력으로 바꾼다(korean-lunar.ts). 원본은 중국 음력이었다.
//  - 시각을 모르면 그 날 00:00~23:59 전체를 보고 경계 위험을 함께 돌려준다.
//  - 보정(진태양시, 서머타임, 표준시 이력, 자시)은 corrections.ts의 옵션으로, 기본은 서머타임·표준시 이력만 켜짐.

const { Solar } = lunarJs;

export const ENGINE_VERSION = "saju-engine 8-B2 (lunar-javascript 1.7.7)";

/** 경계(절입, 날짜 변경)에서 이 시간(분) 안이면 위험으로 알린다. 서머타임·표준시 보정 여부에 따라 1시간까지 달라질 수 있어서. */
export const BOUNDARY_RISK_MINUTES = 60;

export type SajuCalendar = "solar" | "lunar" | "lunar_leap";

/** saju_profiles 형식 */
export type SajuInput = {
  birth_date: string; // YYYY-MM-DD (calendar 기준 날짜)
  calendar: SajuCalendar;
  birth_time: string | null; // HH:MM 또는 HH:MM:SS, 모르면 null
  gender: "female" | "male" | "unknown"; // 4주 계산에는 쓰지 않음(대운에서 필요)
};

export type Pillars = { year: string; month: string; day: string; hour: string | null };

export type BoundaryRisk =
  | {
      kind: "ipchun" | "jeolip";
      term: string; // 한글 절기 이름
      termKst: string; // 절입 시각(라이브러리 계산, UTC+9, 분 단위 반올림 전)
      /** 출생 순간 - 절입 시각(분). 시각을 모르면 null */
      minutesFromBoundary: number | null;
      before: { year: string; month: string };
      after: { year: string; month: string };
    }
  | {
      kind: "midnight";
      /** 일주 계산 시각 - 날짜가 바뀌는 시각(분). 시각을 모르면 null */
      minutesFromBoundary: number | null;
      dayCandidates: string[];
    };

export type PillarsResult = {
  ok: true;
  input: SajuInput;
  /** 양력 날짜(음력 입력은 한국 음력으로 변환한 값) */
  solarDate: string;
  pillars: Pillars;
  dayGan: string;
  ohaengDistribution: Record<Ohaeng, number>;
  /** 시각 불확실: 태어난 시각을 모름(시주 없음, 년·월·일주는 그 날 어느 시각이냐에 따라 달라질 수 있음) */
  timeUncertain: boolean;
  /** 경계 위험: 절입일·입춘일·자정 근처라 4주가 바뀔 수 있음(이유는 boundaryRisks) */
  boundaryRisk: boolean;
  boundaryRisks: BoundaryRisk[];
  corrections: {
    options: CorrectionOptions;
    applied: {
      trueSolarTimeMinutes: number | null;
      summerTimeHourRemoved: boolean;
      standardOffset: string; // 예: "+09:00"
      ziHour: CorrectionOptions["ziHour"];
    };
    /** 적힌 시각(시각을 모르면 null) */
    clock: string | null;
    /** 출생 순간(UTC). 시각을 모르면 그 날 12:00 기준 */
    instantUtc: string;
    /** 일주·시주 계산에 쓴 시각 */
    calcLocal: string;
    clockIssue: ClockResolution["clockIssue"];
    /** 보정 옵션과 관계없이 그 시기의 안내 */
    periodNotes: Array<"summer-time-period" | "non-kst-standard-period">;
  };
  engine: string;
};

export type PillarsError = {
  ok: false;
  error: "invalid_date" | "invalid_time" | "out_of_range" | "no_such_lunar_date";
};

const SOLAR_MIN = "1900-01-01";
const SOLAR_MAX = "2100-12-31";

// 월이 바뀌는 12절(節). 라이브러리 표의 이름(간체·대문자 병음)을 한글로.
const JIE_NAMES: Record<string, string> = {
  小寒: "소한", XIAO_HAN: "소한",
  立春: "입춘", LI_CHUN: "입춘",
  惊蛰: "경칩", JING_ZHE: "경칩",
  清明: "청명",
  立夏: "입하",
  芒种: "망종",
  小暑: "소서",
  立秋: "입추",
  白露: "백로",
  寒露: "한로",
  立冬: "입동",
  大雪: "대설", DA_XUE: "대설",
};

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function fmt(ms: number, withSeconds = false): string {
  const d = new Date(ms);
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getUTCSeconds())}` : base;
}

function fmtOffset(seconds: number): string {
  const sign = seconds < 0 ? "-" : "+";
  const abs = Math.abs(seconds);
  const s = abs % 60;
  return `${sign}${pad(Math.floor(abs / 3600))}:${pad(Math.floor((abs % 3600) / 60))}${s ? `:${pad(s)}` : ""}`;
}

/** UTC로 적은 값처럼 다룬 ms → lunar-javascript Solar */
function solarAt(wallMs: number) {
  const d = new Date(wallMs);
  return Solar.fromYmdHms(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
}

const CHINA_OFFSET_MS = 8 * 3600 * 1000;
const KST_OFFSET_MS = 9 * 3600 * 1000;

/** 출생 순간 → 년주·월주(절입 시각 기준) */
export function yearMonthAt(utcMs: number): { year: string; month: string } {
  const lunar = solarAt(utcMs + CHINA_OFFSET_MS).getLunar();
  return { year: lunar.getYearInGanZhiExact(), month: lunar.getMonthInGanZhiExact() };
}

/** 계산 시각 → 일주·시주 */
function dayHourAt(localMs: number, ziHour: CorrectionOptions["ziHour"]): { day: string; hour: string } {
  const lunar = solarAt(localMs).getLunar();
  return {
    day: ziHour === "day-changes-at-23" ? lunar.getDayInGanZhiExact() : lunar.getDayInGanZhi(),
    hour: lunar.getTimeInGanZhi(),
  };
}

/** utcMs 앞뒤의 12절 목록(UTC ms) */
export function jieAround(utcMs: number): Array<{ name: string; utcMs: number }> {
  const year = new Date(utcMs + CHINA_OFFSET_MS).getUTCFullYear();
  const seen = new Map<number, string>();
  for (const y of [year - 1, year, year + 1]) {
    const table = Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable();
    for (const [key, solar] of Object.entries(table)) {
      const name = JIE_NAMES[key];
      if (!name) continue;
      const ms =
        Date.UTC(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute(), solar.getSecond()) -
        CHINA_OFFSET_MS;
      seen.set(ms, name);
    }
  }
  return [...seen].map(([ms, name]) => ({ name, utcMs: ms })).sort((a, b) => a.utcMs - b.utcMs);
}

function jieRisk(term: { name: string; utcMs: number }, minutes: number | null): BoundaryRisk {
  return {
    kind: term.name === "입춘" ? "ipchun" : "jeolip",
    term: term.name,
    termKst: fmt(term.utcMs + KST_OFFSET_MS, true),
    minutesFromBoundary: minutes,
    before: yearMonthAt(term.utcMs - 1000),
    after: yearMonthAt(term.utcMs + 1000),
  };
}

function parseDate(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function parseTime(value: string): { h: number; mi: number; s: number } | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const mi = Number(match[2]);
  const s = Number(match[3] ?? 0);
  if (h > 23 || mi > 59 || s > 59) return null;
  return { h, mi, s };
}

export function calcPillars(input: SajuInput, options: CorrectionOptions = DEFAULT_CORRECTIONS): PillarsResult | PillarsError {
  const date = parseDate(input.birth_date);
  if (!date) return { ok: false, error: "invalid_date" };

  // 1) 양력 날짜
  let solarDate: string;
  if (input.calendar === "solar") {
    const ms = Date.UTC(date.y, date.m - 1, date.d);
    const real = new Date(ms);
    if (real.getUTCFullYear() !== date.y || real.getUTCMonth() !== date.m - 1 || real.getUTCDate() !== date.d) {
      return { ok: false, error: "invalid_date" };
    }
    solarDate = input.birth_date;
    if (solarDate < SOLAR_MIN || solarDate > SOLAR_MAX) return { ok: false, error: "out_of_range" };
  } else {
    const converted = koreanLunarToSolar(date.y, date.m, date.d, input.calendar === "lunar_leap");
    if (!converted.ok) return { ok: false, error: converted.error };
    solarDate = converted.solarDate;
  }
  const solar = parseDate(solarDate)!;

  // 2) 시각
  let time: { h: number; mi: number; s: number } | null = null;
  if (input.birth_time !== null) {
    time = parseTime(input.birth_time);
    if (!time) return { ok: false, error: "invalid_time" };
  }
  const timeUnknown = time === null;
  const clockAt = (h: number, mi: number, s: number) => Date.UTC(solar.y, solar.m - 1, solar.d, h, mi, s);

  // 3) 대표 시각(모르면 12:00)으로 4주 계산
  const main = resolveClock(time ? clockAt(time.h, time.mi, time.s) : clockAt(12, 0, 0), options);
  const mainLocal = calcLocalMs(main, options);
  const ym = yearMonthAt(main.utcMs);
  const dh = dayHourAt(mainLocal, options.ziHour);
  const pillars: Pillars = { year: ym.year, month: ym.month, day: dh.day, hour: timeUnknown ? null : dh.hour };

  // 4) 경계 위험
  const risks: BoundaryRisk[] = [];
  if (timeUnknown) {
    const start = resolveClock(clockAt(0, 0, 0), options);
    const end = resolveClock(clockAt(23, 59, 59), options);
    for (const term of jieAround(main.utcMs)) {
      if (term.utcMs > start.utcMs && term.utcMs <= end.utcMs) risks.push(jieRisk(term, null));
    }
    const days = new Set([
      dayHourAt(calcLocalMs(start, options), options.ziHour).day,
      dh.day,
      dayHourAt(calcLocalMs(end, options), options.ziHour).day,
    ]);
    if (days.size > 1) risks.push({ kind: "midnight", minutesFromBoundary: null, dayCandidates: [...days] });
  } else {
    for (const term of jieAround(main.utcMs)) {
      const minutes = (main.utcMs - term.utcMs) / 60000;
      if (Math.abs(minutes) <= BOUNDARY_RISK_MINUTES) risks.push(jieRisk(term, Math.round(minutes * 10) / 10));
    }
    // 날짜가 바뀌는 시각: 00:00(자시 23시 규칙이면 23:00도)
    const dayStart = Date.UTC(new Date(mainLocal).getUTCFullYear(), new Date(mainLocal).getUTCMonth(), new Date(mainLocal).getUTCDate());
    const boundaries = [dayStart, dayStart + 24 * 3600 * 1000];
    if (options.ziHour === "day-changes-at-23") boundaries.push(dayStart - 3600 * 1000, dayStart + 23 * 3600 * 1000);
    for (const b of boundaries) {
      const minutes = (mainLocal - b) / 60000;
      if (Math.abs(minutes) <= BOUNDARY_RISK_MINUTES) {
        const other = minutes >= 0 ? b - 60000 : b;
        const days = new Set([dh.day, dayHourAt(other, options.ziHour).day]);
        if (days.size > 1) risks.push({ kind: "midnight", minutesFromBoundary: Math.round(minutes * 10) / 10, dayCandidates: [...days] });
      }
    }
  }

  // 5) 오행 분포(천간·지지 겉글자만, 지장간 없음) — 원본과 같음
  const ohaengDistribution: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of [pillars.year, pillars.month, pillars.day, ...(pillars.hour ? [pillars.hour] : [])]) {
    ohaengDistribution[GAN_OHAENG[p[0]]] += 1;
    ohaengDistribution[ZHI_OHAENG[p[1]]] += 1;
  }

  return {
    ok: true,
    input,
    solarDate,
    pillars,
    dayGan: pillars.day[0],
    ohaengDistribution,
    timeUncertain: timeUnknown,
    boundaryRisk: risks.length > 0,
    boundaryRisks: risks,
    corrections: {
      options,
      applied: {
        trueSolarTimeMinutes: options.trueSolarTime.enabled ? options.trueSolarTime.minutes : null,
        summerTimeHourRemoved: main.summerApplied,
        standardOffset: fmtOffset(main.standardSeconds),
        ziHour: options.ziHour,
      },
      clock: time ? `${solarDate} ${pad(time.h)}:${pad(time.mi)}:${pad(time.s)}` : null,
      instantUtc: new Date(main.utcMs).toISOString(),
      calcLocal: fmt(mainLocal, true),
      clockIssue: main.clockIssue,
      periodNotes: periodNotes(main.utcMs),
    },
    engine: ENGINE_VERSION,
  };
}
