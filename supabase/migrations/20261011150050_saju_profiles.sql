-- 4단계 (2/3): 저장된 사주 정보
-- 실행 순서: 20261011150000_profile_consents.sql → 이 파일 → 20261011150100_orders.sql
-- 쓰기(저장·수정·삭제)는 서버 액션이 service_role로만 한다. 사용자는 본인 행 조회만 한다.
-- 삭제는 실제 삭제(hard delete)다.

-- updated_at 자동 갱신(orders에서도 같이 쓴다)
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.saju_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  is_self boolean not null default false,            -- 본인 사주 여부. 사용자당 1개만 true
  label text check (char_length(label) <= 40),       -- 구분용 이름(예: 본인, 동업자). 선택
  birth_date date not null,
  calendar text not null
    check (calendar in ('solar','lunar','lunar_leap')),  -- 양력 / 음력 / 음력(윤달)
  birth_time time,                                   -- 태어난 시각. 모르거나 입력하지 않으면 null
  time_unknown boolean not null default false,       -- "태어난 시각을 몰라요" 체크 여부
  gender text not null
    check (gender in ('female','male')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 시각을 모른다고 했으면 시각 값이 없어야 한다.
  constraint saju_profiles_time_rule check (not time_unknown or birth_time is null)
);

-- 본인 사주는 사용자당 1개
create unique index saju_profiles_one_self_idx
  on public.saju_profiles (user_id) where is_self;

create index saju_profiles_user_id_idx on public.saju_profiles (user_id, created_at);

create trigger saju_profiles_set_updated_at
  before update on public.saju_profiles
  for each row execute function public.set_updated_at();

alter table public.saju_profiles enable row level security;

-- 본인 행만 조회. 쓰기 정책은 두지 않는다.
create policy saju_profiles_select_own on public.saju_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.saju_profiles from anon, authenticated;
grant select on public.saju_profiles to authenticated;
grant all on public.saju_profiles to service_role;
