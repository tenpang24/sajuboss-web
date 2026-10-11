import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "내 신청" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function MyContent({ searchParams }: Pick<PageProps<"/my">, "searchParams">) {
  const user = await requireUser("/my");
  const notice = first((await searchParams).notice);

  return (
    <>
      {notice === "password-updated" && (
        <p className="form-notice form-notice--ok" role="status">
          비밀번호를 변경했습니다.
        </p>
      )}

      <Card className="my-section">
        <h2 className="my-section__title">내 신청 목록</h2>
        {/* 신청 목록은 4단계(orders 테이블) 이후 연결합니다. */}
        <p className="my-section__empty">아직 신청한 내역이 없습니다.</p>
        <Link href="/#products">풀이 상품 보러 가기</Link>
      </Card>

      <Card className="my-section">
        <h2 className="my-section__title">내 사주 정보</h2>
        <p className="my-section__text">
          저장된 생년월일시와 신청서에 입력한 사주 정보를 삭제할 수 있습니다.
        </p>
        {/* 삭제 처리는 4단계의 삭제 요청 서버 함수에 연결합니다. */}
        <Button type="button" variant="outline" disabled>
          내 사주 정보 삭제
        </Button>
        <p className="my-section__hint">삭제 기능은 준비 중입니다.</p>
      </Card>

      <Card className="my-section">
        <h2 className="my-section__title">계정</h2>
        <p className="my-section__text">{user.email}</p>
        <div className="my-section__actions">
          <Link href="/login/update-password" className="btn btn--outline">
            비밀번호 변경
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              로그아웃
            </Button>
          </form>
        </div>
      </Card>
    </>
  );
}

export default function MyPage({ searchParams }: PageProps<"/my">) {
  return (
    <div className="container my-page">
      <h1 className="my-page__title">내 신청</h1>
      <Suspense fallback={<Card className="my-section my-section--loading" aria-busy="true" />}>
        <MyContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
