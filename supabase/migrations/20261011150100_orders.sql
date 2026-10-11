-- 4단계 (b): 사전신청·주문
-- 지시문 4단계의 검토 완료 DDL 기준. 달라진 곳은 "v2:" 주석으로 표시.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- 신청은 로그인한 회원만 할 수 있다. 서버 액션이 auth.getUser()의 id로 채운다.
  user_id uuid not null references auth.users (id) on delete restrict,
  -- v2: 상품 4종. 개명은 별도 상품이 아니라 name_person의 한 종류다(payload.kind로 구분).
  product text not null
    check (product in ('report_2027','date','name_biz','name_person')),
  package text
    check (package in ('basic','detail')),
  status text not null default 'requested'
    check (status in ('requested','paid','in_progress','delivered','canceled','refunded')),
  amount_krw int not null check (amount_krw >= 0),   -- 신청 시점 금액 스냅샷(가정치). 서버가 lib/pricing.ts로 계산
  contact_email text,                                -- 삭제 요청 시 비우므로 nullable
  contact_phone text,
  consent_privacy_at timestamptz not null,           -- [필수] 개인정보 수집·이용 동의 시각. 서버가 기록
  consent_disclaimer_at timestamptz not null,        -- [필수] 참고용 자료 확인 시각. 서버가 기록
  payload jsonb,                                     -- 폼 입력 전체. 삭제 요청 시 null
  admin_note text,                                   -- 내부 메모. 사용자에게 절대 노출 금지
  deleted_at timestamptz,                            -- 사용자 삭제 요청 시각
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- v2: 작명 2종(상호·브랜드, 개인·개명)은 패키지 필수, 리포트·택일은 패키지 없음
  constraint orders_package_rule check (
    (product in ('name_biz','name_person') and package is not null)
    or (product in ('report_2027','date') and package is null)
  ),
  -- 삭제 전에는 payload·이메일 필수, 삭제 후에는 payload·이메일·전화가 모두 비어 있어야 함(양방향 강제)
  constraint orders_live_fields check (
    (deleted_at is null and payload is not null and contact_email is not null)
    or (deleted_at is not null and payload is null
        and contact_email is null and contact_phone is null)
  )
);

create index orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index orders_status_created_at_idx on public.orders (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

-- 일반 사용자: 본인의 삭제되지 않은 주문만 조회. 쓰기 정책은 두지 않는다.
-- 관리자 화면은 서버(service_role)로만 처리하므로 관리자용 RLS 정책은 만들지 않는다.
create policy orders_select_own on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) and deleted_at is null);

revoke all on public.orders from anon, authenticated;
grant all on public.orders to service_role;   -- 프로젝트 설정에 따라 기본 권한이 안 붙을 수 있어 명시
grant select (id, user_id, product, package, status, amount_krw, contact_email,
              contact_phone, consent_privacy_at, consent_disclaimer_at, payload,
              created_at, updated_at)
  on public.orders to authenticated;   -- admin_note, deleted_at 컬럼은 일부러 제외
