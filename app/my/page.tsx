import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/login/actions";
import { ConsentForm, OrderDeleteControl, SajuPanel, type SavedSaju } from "@/components/my/MyClient";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { formatKrw } from "@/lib/pricing";
import {
  ORDER_STATUSES,
  PACKAGES,
  PRODUCTS,
  orderNumber,
  packageNames,
  productNames,
  statusLabels,
  type OrderStatus,
} from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { isOneOf } from "@/lib/validation";

export const metadata: Metadata = { title: "내 신청" };

const notices: Record<string, string> = {
  "password-updated": "비밀번호를 변경했습니다.",
  "preorder-done": "사전신청이 접수됐습니다. 12월 1일 오픈하면 이메일로 알려 드립니다.",
};

const badgeTone: Partial<Record<OrderStatus, "y" | "done" | "line">> = {
  requested: "y",
  delivered: "done",
  canceled: "line",
  refunded: "line",
};

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function Notice({ searchParams }: Pick<PageProps<"/my">, "searchParams">) {
  const text = notices[first((await searchParams).notice) ?? ""];
  if (!text) return null;
  return (
    <p className="notice notice-ok" role="status">
      {text}
    </p>
  );
}

// 가입 약관 동의가 기록되지 않은 계정에만 동의 카드를 보여줍니다.
async function ConsentSection() {
  const user = await requireUser("/my");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("age_confirmed_at, terms_agreed_at, privacy_agreed_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return null;
  if (data?.age_confirmed_at && data.terms_agreed_at && data.privacy_agreed_at) return null;

  return (
    <Card className="my-card my-consent">
      <strong className="my-card-title">약관 동의가 필요합니다</strong>
      <p className="muted">풀이를 신청하려면 아래 약관에 동의해 주세요.</p>
      <ConsentForm />
    </Card>
  );
}

// 본인 신청 목록. 컬럼을 명시해 조회합니다(select('*') 금지). 삭제된 신청은 RLS로 보이지 않습니다.
async function OrderSection() {
  const user = await requireUser("/my");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, product, package, status, amount_krw, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <Card className="my-empty">
        <strong className="my-empty-title">신청 내역을 불러오지 못했습니다</strong>
        <p className="muted">잠시 후 화면을 새로 고쳐 주세요.</p>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
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
    );
  }

  return (
    <div className="order-list">
      <strong className="order-list-title">
        신청 목록 <span className="muted">{data.length}건</span>
      </strong>
      {data.map((order) => {
        const status = isOneOf(order.status, ORDER_STATUSES) ? order.status : null;
        const product = isOneOf(order.product, PRODUCTS) ? productNames[order.product] : "신청";
        const pkg = isOneOf(order.package, PACKAGES) ? ` (${packageNames[order.package]})` : "";
        return (
          <Card key={order.id} className="order">
            <div className="order-info">
              <div className="order-meta">
                <Badge tone={status ? badgeTone[status] : undefined}>
                  {status ? statusLabels[status] : "확인 중"}
                </Badge>
                <span className="muted small">신청 번호 {orderNumber(order.id)}</span>
              </div>
              <strong className="order-name">
                {product}
                {pkg}
              </strong>
              <span className="muted">
                {dateFormat.format(new Date(order.created_at))} 신청 · {formatKrw(order.amount_krw)}
              </span>
            </div>
            {status !== "canceled" && <OrderDeleteControl orderId={order.id} />}
          </Card>
        );
      })}
    </div>
  );
}

async function SajuSection() {
  const user = await requireUser("/my");
  const supabase = await createClient();
  const { data } = await supabase
    .from("saju_profiles")
    .select("id, birth_date, calendar, birth_time, time_unknown, gender")
    .eq("user_id", user.id)
    .eq("is_self", true)
    .maybeSingle();

  const saju: SavedSaju | null = data
    ? {
        id: data.id,
        birth_date: data.birth_date,
        calendar: data.calendar,
        birth_time: data.birth_time ? String(data.birth_time).slice(0, 5) : null,
        time_unknown: data.time_unknown,
        gender: data.gender,
      }
    : null;
  return <SajuPanel saju={saju} />;
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
            <Suspense fallback={null}>
              <ConsentSection />
            </Suspense>
            <Suspense fallback={<Card className="my-empty my-loading" aria-busy="true" />}>
              <OrderSection />
            </Suspense>

            <Card tint className="my-guide">
              <strong>진행 상태 안내</strong>
              <div className="my-guide-list">
                <span>
                  <Badge>사전 신청 완료</Badge> 오픈 알림 대기
                </span>
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
              <Suspense fallback={<strong className="my-card-title">내 사주 정보</strong>}>
                <SajuSection />
              </Suspense>
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
