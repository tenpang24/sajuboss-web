-- 7단계: 관리자 처리 기록과 관리자 처리 함수
-- 실행 순서: 20261013120000_payments.sql 뒤에 이 파일
--
-- 관리자 화면에서 주문 상태를 바꾸는 일은 모두 이 파일의 함수로만 한다.
-- 각 함수는 주문 행을 잠근 뒤 상태 변경과 처리 기록(order_events)을 한 트랜잭션으로 쓴다.
-- 그래서 "상태는 바뀌었는데 기록이 없는" 경우가 생기지 않는다.
--
-- 호출 순서(앱): 로그인 세션 클라이언트로 is_admin()을 확인 → 통과한 뒤에만 service_role로 아래 함수를 호출.
-- p_actor_id에는 세션의 사용자 id를 넣는다. null이면 invalid로 거부한다.
-- 모든 함수: search_path = '', execute는 service_role만(public, anon, authenticated 회수).
--
-- [지시에 없던 추가 1] 함수 안에서도 p_actor_id가 profiles.role = 'admin'인지 다시 확인한다(아니면 forbidden).
--   앱 코드가 확인을 빠뜨려도 관리자가 아닌 id로는 처리되지 않게 하는 이중 확인이다.
-- [지시에 없던 추가 2] 메모 저장 함수 admin_set_order_note. 메모 저장과 note_updated 기록을 한 트랜잭션으로 쓴다.

-- ─────────────────────────────────────────────────────────────
-- 관리자 처리 기록
-- 누가 언제 어떤 처리를 했는지만 남긴다. 메모 내용, 신청 내용(payload), 연락처는 저장하지 않는다.
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  -- 처리 기록이 있는 주문은 지울 수 없다(restrict).
  order_id uuid not null references public.orders (id) on delete restrict,
  -- 처리한 관리자. 관리자 계정이 지워지면 null로 남는다.
  actor_id uuid references auth.users (id) on delete set null,
  action text not null
    check (action in ('payment_confirmed','status_changed','refunded','canceled','note_updated')),
  -- 상태가 바뀌지 않는 처리(note_updated)는 둘 다 null
  from_status text
    check (from_status in ('preorder','requested','paid','in_progress','delivered','canceled','refunded')),
  to_status text
    check (to_status in ('preorder','requested','paid','in_progress','delivered','canceled','refunded')),
  created_at timestamptz not null default now()
);

create index order_events_order_id_idx on public.order_events (order_id, created_at desc);

alter table public.order_events enable row level security;

-- 사용자용 정책은 두지 않는다. 관리자 화면은 서버(service_role)로만 읽고, 쓰기는 아래 함수만 한다.
revoke all on public.order_events from anon, authenticated;
grant all on public.order_events to service_role;

