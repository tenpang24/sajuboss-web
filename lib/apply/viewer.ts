import "server-only";
import type { ApplyViewer } from "@/components/apply/ApplyParts";
import { getUser } from "@/lib/auth";
import { APPLY_FORMS_OPEN } from "@/lib/products";
import { getSelfSaju } from "@/lib/saju";
import { todayInSeoul } from "@/lib/validation";

// 신청 폼 화면에 넘길 값: 접수 스위치, 로그인 여부, 계정 이메일, 저장된 내 사주.
// 저장된 사주는 화면에 보여 주기만 하고, 신청할 때는 서버가 DB에서 다시 읽습니다.
export async function loadApplyViewer(): Promise<ApplyViewer> {
  const user = await getUser();
  const saju = user ? await getSelfSaju(user.id) : null;
  return {
    open: APPLY_FORMS_OPEN,
    loggedIn: Boolean(user),
    email: user?.email ?? null,
    saju: saju
      ? {
          birth_date: saju.birth_date,
          calendar: saju.calendar,
          birth_time: saju.birth_time,
          gender: saju.gender,
        }
      : null,
    today: todayInSeoul(),
  };
}
