// 반응형 자동 검증 (docs/RESPONSIVE.md)
//   npm run build && npm run check:responsive
// 옵션: --no-auth (로그인 필요한 경로 건너뜀), --base-url=http://localhost:3000 (이미 떠 있는 서버 사용)
// 키·비밀번호·세션 값은 출력하지 않습니다.
import { spawn } from "node:child_process";
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
const baseUrlArg = args.find((arg) => arg.startsWith("--base-url="))?.split("=")[1];
const PORT = 3217;
const baseUrl = baseUrlArg ?? `http://localhost:${PORT}`;
const outDir = path.join(root, ".responsive");

const MOBILE_WIDTHS = [320, 360, 390, 430];
const WIDE_WIDTHS = [768, 1024, 1280, 1440];
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
const authRoutes = ["/my", "/login/update-password", "/admin/orders", "/pay/sample", "/done/sample"];

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

  const cleanup = async () => {
    await admin.auth.admin.deleteUser(userId);
    const { data: left } = await admin.auth.admin.getUserById(userId);
    const { data: rows } = await admin.from("profiles").select("id").eq("id", userId);
    return !left?.user && (rows?.length ?? 0) === 0;
  };

  try {
    const promoted = await admin.from("profiles").update({ role: "admin" }).eq("id", userId);
    if (promoted.error) throw new Error(`임시 계정 관리자 지정 실패 (${promoted.error.code})`);

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
    return { cookies, cleanup };
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

const slug = (route) => (route === "/" ? "home" : route.replace(/^\//, "").replace(/[^a-zA-Z0-9]+/g, "-"));

async function checkRoute(context, route, label, { zoom = false } = {}) {
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
    await page.screenshot({ path: path.join(outDir, `${slug(route)}__${label}.png`), fullPage: true });
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

  try {
    await waitForServer(baseUrl + "/robots.txt");

    const canAuth = !noAuth && env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_URL;
    if (canAuth) session = await createTempSession(env);
    const routes = [
      ...publicRoutes.map((route) => ({ route, auth: false })),
      ...(session ? authRoutes.map((route) => ({ route, auth: true })) : []),
    ];

    const chromiumBrowser = await chromium.launch();
    const webkitBrowser = await webkit.launch();
    browsers.push(chromiumBrowser, webkitBrowser);

    const iphone = devices["iPhone 13"];
    const android = devices["Pixel 7"];
    const profiles = [
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

    for (const profile of profiles) {
      const publicContext = await profile.browser.newContext(profile.options);
      const authContext = session ? await profile.browser.newContext(profile.options) : null;
      if (authContext) await authContext.addCookies(session.cookies);

      for (const { route, auth } of routes) {
        const context = auth ? authContext : publicContext;
        const runs = [{ zoom: false, label: profile.label }];
        if (profile.mobile) runs.push({ zoom: true, label: `${profile.label}-zoom130` });
        for (const run of runs) {
          checks += 1;
          const problems = await checkRoute(context, route, run.label, { zoom: run.zoom });
          if (problems.length) failures.push({ route, label: run.label, problems });
        }
      }
      await publicContext.close();
      await authContext?.close();
    }

    // 보고
    const routeList = routes.map(({ route }) => route);
    console.log(`검증 폭: ${[...MOBILE_WIDTHS, ...WIDE_WIDTHS].join(", ")}`);
    console.log(`모바일 폭: iPhone(WebKit) + Android(Chromium), 각각 기본·글자 130%`);
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
  const failedRoutes = new Set(failures.map((failure) => failure.route)).size;
  console.log(failedRoutes ? `\n결과: 실패 경로 ${failedRoutes}개` : "\n결과: 전 경로 통과");
  process.exit(failedRoutes || cleanupOk === false ? 1 : 0);
}

main().catch((error) => {
  console.error(`검증 중단: ${error.message}`);
  process.exit(1);
});
