// 반응형 자동 검증 (docs/RESPONSIVE.md)
//   npm run build && npm run check:responsive
// 옵션: --no-auth (로그인 필요한 경로 건너뜀), --base-url=http://localhost:3000 (이미 떠 있는 서버 사용)
// 키·비밀번호·세션 값은 출력하지 않습니다.
//
// 빠른 모드: npm run build && npm run check:responsive:quick  (--quick)
//   평소 작업 중에는 빠른 모드를 쓰고, push 직전과 9단계 QA에서는 전체 검사를 돌립니다.
//   - 폭 4개: 320(Android Chromium), 390(iPhone WebKit), 768, 1280(Chromium). 폭마다 기본과 글자 130%를 확인합니다.
//   - 경로는 git으로 바뀐 파일을 보고 고릅니다(아래 pickQuickRoutes).
//       1) 커밋하지 않은 변경(git diff HEAD)과 새 파일(추적되지 않은 파일)을 모읍니다.
//          --since=<커밋 또는 브랜치>를 주면 그 지점부터 지금까지 바뀐 파일을 봅니다(예: --since=origin/main).
//       2) 파일을 화면 경로로 바꿉니다.
//          app/<경로>/ 아래 파일          → 그 경로 (예: app/apply/date/actions.ts → /apply/date)
//          components/apply/DateForm 등   → 해당 폼, 그 밖의 components/apply, lib/apply → 신청 폼 3종
//          components/pay, lib/payment.ts, lib/order-view.ts → /pay/[orderId], /done/[orderId]
//          components/admin, lib/admin → /admin/orders, /admin/orders/[orderId]
//          components/report → /report/2027, components/my → /my, components/auth → /login 계열, components/home → /
//          components/saju, components/order → 그 부품을 쓰는 화면(신청 폼 3종, /my, /report/2027)
//          전역 파일(app/layout.tsx, app/*.css, components/ui, 헤더·푸터) → 모든 경로
//          lib(위에 없는 것), docs, scripts, 설정 파일 → 화면 경로 없음
//       3) 고른 경로가 하나도 없으면 신청 폼 3종, /my, /pay/[orderId], /done/[orderId]를 검사합니다.
//     신청 폼 경로는 비로그인 화면과 로그인 상태 변형(저장된 사주, 직접 입력, 동업자, 개명)을 함께 봅니다.
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { chromium, devices, webkit } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const noAuth = args.includes("--no-auth");
const quick = args.includes("--quick");
const sinceArg = args.find((arg) => arg.startsWith("--since="))?.split("=")[1];
const startedAt = Date.now();
const baseUrlArg = args.find((arg) => arg.startsWith("--base-url="))?.split("=")[1];
const PORT = 3217;
const baseUrl = baseUrlArg ?? `http://localhost:${PORT}`;
const outDir = path.join(root, ".responsive");

const MOBILE_WIDTHS = quick ? [320, 390] : [320, 360, 390, 430];
const WIDE_WIDTHS = quick ? [768, 1280] : [768, 1024, 1280, 1440];
const TEXT_ZOOM = 1.3; // 시스템 글꼴 크기 130%
const MIN_FONT_PX = 16;
const MIN_CONTROL_PX = 48;

