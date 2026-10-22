"use server";

import { refresh } from "next/cache";
import { getUser } from "@/lib/auth";
import { markReportViewed } from "@/lib/report/view";
import { isUuid } from "@/lib/validation";

// 리포트 처음 열기. 폼에서 읽는 값은 주문 id뿐이고, 사용자 id는 세션에서 확인한 값만 씁니다.
// DB 함수 mark_report_viewed가 본인 주문·전달 완료·리포트 있음을 다시 확인하고, 이미 열어 봤으면 시각을 바꾸지 않습니다.

export type OpenReportState = { error?: string };

export async function openReport(_prev: OpenReportState, formData: FormData): Promise<OpenReportState> {
  const user = await getUser();
  if (!user) return { error: "로그인 후 이용해 주세요." };
  const orderId = formData.get("orderId");
  if (!isUuid(orderId)) return { error: "리포트를 찾지 못했습니다." };

  const outcome = await markReportViewed(orderId, user.id);
  if (outcome === "viewed" || outcome === "already_viewed") {
    refresh();
    return {};
  }
  if (outcome === "not_found") return { error: "리포트를 찾지 못했습니다." };
  return { error: "리포트를 열지 못했습니다. 잠시 후 다시 시도해 주세요." };
}
