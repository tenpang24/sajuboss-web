import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

// 로그인한 사용자의 권한(anon 키 + 세션 쿠키)으로 동작하는 서버용 클라이언트
export async function createClient() {
  // 세션 확인은 요청마다 새로 해야 합니다. 미리 그려 두는 렌더링(프리페치 포함)에서는 실행되지 않게 합니다.
  // (Supabase 클라이언트가 내부에서 현재 시각을 읽어, 이 줄이 없으면 Next.js가 프리렌더 오류를 기록합니다.)
  await connection();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없습니다. 세션 갱신은 proxy.ts가 맡습니다.
        }
      },
    },
  });
}