-- ─────────────────────────────────────────────────────────────
-- 수동 입금 확인
-- 관리자가 주문 금액 전액 입금을 확인했을 때만 호출한다. 금액은 받지 않고 DB의 주문 금액을 쓴다.
-- 결제 반영은 6-A의 confirm_order_payment(manual)가 한다(주문 상태를 requested → paid로 바꾸는 곳은 여전히 그 함수 하나).
-- 결과가 paid일 때만 payment_confirmed 기록을 남긴다.
--
-- 결과: paid | already_paid | not_payable | amount_mismatch | not_found | forbidden | invalid
create or replace function public.admin_confirm_manual_payment(
  p_order_id uuid,
  p_actor_id uuid
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_amount int;
  v_result text;
begin
  if p_order_id is null or p_actor_id is null then
    return 'invalid';
  end if;
  if not exists (
    select 1 from public.profiles pr where pr.id = p_actor_id and pr.role = 'admin'
  ) then
    return 'forbidden';
  end if;

  -- 주문 행을 잠근다. 아래 confirm_order_payment도 같은 트랜잭션 안에서 같은 행을 잠근다.
  select o.amount_krw into v_amount
    from public.orders o
   where o.id = p_order_id
     for update;
  if not found then
    return 'not_found';
  end if;

  v_result := public.confirm_order_payment(p_order_id, 'manual', null, null, v_amount);

  if v_result = 'paid' then
    insert into public.order_events (order_id, actor_id, action, from_status, to_status)
    values (p_order_id, p_actor_id, 'payment_confirmed', 'requested', 'paid');
  end if;

  return v_result;
end $$;

revoke all on function public.admin_confirm_manual_payment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_confirm_manual_payment(uuid, uuid) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 환불 반영(전액만)
-- 관리자가 돈을 실제로 돌려준 뒤(계좌이체, 또는 6-B 이후 PG 취소 성공 뒤) 호출한다.
-- payments의 paid 행 → refunded, orders.status → refunded, refunded 기록을 한 번에 쓴다.
-- 이 함수는 돈을 움직이지 않고 기록만 바꾼다.
--
-- 결과: refunded | already_refunded | not_refundable | no_payment | not_found | forbidden | invalid
create or replace function public.refund_order_payment(
  p_order_id uuid,
  p_actor_id uuid
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_rows int;
begin
  if p_order_id is null or p_actor_id is null then
    return 'invalid';
  end if;
  if not exists (
    select 1 from public.profiles pr where pr.id = p_actor_id and pr.role = 'admin'
  ) then
    return 'forbidden';
  end if;

  select o.status into v_status
    from public.orders o
   where o.id = p_order_id
     for update;
  if not found then
    return 'not_found';
  end if;

  if v_status = 'refunded' then
    return 'already_refunded';
  end if;
  -- 결제가 확인된 주문만 환불할 수 있다(preorder, requested, canceled는 환불 대상이 아니다).
  if v_status not in ('paid', 'in_progress', 'delivered') then
    return 'not_refundable';
  end if;

  update public.payments p
     set status = 'refunded'
   where p.order_id = p_order_id
     and p.status = 'paid';
  get diagnostics v_rows = row_count;

  -- 결제 기록이 없는 주문은 건드리지 않는다(주문 상태도 그대로, 기록도 남기지 않는다).
  if v_rows = 0 then
    return 'no_payment';
  end if;
  -- paid 행은 주문당 하나여야 한다. 둘 이상이면 전부 되돌리고 오류로 끝낸다.
  if v_rows > 1 then
    raise exception 'refund_order_payment: paid rows = %', v_rows;
  end if;

  update public.orders o
     set status = 'refunded'
   where o.id = p_order_id;

  insert into public.order_events (order_id, actor_id, action, from_status, to_status)
  values (p_order_id, p_actor_id, 'refunded', v_status, 'refunded');

  return 'refunded';
end $$;

revoke all on function public.refund_order_payment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.refund_order_payment(uuid, uuid) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 상태 변경(입금 확인·환불을 뺀 나머지)
-- 허용하는 전이는 아래 여섯 개뿐이다. 그 밖의 조합은 invalid.
--   paid → in_progress, in_progress → delivered          진행
--   delivered → in_progress, in_progress → paid          한 칸 되돌리기(paid 아래로는 환불로만)
--   preorder → canceled, requested → canceled            관리자 취소. 남은 결제 대기(ready) 행도 canceled로
-- 관리자 취소는 신청 내용(payload)과 연락처를 지우지 않는다(사용자의 삭제 요청과 다르다).
-- requested → paid는 admin_confirm_manual_payment, → refunded는 refund_order_payment로만 한다.
--
-- 현재 상태가 p_from과 다르면 아무것도 바꾸지 않고 conflict를 돌려준다(화면을 연 뒤 상태가 바뀐 경우).
--
-- 결과: changed | conflict | not_found | forbidden | invalid
create or replace function public.admin_change_order_status(
  p_order_id uuid,
  p_from text,
  p_to text,
  p_actor_id uuid
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_action text;
begin
  if p_order_id is null or p_actor_id is null or p_from is null or p_to is null then
    return 'invalid';
  end if;

  if (p_from = 'paid' and p_to = 'in_progress')
     or (p_from = 'in_progress' and p_to = 'delivered')
     or (p_from = 'delivered' and p_to = 'in_progress')
     or (p_from = 'in_progress' and p_to = 'paid') then
    v_action := 'status_changed';
  elsif p_from in ('preorder', 'requested') and p_to = 'canceled' then
    v_action := 'canceled';
  else
    return 'invalid';
  end if;

  if not exists (
    select 1 from public.profiles pr where pr.id = p_actor_id and pr.role = 'admin'
  ) then
    return 'forbidden';
  end if;

  select o.status into v_status
    from public.orders o
   where o.id = p_order_id
     for update;
  if not found then
    return 'not_found';
  end if;
  if v_status <> p_from then
    return 'conflict';
  end if;

  if v_action = 'canceled' then
    update public.payments p
       set status = 'canceled'
     where p.order_id = p_order_id
       and p.status = 'ready';
  end if;

  update public.orders o
     set status = p_to
   where o.id = p_order_id;

  insert into public.order_events (order_id, actor_id, action, from_status, to_status)
  values (p_order_id, p_actor_id, v_action, p_from, p_to);

  return 'changed';
end $$;

revoke all on function public.admin_change_order_status(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_change_order_status(uuid, text, text, uuid) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 내부 메모 저장
-- 메모(orders.admin_note)를 저장하고 note_updated 기록을 남긴다. 기록에는 메모 내용을 넣지 않는다.
-- 빈 문자열은 null로 저장한다. 2,000자를 넘으면 invalid.
--
-- 결과: saved | not_found | forbidden | invalid
create or replace function public.admin_set_order_note(
  p_order_id uuid,
  p_note text,
  p_actor_id uuid
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_note text;
begin
  if p_order_id is null or p_actor_id is null then
    return 'invalid';
  end if;
  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 2000 then
    return 'invalid';
  end if;
  if not exists (
    select 1 from public.profiles pr where pr.id = p_actor_id and pr.role = 'admin'
  ) then
    return 'forbidden';
  end if;

  perform 1 from public.orders o where o.id = p_order_id for update;
  if not found then
    return 'not_found';
  end if;

  update public.orders o
     set admin_note = v_note
   where o.id = p_order_id;

  insert into public.order_events (order_id, actor_id, action)
  values (p_order_id, p_actor_id, 'note_updated');

  return 'saved';
end $$;

revoke all on function public.admin_set_order_note(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_set_order_note(uuid, text, uuid) to service_role;
