-- 2단계: profiles 테이블, 가입 시 자동 생성 트리거, is_admin()

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 본인 행만 조회·수정. insert/delete 정책은 두지 않는다.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- role 변경 차단은 정책이 아니라 권한으로 한다.
-- 테이블 권한을 모두 회수한 뒤 select만 주고, update는 허용할 컬럼에만 컬럼 단위로 준다.
-- 지금은 사용자가 고칠 수 있는 컬럼이 없어(id, role, created_at 모두 수정 금지) update 권한을 주지 않는다.
-- 나중에 수정 가능한 컬럼을 추가하면 아래처럼 그 컬럼만 열고, role은 절대 넣지 않는다.
--   grant update (display_name) on public.profiles to authenticated;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- 가입 시 profiles 행 자동 생성. role은 항상 'user'로 넣고
-- 클라이언트가 보낸 메타데이터(raw_user_meta_data)는 읽지 않는다.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'user')
  on conflict (id) do nothing;
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 트리거 생성 전에 이미 가입한 계정이 있으면 채운다.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 관리자 판별. SECURITY DEFINER라 RLS를 거치지 않으므로
-- 다른 테이블 정책에서 써도 profiles 정책과 순환참조가 생기지 않는다.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
