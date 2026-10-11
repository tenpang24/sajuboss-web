import type { Metadata } from "next";
import { Suspense } from "react";
import { UpdatePasswordForm } from "@/components/auth/AuthForms";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "새 비밀번호 설정" };

async function UpdatePasswordContent() {
  // 재설정 메일의 링크를 거치면 로그인된 상태로 도착합니다.
  await requireUser("/login/update-password");

  return (
    <Card className="auth-card">
      <UpdatePasswordForm />
    </Card>
  );
}

export default function UpdatePasswordPage() {
  return (
    <section className="wrap auth">
      <div className="auth-head">
        <h1 className="t1 t1-sm">새 비밀번호 설정</h1>
        <p className="lead">앞으로 사용할 비밀번호를 입력해 주세요.</p>
      </div>
      <Suspense fallback={<Card className="auth-card auth-card-loading" aria-busy="true" />}>
        <UpdatePasswordContent />
      </Suspense>
    </section>
  );
}
