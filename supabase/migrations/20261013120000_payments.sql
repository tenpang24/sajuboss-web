-- 6단계 6-A: 결제 기록
-- 실행 순서: 4단계 마이그레이션 3개(profile_consents → saju_profiles → orders) 뒤에 이 파일
-- PG(결제대행사)와 무관한 구조다. PG 이름과 PG가 돌려준 결제 키, 금액, 상태만 저장한다.
-- 카드번호·계좌번호·주민번호 같은 결제 수단의 민감 정보는 저장하지 않는다(그런 컬럼을 두지 않는다).

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  -- 결제 기록이 있는 주문은 지울 수 없다(restrict).
  order_id uuid not null references public.orders (id) on delete restrict,
  -- manual = 계좌이체 수동 확인, pg = 결제대행사
  provider text not null check (provider in ('manual','pg')),
  provider_name text,                                -- PG 이름. manual이면 null
  provider_payment_id text,                          -- PG가 돌려준 결제 키. manual이면 null
  amount_krw int not null check (amount_krw >= 0),   -- 확인된 결제 금액
  -- ready = 결제 대기(입금 확인 요청 포함), paid = 확인됨, failed = 거부(금액 불일치 등)
  status text not null default 'ready'
    check (status in ('ready','paid','failed','canceled','refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 같은 결제(PG 이름 + 결제 키)가 두 번 반영되지 않게 한다.
create unique index payments_provider_payment_id_key
  on public.payments (provider_name, provider_payment_id)
  where provider_payment_id is not null;

create index payments_order_id_idx on public.payments (order_id, created_at desc);

-- [지시에 없던 추가 1] 한 주문에 결제 대기(ready) 행은 하나만 둔다.
-- 입금 확인 요청 버튼을 여러 번 눌러도 대기 행이 늘지 않게 하는 용도다.
create unique index payments_one_ready_per_order
  on public.payments (order_id)
  where status = 'ready';

-- updated_at 자동 갱신. 함수는 4단계 마이그레이션에서 만든 것과 같은 내용이다
-- (이 파일만 따로 실행해도 되도록 다시 둔다).
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

-- 사용자용 정책은 두지 않는다. 결제 조회는 서버(service_role)가 주문 소유를 확인한 뒤 처리한다.
revoke all on public.payments from anon, authenticated;
grant all on public.payments to service_role;

-- [지시에 없던 추가 2] 결제 확인을 한 트랜잭션으로 처리하는 함수.
-- REST 호출 두 번(payments 기록, orders 상태 변경)으로 나누면 중간에 끊겼을 때 둘이 어긋날 수 있어,
-- 주문 행을 잠근 뒤 금액 확인 → payments 기록 → orders.status 변경을 한 번에 한다.
-- 주문 상태를 requested → paid로 바꾸는 곳은 이 함수 하나뿐이다. 앱에서는 lib/payment.ts만 호출한다.
--
-- p_amount_krw는 서버가 PG 서버 API(또는 서명 검증된 웹훅)로 확인한 금액이다.
-- 클라이언트가 보낸 금액을 넣지 않는다. 수동 확인(manual)은 관리자가 주문 금액 전액 입금을 확인했을 때만 호출한다.
--
-- 돌려주는 값
--   paid              이번 호출로 결제 확인됨(payments 1행 paid, orders.status = paid)
--   already_paid      이미 결제 확인된 주문 또는 이미 반영된 결제 키. 아무것도 바꾸지 않음
--   amount_mismatch   확인된 금액이 주문 금액과 다름. 주문은 그대로 두고 payments에 failed로 기록만 남김
--   duplicate_payment 같은 결제 키가 다른 주문에 이미 쓰였음. 아무것도 바꾸지 않음
--   not_payable       결제할 수 없는 상태(requested가 아니거나 삭제 요청된 주문)
--   not_found         주문이 없음
--   invalid           입력이 규칙에 맞지 않음
create or replace function public.confirm_order_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_name text,
  p_provider_payment_id text,
  p_amount_krw int
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_same public.payments%rowtype;
  v_ready_id uuid;
begin
  if p_order_id is null or p_amount_krw is null or p_amount_krw < 0 then
    return 'invalid';
  end if;
  if p_provider = 'pg' then
    if p_provider_name is null or p_provider_payment_id is null then
      return 'invalid';
    end if;
  elsif p_provider = 'manual' then
    if p_provider_name is not null or p_provider_payment_id is not null then
      return 'invalid';
    end if;
  else
    return 'invalid';
  end if;

  -- 주문 행을 잠근다. 같은 주문의 확인 요청이 동시에 와도 하나씩 처리된다.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return 'not_found';
  end if;

  -- 같은 결제 키가 이미 기록돼 있으면 다시 반영하지 않는다.
  if p_provider_payment_id is not null then
    select * into v_same
      from public.payments
     where provider_name = p_provider_name
       and provider_payment_id = p_provider_payment_id;
    if found then
      if v_same.order_id <> p_order_id then
        return 'duplicate_payment';
      end if;
      if v_same.status = 'paid' then
        return 'already_paid';
      end if;
      if v_same.status = 'failed' then
        return 'amount_mismatch';
      end if;
      return 'not_payable';   -- 취소·환불된 결제 키는 다시 쓰지 않는다.
    end if;
  end if;

  if v_order.status = 'paid' then
    return 'already_paid';
  end if;
  if v_order.status <> 'requested' or v_order.deleted_at is not null then
    return 'not_payable';
  end if;

  -- 확인된 금액이 주문 금액과 다르면 거부하고 기록만 남긴다.
  if p_amount_krw <> v_order.amount_krw then
    insert into public.payments (order_id, provider, provider_name, provider_payment_id, amount_krw, status)
    values (p_order_id, p_provider, p_provider_name, p_provider_payment_id, p_amount_krw, 'failed');
    return 'amount_mismatch';
  end if;

  -- 결제 대기 행이 있으면 그 행을 확인 처리하고, 없으면 새로 만든다.
  select id into v_ready_id
    from public.payments
   where order_id = p_order_id and status = 'ready';
  if found then
    update public.payments
       set provider = p_provider,
           provider_name = p_provider_name,
           provider_payment_id = p_provider_payment_id,
           amount_krw = p_amount_krw,
           status = 'paid',
           paid_at = now()
     where id = v_ready_id;
  else
    insert into public.payments (order_id, provider, provider_name, provider_payment_id, amount_krw, status, paid_at)
    values (p_order_id, p_provider, p_provider_name, p_provider_payment_id, p_amount_krw, 'paid', now());
  end if;

  update public.orders set status = 'paid' where id = p_order_id;
  return 'paid';
end $$;

-- 이 함수는 서버(service_role)만 실행한다.
revoke all on function public.confirm_order_payment(uuid, text, text, text, int) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text, text, text, int) to service_role;
