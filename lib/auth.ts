import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser(next: string) {
  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return user;
}

// 관리자 여부. DB의 is_admin() 함수로만 판별합니다(profiles를 직접 조회하지 않음).
// 오류가 나거나 판별할 수 없으면 관리자가 아닌 것으로 처리합니다(fail closed).
export async function isAdmin() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("is_admin");
    return !error && data === true;
  } catch {
    return false;
  }
}

// 관리자 화면과 관리자 서버 액션 맨 앞에서 호출합니다. 관리자가 아니면 404로 끝냅니다.
export async function requireAdmin(next: string) {
  const user = await requireUser(next);
  if (!(await isAdmin())) {
    notFound();
  }
  return user;
}

// 로그인 후 돌아갈 경로. 외부 주소로 보내는 값은 버립니다.
export function safeNext(value: unknown, fallback = "/my") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
