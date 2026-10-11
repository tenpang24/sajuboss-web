import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ResetRequestForm, SignInForm, SignUpForm } from "@/components/auth/AuthForms";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getUser, safeNext } from "@/lib/auth";
import { kakaoLoginEnabled } from "@/lib/supabase/env";
import { signInWithKakao } from "./actions";

export const metadata: Metadata = { title: "로그인" };

type Mode = "signin" | "signup" | "reset";

const headings: Record<Mode, { title: string; lead: string }> = {
  signin: { title: "로그인", lead: "신청 내역과 저장한 사주 정보를 확인하세요." },
  signup: { title: "무료 회원가입", lead: "이메일만으로 가입하고 내 사주를 저장하세요." },
  reset: { title: "비밀번호 재설정", lead: "가입한 이메일로 재설정 링크를 보내드립니다." },
};

const linkErrors: Record<string, string> = {
  link: "링크가 만료되었거나 이미 사용되었습니다. 다시 시도해 주세요.",
  oauth: "소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

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
  const { title, lead } = headings[mode];

  return (
    <Card className="auth-card">
      <h1 className="auth-card__title">{title}</h1>
      <p className="auth-card__lead">{lead}</p>

      {linkError && (
        <p className="form-notice form-notice--error" role="alert">
          {linkError}
        </p>
      )}

      {mode === "signin" && <SignInForm next={next} />}
      {mode === "signup" && <SignUpForm next={next} />}
      {mode === "reset" && <ResetRequestForm />}

      {mode !== "reset" && (
        <>
          <div className="auth-card__divider">또는</div>
          <form action={signInWithKakao}>
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="kakao" block disabled={!kakaoLoginEnabled}>
              카카오로 계속하기
            </Button>
          </form>
          {!kakaoLoginEnabled && (
            <p className="auth-card__hint">카카오 로그인은 준비 중입니다.</p>
          )}
        </>
      )}

      <ul className="auth-card__links">
        {mode !== "signin" && (
          <li>
            <Link href={`/login?mode=signin${nextQuery}`}>이미 계정이 있어요. 로그인</Link>
          </li>
        )}
        {mode !== "signup" && (
          <li>
            <Link href={`/login?mode=signup${nextQuery}`}>처음이신가요? 무료 회원가입</Link>
          </li>
        )}
        {mode === "signin" && (
          <li>
            <Link href="/login?mode=reset">비밀번호를 잊으셨나요?</Link>
          </li>
        )}
      </ul>
    </Card>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="container auth-page">
      <Suspense fallback={<Card className="auth-card auth-card--loading" aria-busy="true" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
