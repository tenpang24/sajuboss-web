-- 8-B2: 신년 리포트 저장(order_reports)과 저장·열람 기록 함수
-- 실행 순서: 20261013150000_admin_actions.sql 뒤에 이 파일
--
-- 리포트는 결제가 확인된 신년 리포트 주문(report_2027)마다 하나만 저장한다.
-- 저장과 주문 상태 변경(→ delivered), 처리 기록(order_events)은 save_order_report 한 함수가 한 트랜잭션으로 한다.
-- 쓰기는 모두 서버(service_role)만. 함수는 search_path = '', execute는 service_role만(public, anon, authenticated 회수).
--
-- [지시에 없던 추가 1] save_order_report에서 p_actor_id가 있으면 profiles.role = 'admin'인지 함수 안에서 다시 확인한다(아니면 forbidden).
--   자동 생성(결제 확인 직후)은 p_actor_id = null로 부른다.
-- [지시에 없던 추가 2] 다시 만들기는 주문 상태가 paid, in_progress, delivered일 때만 한다(환불·취소된 주문은 not_payable).
-- [지시에 없던 추가 3] mark_report_viewed의 결과 값: viewed | already_viewed | not_found | invalid.

-- ─────────────────────────────────────────────────────────────
-- 리포트
create table public.order_reports (
  id uuid primary key default gen_random_uuid(),
  -- 주문당 하나. 리포트가 있는 주문은 지울 수 없다(restrict).
  order_id uuid not null unique references public.orders (id) on delete restrict,
  product text not null check (product = 'report_2027'),
  engine_version text not null check (char_length(engine_version) between 1 and 200),
  phrase_version text not null check (char_length(phrase_version) between 1 and 200),
  -- 계산에 쓴 사주(신청 당시 payload.saju 사본). 사용자에게는 컬럼 권한을 주지 않는다.
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  -- 계산 결과 + 달마다 문장 ID와 문장
  report jsonb not null check (jsonb_typeof(report) = 'object'),
  created_at timestamptz not null default now(),
  -- 관리자가 다시 만들었으면 그 관리자 id, 자동 생성이면 null. 사용자에게는 컬럼 권한을 주지 않는다.
  created_by uuid references auth.users (id) on delete set null,
  -- 사용자가 처음 열어 본 시각. 이 값이 생기면 다시 만들 수 없다.
  first_viewed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 이전 마이그레이션에서 만든 함수와 같은 내용이다(이 파일만 따로 실행해도 되도록 다시 둔다).
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger order_reports_set_updated_at
  before update on public.order_reports
  for each row execute function public.set_updated_at();

alter table public.order_reports enable row level security;

-- 사용자: 본인 주문이고, 삭제되지 않았고, 전달 완료(delivered)인 리포트만 조회. 쓰기 정책은 두지 않는다.
-- orders.deleted_at에는 사용자 컬럼 권한이 없어(4단계) 여기서 직접 비교할 수 없다.
-- 대신 orders의 RLS 정책(orders_select_own: 본인 + deleted_at is null)이 이 하위 조회에도 적용되어 삭제된 주문은 보이지 않는다.
-- (orders 정책은 order_reports를 참조하지 않으므로 정책 순환참조는 없다.)
create policy order_reports_select_own_delivered on public.order_reports
  for select to authenticated
  using (
    exists (
      select 1
        from public.orders o
       where o.id = order_reports.order_id
         and o.user_id = (select auth.uid())
         and o.status = 'delivered'
    )
  );

revoke all on public.order_reports from anon, authenticated;
grant all on public.order_reports to service_role;
-- 컬럼 단위 grant라 select('*')는 42501이 난다. 앱 코드는 항상 컬럼을 명시해 조회한다.
grant select (id, order_id, product, engine_version, phrase_version, report,
              created_at, first_viewed_at, updated_at)
  on public.order_reports to authenticated;   -- input_snapshot, created_by는 일부러 제외

-- ─────────────────────────────────────────────────────────────
-- 처리 기록 종류 추가(기존 값은 그대로)
-- 7단계에서 열 정의 안에 둔 check라 이름은 Postgres 기본값 order_events_action_check다.
alter table public.order_events drop constraint order_events_action_check;
alter table public.order_events add constraint order_events_action_check
  check (action in ('payment_confirmed','status_changed','refunded','canceled','note_updated',
                    'report_generated','report_regenerated','report_viewed'));

-- ─────────────────────────────────────────────────────────────
-- 리포트 저장
-- 결제 확인 직후 자동 생성(p_actor_id = null) 또는 관리자 다시 만들기(p_actor_id = 관리자 id)에서 부른다.
--
-- 새로 저장: 주문이 report_2027이고, 삭제되지 않았고, 상태가 paid 또는 in_progress일 때만.
--   리포트 저장 → 주문 상태 delivered → report_generated 기록.
-- 이미 있음: p_actor_id가 관리자이고 first_viewed_at이 null일 때만 덮어쓴다.
--   리포트 덮어쓰기(created_by = 관리자, created_at = 지금) → 주문 상태 delivered → report_regenerated 기록.
--
-- 결과: saved | regenerated | already_exists | viewed_locked | not_payable | forbidden | not_found | invalid
create or replace function public.save_order_report(
  p_order_id uuid,
  p_engine_version text,
  p_phrase_version text,
  p_input jsonb,
  p_report jsonb,
  p_actor_id uuid
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_report public.order_reports%rowtype;
begin
  if p_order_id is null
     or nullif(btrim(coalesce(p_engine_version, '')), '') is null
     or nullif(btrim(coalesce(p_phrase_version, '')), '') is null
     or char_length(p_engine_version) > 200
     or char_length(p_phrase_version) > 200
     or p_input is null or jsonb_typeof(p_input) <> 'object'
     or p_report is null or jsonb_typeof(p_report) <> 'object' then
    return 'invalid';
  end if;
  if p_actor_id is not null and not exists (
    select 1 from public.profiles pr where pr.id = p_actor_id and pr.role = 'admin'
  ) then
    return 'forbidden';
  end if;

  -- 주문 행을 잠근다. 같은 주문의 저장이 동시에 와도 하나씩 처리된다.
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    return 'not_found';
  end if;

  select * into v_report from public.order_reports r where r.order_id = p_order_id for update;

  if found then
    if p_actor_id is null then
      return 'already_exists';
    end if;
    if v_report.first_viewed_at is not null then
      return 'viewed_locked';
    end if;
    if v_order.product <> 'report_2027' or v_order.deleted_at is not null
       or v_order.status not in ('paid', 'in_progress', 'delivered') then
      return 'not_payable';
    end if;

    update public.order_reports r
       set engine_version = p_engine_version,
           phrase_version = p_phrase_version,
           input_snapshot = p_input,
           report = p_report,
           created_at = now(),
           created_by = p_actor_id
     where r.id = v_report.id;

    if v_order.status <> 'delivered' then
      update public.orders o set status = 'delivered' where o.id = p_order_id;
    end if;

    insert into public.order_events (order_id, actor_id, action, from_status, to_status)
    values (p_order_id, p_actor_id, 'report_regenerated', v_order.status, 'delivered');

    return 'regenerated';
  end if;

  if v_order.product <> 'report_2027' or v_order.deleted_at is not null
     or v_order.status not in ('paid', 'in_progress') then
    return 'not_payable';
  end if;

  insert into public.order_reports (order_id, product, engine_version, phrase_version, input_snapshot, report, created_by)
  values (p_order_id, 'report_2027', p_engine_version, p_phrase_version, p_input, p_report, p_actor_id);

  update public.orders o set status = 'delivered' where o.id = p_order_id;

  insert into public.order_events (order_id, actor_id, action, from_status, to_status)
  values (p_order_id, p_actor_id, 'report_generated', v_order.status, 'delivered');

  return 'saved';
end $$;

revoke all on function public.save_order_report(uuid, text, text, jsonb, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.save_order_report(uuid, text, text, jsonb, jsonb, uuid) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 처음 열어 본 시각 기록
-- 앱(서버)이 세션 사용자 id를 p_user_id로 넣어 부른다. 본인 주문이고, 삭제되지 않았고, delivered이고,
-- 리포트가 있을 때만 처리한다. first_viewed_at이 이미 있으면 바꾸지 않는다.
-- report_viewed 기록의 actor_id는 열어 본 사용자다(상태는 바뀌지 않으므로 from/to는 null).
--
-- 결과: viewed | already_viewed | not_found | invalid
create or replace function public.mark_report_viewed(
  p_order_id uuid,
  p_user_id uuid
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_report_id uuid;
  v_viewed timestamptz;
begin
  if p_order_id is null or p_user_id is null then
    return 'invalid';
  end if;

  perform 1
     from public.orders o
    where o.id = p_order_id
      and o.user_id = p_user_id
      and o.deleted_at is null
      and o.status = 'delivered'
      for update;
  if not found then
    return 'not_found';
  end if;

  select r.id, r.first_viewed_at into v_report_id, v_viewed
    from public.order_reports r
   where r.order_id = p_order_id
     for update;
  if not found then
    return 'not_found';
  end if;
  if v_viewed is not null then
    return 'already_viewed';
  end if;

  update public.order_reports r set first_viewed_at = now() where r.id = v_report_id;

  insert into public.order_events (order_id, actor_id, action)
  values (p_order_id, p_user_id, 'report_viewed');

  return 'viewed';
end $$;

revoke all on function public.mark_report_viewed(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_report_viewed(uuid, uuid) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 되돌리기(필요할 때만 SQL Editor에서 실행. 리포트와 리포트 처리 기록이 지워진다)
--
-- drop function if exists public.mark_report_viewed(uuid, uuid);
-- drop function if exists public.save_order_report(uuid, text, text, jsonb, jsonb, uuid);
-- delete from public.order_events where action in ('report_generated','report_regenerated','report_viewed');
-- alter table public.order_events drop constraint order_events_action_check;
-- alter table public.order_events add constraint order_events_action_check
--   check (action in ('payment_confirmed','status_changed','refunded','canceled','note_updated'));
-- drop table if exists public.order_reports;
-- -- 리포트 생성으로 delivered가 된 주문의 상태는 되돌리지 않는다. 필요하면 관리자 화면의 "한 칸 되돌리기"(delivered → in_progress)로 바꾼다.