const publicRoutes = [
  "/",
  "/report/2027",
  "/apply/date",
  "/apply/name",
  "/apply/person",
  "/login",
  "/login?mode=signup",
  "/login?mode=reset",
];
// 로그인(관리자) 상태로 확인하는 경로
// [orderId]는 검사할 때 임시 계정의 신청 id(결제 대기 상태)로 바뀝니다.
const authRoutes = [
  "/my",
  "/login/update-password",
  "/admin/orders",
  "/admin/orders/[orderId]",
  "/pay/[orderId]",
  "/done/[orderId]",
];
// 신청 폼 3종은 로그인 상태(저장된 사주 있음)에서 화면이 달라지므로 한 번 더 확인합니다.
// clicks: 화면을 연 뒤 눌러서 펼쳐 볼 요소(직접 입력, 동업자 입력, 개명 항목)
const applyVariants = [
  { route: "/apply/date", name: "/apply/date (로그인)" },
  {
    route: "/apply/date",
    name: "/apply/date (로그인, 직접 입력+동업자)",
    clicks: ["input[name=sajuSource][value=input]", "input[name=partner]"],
  },
  { route: "/apply/name", name: "/apply/name (로그인)" },
  {
    route: "/apply/name",
    name: "/apply/name (로그인, 직접 입력+상세)",
    clicks: ["input[name=sajuSource][value=input]", "input[name=package][value=detail]"],
  },
  { route: "/apply/person", name: "/apply/person (로그인, 아기)" },
  {
    route: "/apply/person",
    name: "/apply/person (로그인, 개명)",
    clicks: ["input[name=kind][value=rename]"],
  },
];

const APPLY_ROUTES = ["/apply/date", "/apply/name", "/apply/person"];
const QUICK_FALLBACK = [...APPLY_ROUTES, "/my", "/pay/[orderId]", "/done/[orderId]"];

// 빠른 모드의 경로 선택. 바뀐 파일 목록을 화면 경로로 바꿉니다(규칙은 파일 맨 위 주석).
// 돌려주는 값: { all: true } 또는 { routes: Set<경로> }, 그리고 고른 이유.
function pickQuickRoutes() {
  const git = (gitArgs) => {
    try {
      return execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" })
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/\\/g, "/"))
        .filter(Boolean);
    } catch {
      return [];
    }
  };
  const files = [
    ...new Set([
      ...git(["diff", "--name-only", sinceArg ?? "HEAD"]),
      ...git(["ls-files", "--others", "--exclude-standard"]),
    ]),
  ];

  const routes = new Set();
  let all = false;
  const add = (...list) => list.forEach((route) => routes.add(route));
  for (const file of files) {
    if (
      /^app\/(layout\.tsx|[^/]+\.css)$/.test(file) ||
      /^components\/(ui\/|Site|HeaderNav|PageStub)/.test(file)
    ) {
      all = true;
    } else if (file.startsWith("app/")) {
      // app/apply/date/page.tsx → /apply/date, app/page.tsx → /, app/pay/[orderId]/page.tsx → /pay/[orderId]
      const dir = file.split("/").slice(1, -1);
      if (dir[0] === "auth") continue; // 화면이 없는 경로(인증 콜백)
      add("/" + dir.join("/"));
    } else if (/^components\/apply\/(Date|Name|Person)Form/.test(file)) {
      add({ Date: "/apply/date", Name: "/apply/name", Person: "/apply/person" }[file.match(/(Date|Name|Person)Form/)[1]]);
    } else if (/^(components|lib)\/apply\//.test(file)) {
      add(...APPLY_ROUTES);
    } else if (file.startsWith("components/pay/") || ["lib/payment.ts", "lib/order-view.ts"].includes(file)) {
      add("/pay/[orderId]", "/done/[orderId]");
    } else if (file.startsWith("components/admin/") || file.startsWith("lib/admin/")) {
      add("/admin/orders", "/admin/orders/[orderId]");
    } else if (file.startsWith("components/report/")) {
      add("/report/2027");
    } else if (file.startsWith("components/my/")) {
      add("/my");
    } else if (file.startsWith("components/auth/")) {
      add("/login", "/login/update-password", "/my"); // 약관 동의 상자는 /my에서도 씁니다.
    } else if (file.startsWith("components/home/")) {
      add("/");
    } else if (/^components\/(saju|order)\//.test(file)) {
      add(...APPLY_ROUTES, "/report/2027");
      if (file.startsWith("components/saju/")) add("/my");
    }
  }

  if (all) return { all: true, reason: `전역 파일이 바뀌어 모든 경로를 검사합니다(바뀐 파일 ${files.length}개).` };
  if (routes.size === 0) {
    return {
      routes: new Set(QUICK_FALLBACK),
      reason: `화면에 해당하는 변경이 없어 기본 경로를 검사합니다(바뀐 파일 ${files.length}개).`,
    };
  }
  return { routes, reason: `바뀐 파일 ${files.length}개에서 고른 경로입니다.` };
}

