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

  // 결제·완료 화면은 본인 주문일 때만 엽니다. 주문 id가 형식에 맞지 않거나, 다른 사람의 주문이거나,
  // 삭제된 주문이면 화면을 그리기 전에 404로 끝냅니다(RLS가 본인의 삭제되지 않은 주문만 돌려줍니다).
  const orderPage = /^\/(pay|done)\/([^/]+)\/?$/.exec(pathname);
  if (orderPage) {
    let own = false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderPage[2])) {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id")
          .eq("id", orderPage[2])
          .maybeSingle();
        own = !error && Boolean(data);
      } catch {
        own = false;
      }
    }
    if (!own) {
      return new NextResponse("Not Found", { status: 404 });
    }
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
