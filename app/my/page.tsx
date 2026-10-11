import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/login/actions";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "내 신청" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function Notice({ searchParams }: Pick<PageProps<"/my">, "searchParams">) {
  if (first((await searchParams).notice) !== "password-updated") return null;
  return (
    <p className="notice notice-ok" role="status">
      비밀번호를 변경했습니다.
    </p>
  );
}

async function AccountEmail() {
  const user = await requireUser("/my");
  return <span>{user.email}</span>;
}

export default function MyPage({ searchParams }: PageProps<"/my">) {
  return (
    <>
      <div className="wrap my-head">
        <h1 className="t1 t1-sm">내 신청</h1>
        <p className="lead">신청한 풀이의 진행 상태와 결과를 확인합니다.</p>
      </div>

      <section className="wrap my-body">
        <div className="split">
          <div className="split-main my-main">
            <Suspense fallback={null}>
              <Notice searchParams={searchParams} />
            </Suspense>

            {/* 신청 목록은 4단계(orders 테이블) 이후 연결합니다. 그 전까지는 빈 상태만 보여줍니다. */}
            <Card className="my-empty">
              <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
                <rect x="10" y="8" width="36" height="42" rx="6" fill="none" stroke="#9FB7AD" strokeWidth="2.5" />
                <path d="M18 20h20M18 29h20M18 38h12" stroke="#9FB7AD" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <strong className="my-empty-title">아직 신청한 풀이가 없습니다</strong>
              <p className="muted">
                신년 사업운 리포트나 택일·작명을 신청하면 여기에서 진행 상태를 볼 수 있습니다.
              </p>
              <ButtonLink href="/#products">풀이 둘러보기</ButtonLink>
            </Card>

            <Card tint className="my-guide">
              <strong>진행 상태 안내</strong>
              <div className="my-guide-list">
                <span>
                  <Badge tone="y">결제 확인 대기</Badge> 신청 접수됨
                </span>
                <span>
                  <Badge>풀이 진행 중</Badge> 작성·검수 중
                </span>
                <span>
                  <Badge tone="done">전달 완료</Badge> 결과 확인 가능
                </span>
              </div>
            </Card>
          </div>

          <aside className="split-side my-side" aria-label="내 정보">
            <Card className="my-card">
              <strong className="my-card-title">내 사주 정보</strong>
              {/* 사주 저장과 삭제는 4단계 이후 연결합니다. 저장된 정보가 없으므로 예시 값을 채우지 않습니다. */}
              <p className="muted">저장된 사주 정보가 없습니다.</p>
              <div className="my-actions">
                <Button type="button" variant="g" size="sm" disabled>
                  수정
                </Button>
                <Button type="button" variant="danger" size="sm" disabled>
                  삭제
                </Button>
              </div>
              <p className="help">
                삭제하면 저장된 생년월일시와 진행 전 신청의 입력 정보가 지워집니다. 결제된 신청의
                보관 기간은 [확정 후 기재]
              </p>
            </Card>

            <Card className="my-card">
              <strong className="my-card-title">계정</strong>
              <div className="sum-row">
                <span>이메일</span>
                <Suspense fallback={<span />}>
                  <AccountEmail />
                </Suspense>
              </div>
              <ButtonLink href="/login/update-password" variant="g" size="sm" block>
                비밀번호 변경
              </ButtonLink>
              <form action={signOut}>
                <Button type="submit" variant="g" size="sm" block>
                  로그아웃
                </Button>
              </form>
              <p className="muted small">회원 탈퇴 [절차 확정 후 기재]</p>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
}