function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Za-z_]+=/.test(line))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

async function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error("서버가 뜨지 않았습니다. 먼저 npm run build를 실행했는지 확인하세요.");
}

function startServer() {
  if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
    throw new Error(".next 빌드가 없습니다. 먼저 npm run build를 실행하세요.");
  }
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  return spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], { cwd: root, stdio: "ignore" });
}

// 임시 테스트 계정(관리자)을 만들고 앱과 같은 방식으로 세션 쿠키를 만든다.
async function createTempSession(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `sajuboss-rwdtest-${randomBytes(8).toString("hex")}@example.com`;
  const password = `${randomBytes(18).toString("base64url")}aA1!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`임시 계정 생성 실패 (${error.code ?? error.status})`);
  const userId = data.user.id;

  // 정리 순서: order_events → payments → orders → saju_profiles → 계정(주문이 있으면 계정 삭제가 막힙니다).
  const cleanup = async () => {
    // 처리 기록·결제 기록이 있는 주문은 지울 수 없어(restrict) 그 둘부터 지웁니다.
    const { data: mine } = await admin.from("orders").select("id").eq("user_id", userId);
    const orderIds = (mine ?? []).map((row) => row.id);
    if (orderIds.length) await admin.from("order_events").delete().in("order_id", orderIds);
    if (orderIds.length) await admin.from("payments").delete().in("order_id", orderIds);
    await admin.from("orders").delete().eq("user_id", userId);
    await admin.from("saju_profiles").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
    const { data: left } = await admin.auth.admin.getUserById(userId);
    const remaining = await Promise.all(
      [
        admin.from("profiles").select("id").eq("id", userId),
        admin.from("orders").select("id").eq("user_id", userId),
        admin.from("saju_profiles").select("id").eq("user_id", userId),
      ].map(async (query) => (await query).data?.length ?? 0),
    );
    return !left?.user && remaining.every((count) => count === 0);
  };

  try {
    const promoted = await admin.from("profiles").update({ role: "admin" }).eq("id", userId);
    if (promoted.error) throw new Error(`임시 계정 관리자 지정 실패 (${promoted.error.code})`);

    // /my의 신청 목록과 저장된 사주 화면도 확인하도록 임시 데이터를 넣습니다(끝나면 삭제).
    const now = new Date().toISOString();
    const seededOrder = await admin.from("orders").insert({
      user_id: userId,
      product: "report_2027",
      package: null,
      status: "preorder",
      amount_krw: 3900,
      contact_email: email,
      consent_privacy_at: now,
      consent_disclaimer_at: now,
      payload: { test: true },
    });
    const seededSaju = await admin.from("saju_profiles").insert({
      user_id: userId,
      is_self: true,
      label: "본인",
      birth_date: "1972-03-15",
      calendar: "solar",
      birth_time: null,
      time_unknown: true,
      gender: "female",
    });
    // 결제·완료 화면용: 결제 대기(requested) 상태의 신청 1건
    const payOrder = await admin
      .from("orders")
      .insert({
        user_id: userId,
        product: "name_biz",
        package: "basic",
        status: "requested",
        amount_krw: 29000,
        contact_email: email,
        contact_phone: "01012345678",
        consent_privacy_at: now,
        consent_disclaimer_at: now,
        payload: { test: true },
      })
      .select("id")
      .single();
    if (seededOrder.error || seededSaju.error || payOrder.error) {
      throw new Error(
        `임시 데이터 준비 실패 (${seededOrder.error?.code ?? seededSaju.error?.code ?? payOrder.error?.code})`,
      );
    }

    const jar = new Map();
    const client = createServerClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (items) =>
          items.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
      },
    });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw new Error(`임시 계정 로그인 실패 (${signedIn.error.code})`);
    const cookies = [...jar].map(([name, value]) => ({ name, value, url: baseUrl }));
    return { cookies, cleanup, orderId: payOrder.data.id };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

// 화면 안에서 측정: 가로 넘침, 입력 요소 글자 크기·높이
function measure({ minFont, minControl }) {
  const doc = document.documentElement;
  const problems = [];
  if (doc.scrollWidth > doc.clientWidth) {
    const culprits = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.right > doc.clientWidth + 0.5;
      })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`);
    problems.push(`가로 넘침 ${doc.scrollWidth}>${doc.clientWidth} (${culprits.join(", ")})`);
  }
  for (const el of document.querySelectorAll("input, select, textarea")) {
    if (["hidden", "checkbox", "radio"].includes(el.type)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) continue;
    const name = el.name || el.id || el.tagName.toLowerCase();
    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    if (fontSize < minFont) problems.push(`입력 글자 ${fontSize}px<${minFont} (${name})`);
    if (rect.height < minControl - 0.5) problems.push(`입력 높이 ${Math.round(rect.height)}px<${minControl} (${name})`);
  }
  return problems;
}

