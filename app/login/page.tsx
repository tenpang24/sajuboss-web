import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ResetRequestForm, SignInForm, SignUpForm } from "@/components/auth/AuthForms";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconCircle } from "@/components/ui/IconCircle";
import { getUser, safeNext } from "@/lib/auth";
import { kakaoLoginEnabled } from "@/lib/supabase/env";
import { signInWithKakao } from "./actions";

export const metadata: Metadata = { title: "로그인·회원가입" };

type Mode = "signin" | "signup" | "reset";

const headings: Record<Mode, { title: string; sub: string }> = {
  signup: {
    title: "무료 회원가입",
    sub: "가입하면 내 사주를 저장하고 신청 내역을 한곳에서 볼 수 있습니다.",
  },
  signin: { title: "다시 오셨네요", sub: "가입한 이메일로 로그인해 주세요." },
  reset: { title: "비밀번호 찾기", sub: "가입한 이메일로 재설정 링크를 보내 드립니다." },
};

const linkErrors: Record<string, string> = {
  link: "링크가 만료되었거나 이미 사용되었습니다. 다시 시도해 주세요.",
  oauth: "카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

const benefits = [
  { title: "내 사주 저장", body: "매번 생년월일을 다시 넣지 않아도 됩니다." },
  { title: "오늘의 사업운 무료", body: "가입 후에도 매일 무료로 봅니다." },
  { title: "신청 내역 한곳에", body: "진행 상태와 결과를 마이페이지에서 확인합니다." },
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function LoginContent({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNext(first(params.next));
  const modeParam = first(params.mode);
  const mode: Mode = modeParam === "signup" || modeParam === "reset" ? modeParam : "signin";
  const linkError = linkErrors[first(params.error) ?? ""];

  if (await getUser()) {
    redirect(next);
  }

  const nextQuery = next === "/my" ? "" : `&next=${encodeURIComponent(next)}`;
  const { title, sub } = headings[mode];
  const signupActive = mode === "signup";

  return (
    <>
      <div className="auth-head">
        <h1 className="t1 t1-sm">{title}</h1>
        <p className="lead">{sub}</p>
      </div>

      <Card className="auth-card">
        <nav className="auth-tabs" aria-label="로그인 또는 회원가입">
          <Link
            href={`/login?mode=signin${nextQuery}`}
            className={signupActive ? "btn" : "btn btn-p"}
            aria-current={signupActive ? undefined : "page"}
          >
            로그인
          </Link>
          <Link
            href={`/login?mode=signup${nextQuery}`}
            className={signupActive ? "btn btn-p" : "btn"}
            aria-current={signupActive ? "page" : undefined}
          >
            회원가입
          </Link>
        </nav>

        {linkError && (
          <p className="notice notice-error" role="alert">
            {linkError}
          </p>
        )}

        {mode === "signin" && <SignInForm next={next} />}
        {mode === "signup" && <SignUpForm next={next} />}
        {mode === "reset" && <ResetRequestForm />}

        <div className="auth-divider">또는</div>
        <form action={signInWithKakao}>
          <input type="hidden" name="next" value={next} />
          <Button type="submit" block disabled={!kakaoLoginEnabled} className="btn-kakao">
            {kakaoLoginEnabled ? "카카오로 시작하기" : "카카오로 시작하기 (준비 중)"}
          </Button>
        </form>
      </Card>

      <div className="grid auth-benefits">
        {benefits.map((benefit, index) => (
          <Card key={benefit.title} tint className="auth-benefit">
            <IconCircle>{index + 1}</IconCircle>
            <div>
              <strong>{benefit.title}</strong>
              <p className="muted small">{benefit.body}</p>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <section className="wrap auth">
      <Suspense fallback={<Card className="auth-card auth-card-loading" aria-busy="true" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
