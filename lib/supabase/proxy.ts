import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

const protectedPrefixes = ["/my", "/admin", "/pay", "/done"];

// 세션 쿠키를 갱신하고, 로그인이 필요한 경로는 /login으로 보냅니다.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const needsLogin = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!user && needsLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  // 관리자 경로는 화면을 그리기 전에 막습니다. 오류나 판별 실패도 차단합니다(fail closed).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    let admin = false;
    try {
      const { data, error } = await supabase.rpc("is_admin");
      admin = !error && data === true;
    } catch {
      admin = false;
    }
    if (!admin) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  return response;
}