const slug = (route) => (route === "/" ? "home" : route.replace(/^\//, "").replace(/[^a-zA-Z0-9가-힣]+/g, "-"));

async function checkRoute(context, { route, name, clicks = [] }, label, { zoom = false } = {}) {
  const page = await context.newPage();
  const problems = [];
  try {
    const response = await page.goto(baseUrl + route, { waitUntil: "networkidle", timeout: 30000 });
    const status = response?.status() ?? 0;
    if (status !== 200) problems.push(`HTTP ${status}`);
    if (new URL(page.url()).pathname !== new URL(baseUrl + route).pathname) {
      problems.push(`다른 경로로 이동됨 (${new URL(page.url()).pathname})`);
    }
    await page.evaluate(() => document.fonts.ready);
    // 숨은 라디오(패키지 카드)도 누를 수 있게 force로 누릅니다.
    for (const selector of clicks) await page.locator(selector).first().check({ force: true });
    if (zoom) {
      await page.addStyleTag({ content: `html{font-size:${TEXT_ZOOM * 100}% !important}` });
      await page.waitForTimeout(150);
    }
    // 글자 확대 상태에서는 넘침만 본다(입력 크기는 기본 상태에서 확인).
    const found = await page.evaluate(measure, {
      minFont: MIN_FONT_PX,
      minControl: zoom ? 0 : MIN_CONTROL_PX,
    });
    problems.push(...found);
    await page.screenshot({ path: path.join(outDir, `${slug(name)}__${label}.png`), fullPage: true });
  } catch (error) {
    problems.push(`확인 실패: ${String(error.message).split("\n")[0]}`);
  } finally {
    await page.close();
  }
  return problems;
}

async function main() {
  const env = loadEnv();
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const server = baseUrlArg ? null : startServer();
  let session = null;
  let cleanupOk = null;
  const failures = [];
  let checks = 0;
  const browsers = [];

  const picked = quick ? pickQuickRoutes() : null;

  try {
    await waitForServer(baseUrl + "/robots.txt");

    const canAuth = !noAuth && env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_URL;
    if (canAuth) session = await createTempSession(env);
    const allRoutes = [
      ...publicRoutes.map((route) => ({ route, name: route, auth: false })),
      ...(session
        ? authRoutes.map((route) => ({
            route: route.replace("[orderId]", session.orderId),
            name: route,
            auth: true,
          }))
        : []),
      ...(session ? applyVariants.map((variant) => ({ ...variant, auth: true })) : []),
    ];
    // 빠른 모드에서는 고른 경로만 남깁니다(/login은 ?mode= 변형도 함께).
    const routes =
      !picked || picked.all
        ? allRoutes
        : allRoutes.filter(({ route, name }) =>
            picked.routes.has((name.includes("[") ? name : route).split("?")[0]),
          );

    const chromiumBrowser = await chromium.launch();
    const webkitBrowser = await webkit.launch();
    browsers.push(chromiumBrowser, webkitBrowser);

    const iphone = devices["iPhone 13"];
    const android = devices["Pixel 7"];
    const fullProfiles = [
      ...MOBILE_WIDTHS.flatMap((width) => [
        {
          label: `${width}-iphone-webkit`,
          browser: webkitBrowser,
          options: { ...iphone, viewport: { width, height: 760 } },
          mobile: true,
        },
        {
          label: `${width}-android-chromium`,
          browser: chromiumBrowser,
          options: { ...android, viewport: { width, height: 760 } },
          mobile: true,
        },
      ]),
      ...WIDE_WIDTHS.map((width) => ({
        label: `${width}-chromium`,
        browser: chromiumBrowser,
        options: { viewport: { width, height: 900 } },
        mobile: false,
      })),
    ];
    // 빠른 모드: 320은 Android(Chromium), 390은 iPhone(WebKit) 하나씩만 봅니다.
    const profiles = quick
      ? fullProfiles.filter(
          ({ label }) => !label.startsWith("320-iphone") && !label.startsWith("390-android"),
        )
      : fullProfiles;

    for (const profile of profiles) {
      const publicContext = await profile.browser.newContext(profile.options);
      const authContext = session ? await profile.browser.newContext(profile.options) : null;
      if (authContext) await authContext.addCookies(session.cookies);

      for (const target of routes) {
        const context = target.auth ? authContext : publicContext;
        const runs = [{ zoom: false, label: profile.label }];
        // 글자 130%: 전체 검사는 모바일 폭에서, 빠른 모드는 4개 폭 모두에서 확인합니다.
        if (profile.mobile || quick) runs.push({ zoom: true, label: `${profile.label}-zoom130` });
        for (const run of runs) {
          checks += 1;
          const problems = await checkRoute(context, target, run.label, { zoom: run.zoom });
          if (problems.length) failures.push({ route: target.name, label: run.label, problems });
        }
      }
      await publicContext.close();
      await authContext?.close();
    }

    // 보고
    const routeList = routes.map(({ name }) => name);
    console.log(`검증 폭: ${[...MOBILE_WIDTHS, ...WIDE_WIDTHS].join(", ")}`);
    console.log(
      quick
        ? `빠른 모드: 320 Android(Chromium), 390 iPhone(WebKit), 768·1280 Chromium, 폭마다 기본·글자 130%\n경로 선택: ${picked.reason}`
        : `모바일 폭: iPhone(WebKit) + Android(Chromium), 각각 기본·글자 130%`,
    );
    console.log(`경로 ${routeList.length}개, 확인 ${checks}회${session ? "" : " (로그인 경로 제외)"}\n`);
    for (const route of routeList) {
      const failed = failures.filter((failure) => failure.route === route);
      console.log(`${failed.length ? "실패" : "통과"}  ${route}`);
      for (const failure of failed) console.log(`      [${failure.label}] ${failure.problems.join(" / ")}`);
    }
  } finally {
    for (const browser of browsers) await browser.close();
    if (session) cleanupOk = await session.cleanup();
    server?.kill();
  }

  if (cleanupOk !== null) console.log(`\n임시 테스트 계정 삭제: ${cleanupOk ? "완료(잔여 행 없음)" : "실패. 직접 확인 필요"}`);
  console.log(`스크린샷: .responsive/ (${checks}장)`);
  console.log(`소요 시간: ${Math.round((Date.now() - startedAt) / 1000)}초`);
  const failedRoutes = new Set(failures.map((failure) => failure.route)).size;
  console.log(failedRoutes ? `\n결과: 실패 경로 ${failedRoutes}개` : "\n결과: 전 경로 통과");
  process.exit(failedRoutes || cleanupOk === false ? 1 : 0);
}

main().catch((error) => {
  console.error(`검증 중단: ${error.message}`);
  process.exit(1);
});
