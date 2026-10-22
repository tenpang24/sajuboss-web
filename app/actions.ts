"use server";

import { headers } from "next/headers";
import { readBirthForm } from "@/lib/saju";
import { allowTodayCall } from "@/lib/today/rate-limit";
import { calcToday, toTodayView, type TodayView } from "@/lib/today/today";
import type { LunarSuggestion } from "@/lib/validation";

// 메인 "오늘의 사업운". 입력한 생년월일시는 계산에만 쓰고 저장하지도 로그에 남기지도 않습니다.
// 생년월일 검증은 사주 저장과 같은 규칙(lib/saju.ts의 readBirthForm: 음력 2월 29·30일 양력 안내, 없는 음력 날짜 거부).

export type TodayState = {
  result?: TodayView;
  error?: string;
  field?: string;
  lunar?: LunarSuggestion;
  limited?: boolean; // 1분 호출 한도를 넘음
};

export async function showToday(_prev: TodayState, formData: FormData): Promise<TodayState> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (!allowTodayCall(ip)) {
    return { error: "요청이 많습니다. 잠시 후 다시 시도해 주세요.", limited: true };
  }

  const birth = readBirthForm(formData);
  if (!birth.ok) {
    return { error: birth.error, field: birth.field, ...(birth.lunar ? { lunar: birth.lunar } : {}) };
  }
  const today = calcToday({
    birth_date: birth.value.birth_date,
    calendar: birth.value.calendar,
    birth_time: birth.value.birth_time,
  });
  if (!today.ok) {
    return { error: "생년월일을 다시 확인해 주세요. 예: 1972-03-15", field: "birth" };
  }
  return { result: toTodayView(today) };
}
