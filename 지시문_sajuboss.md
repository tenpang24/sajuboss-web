# Claude Code 지시문 — sajuboss.com (사장님 운세, 가칭) 신년 시즌 오픈

**독립 사이트**입니다. 소상공닷컴(sosangkong-web)과 저장소, Supabase 프로젝트, Vercel 프로젝트, 사용자 계정을 모두 분리합니다. 소상공닷컴 코드를 import하거나 같은 DB를 쓰지 마세요. 필요한 로직은 **복사**해서 가져옵니다.

스택은 소상공닷컴과 같은 Next.js + Supabase + Vercel을 씁니다. 아래 단계를 **한 단계씩** 진행하고, 단계가 끝날 때마다 변경 파일·검증 결과를 보고한 뒤 내 승인을 받고 다음으로 넘어가 주세요. 결제 연동은 하지 않습니다(UI + 사전신청 저장까지).

## 0. 공통 전제 (모든 단계에 적용)

- 도메인은 sajuboss.com입니다. 사이트 이름 "사장님 운세"는 가칭이라 `lib/brand.ts` 한 파일에 상수(이름, 도메인, 가칭 배지 표시 여부)로 두고 화면은 그 값만 읽게 하세요. 이름이 바뀔 때 한 곳만 고치게 하기 위해서입니다.
- 디자인 시안 7장(메인, 신년 리포트 상세, 개업택일 폼, 작명 폼, 개인·개명 폼, 결제, 신청 완료)은 내가 별도로 보여줍니다. 시안: https://claude.ai/artifact/QVRHrVKATZfTuQ6cZ7GHL1 (본문 HTML을 붙여넣어 드리겠습니다). 시안의 레이아웃과 문구를 우선합니다.
- **시안에서 바꿀 점**: 시안에는 소상공닷컴 연결 요소가 있습니다. 전부 제거하세요. 구체적으로 헤더의 "소상공닷컴 ↗" 링크, 메인의 "소상공닷컴 회원이세요?" 띠(`#member`), FAQ·카피의 소상공닷컴 언급입니다. 메인의 그 자리는 "무료 회원가입으로 내 사주를 저장하기" 띠로 대체하세요(문구는 시안 톤을 따라 새로 쓰고 보여주세요).
- 색상 토큰은 시안의 그린 계열을 `tokens.css`에 새로 정의합니다: 주색 #0B7A5A, 짙은 잉크 #13302A, 본문 보조 #53675F, 라인 #D5E8DF, 배경 #F6FBF8, 포인트 노랑 #FFD84D. 공통 컴포넌트(Button/Card/Badge/IconCircle)는 소상공닷컴 킷을 참고해 이 저장소에서 새로 만드세요.
- 경로는 루트 기준입니다: `/`(메인), `/report/2027`, `/apply/date`, `/apply/name`, `/apply/person`, `/pay/[orderId]`, `/done/[orderId]`, `/admin/orders`, `/login`, `/my`. 시안 안의 링크(Main.dc.html 등)는 이 경로로 바꾸세요.
- 미정 항목은 시안처럼 `[확정 후 기재]` 문자열을 화면에 그대로 둡니다. 환불 규정, 개인정보 항목·보관기간, 결제수단, 전달 시기, 역술가 검수 범위, 고객센터, 신청 번호 형식, **사업자 정보 전체**(상호·대표자·사업자등록번호·통신판매업 신고번호·주소)가 해당합니다. 소상공닷컴의 사업자 정보를 가져와 채우지 마세요. 어떤 사업자로 운영할지는 내가 따로 정합니다.
- 후기, 이용자 수, 통계는 지어내지 않습니다. 시안의 "예시/샘플" 라벨을 유지하세요.
- 가격은 검증 전 가정치이므로 `lib/pricing.ts` 한 파일의 상수로만 두고 화면은 그 상수를 읽게 하세요. 신년 리포트 3,900 / 개업택일 9,900~ / 상호·브랜드 작명 기본 29,000·상세 99,000 / 개인·개명 기본 49,000·상세 99,000 / 택일 동업자 추가 +10,000.
- 법적 고지(참고용, 투자·법률·의료 판단 대체 아님, 상표·중복상호 확인 안내, 개명은 법원 허가 필요, 인명용 한자 확인)는 시안의 문구를 그대로 쓰세요.
- 모든 테이블은 만들 때 **RLS를 켜고** 정책을 같이 작성하세요. 소상공닷컴에서 RLS 누락, role 검증 누락, 정책 순환참조가 있었으니, 정책 추가 후 anon·다른 계정의 접근 차단을 REST로 직접 확인하세요. 회원가입 시 role 값을 클라이언트가 정하게 두지 마세요(기본 `user`, 관리자는 DB에서만 지정).
- 각 단계 끝에 `tsc` 통과, 해당 화면 실제 렌더링 확인(모바일 폭 포함), 커밋까지 하세요.

## 1단계. 프로젝트 생성과 배포 골격

1. 새 GitHub 저장소 `sajuboss-web`을 만들고 Next.js(App Router, TypeScript) 뼈대를 생성합니다. 저장소·Supabase 프로젝트·Vercel 프로젝트 이름은 모두 `sajuboss`로 통일하세요.
2. 새 Supabase 프로젝트 연결(환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 `.env.local`과 Vercel에만 두고 커밋하지 마세요). 키는 내가 직접 넣습니다. 필요한 설정 순서를 안내만 해 주세요.
3. Vercel Production 배포 후, sajuboss.com 도메인 연결 절차를 안내하세요(DNS 설정은 내가 직접 합니다).
4. `app/layout.tsx`에 시안의 헤더(로고 + 가칭 배지, 메뉴 4개, 로그인)와 푸터(사업자 정보 자리표시)를 만듭니다. 폰트는 Noto Sans KR 하나만 씁니다.
5. 위 경로 전부를 빈 페이지 + 제목으로 먼저 생성합니다.
6. `<title>`, `description`, OG 이미지 자리, `robots`는 **사이트가 오픈 승인되기 전까지 noindex**로 두세요. 오픈할 때 내가 풀라고 요청합니다.

## 2단계. 인증 (이메일 + 소셜)

1. Supabase Auth로 이메일 가입/로그인 + 카카오 로그인(소셜은 키가 있을 때만 활성화, 없으면 버튼만 비활성).
2. `profiles` 테이블(`id` = auth uid, `role` 기본 'user', `created_at`)과 가입 시 자동 생성 트리거. role 변경은 RLS로 본인 불가.
3. `/login`, `/my`(내 신청 목록, 내 사주 정보 삭제 버튼 자리). 비밀번호 재설정 포함.
4. 관리자 판별 함수 `is_admin()`을 `SECURITY DEFINER` + `set search_path = ''`로 만들고 authenticated에 execute 권한을 주세요. orders 정책에는 쓰지 않지만 서버 액션의 관리자 확인에 씁니다. 이후 정책에서 쓸 때 같은 테이블을 직접 조회하면 순환참조가 나므로 반드시 이 함수 방식으로 하세요.

## 3단계. 메인(/)과 신년 리포트 상세

1. 메인: 히어로, "오늘의 사업운" 예시 카드, 생년월일시 입력 폼, 상품 카드 3개, 풀이 방식 3단계, 고민 5개 타일, 회원가입 유도 띠(위 "바꿀 점" 참고), FAQ.
2. 오늘의 사업운 카드는 우선 정적 예시 + "예시 화면" 배지를 유지합니다. 입력 폼은 UI와 검증만 만들고, 실제 계산은 7단계에서 연결합니다.
3. 신년 리포트 상세: 시안의 커버, 구성 5개 카드, 12개월 샘플 차트(색 외에 텍스트 범례 유지), 샘플 월 카드와 잠금 카드, 풀이 방식·알아두실 점, 크로스셀. 차트는 SVG 또는 div 막대로 그리고 차트 라이브러리는 추가하지 마세요.
4. "사전신청하기"는 4단계 저장 로직에 연결할 수 있게 `onSubmit` 자리만 만들어 두세요.

## 4단계. 사전신청·주문 저장 (DB)

마이그레이션 `supabase/migrations/…_orders.sql`을 만들고 내용을 보여준 뒤 승인받아 실행하세요. 아래 DDL을 기준으로 하되, 실행 전에 문제가 없는지 한 번 더 검토해 보고하세요.

```sql
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  product text not null
    check (product in ('report_2027','date','name_biz','name_person','name_rename')),
  package text
    check (package in ('basic','detail')),
  status text not null default 'requested'
    check (status in ('requested','paid','in_progress','delivered','canceled','refunded')),
  amount_krw int not null check (amount_krw >= 0),   -- 신청 시점 금액 스냅샷(가정치)
  contact_email text,                                -- 삭제 요청 시 비우므로 nullable
  contact_phone text,
  consent_privacy_at timestamptz not null,
  consent_disclaimer_at timestamptz not null,
  payload jsonb,                                     -- 폼 입력 전체. 삭제 요청 시 null
  admin_note text,                                   -- 내부 메모. 사용자에게 절대 노출 금지
  deleted_at timestamptz,                            -- 사용자 삭제 요청 시각
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 작명 3종은 패키지 필수, 리포트·택일은 패키지 없음
  constraint orders_package_rule check (
    (product in ('name_biz','name_person','name_rename') and package is not null)
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
```

- **생성 경로**: 주문 생성, 삭제 요청, 상태 변경은 서버 액션에서 `service_role` 클라이언트로만 처리합니다. `service_role` 키는 서버 전용 환경변수로만 두고 `NEXT_PUBLIC_` 접두어를 절대 쓰지 마세요. 서버 액션은 `auth.getUser()`로 로그인한 사용자를 확인한 뒤 `user_id`를 그 값으로 직접 채웁니다(클라이언트가 보낸 user_id 무시).
- **admin_note 노출 차단**: 컬럼 권한(grant)으로 일반 사용자의 select에서 admin_note와 deleted_at을 뺐고, 삭제된 주문은 정책으로 본인 조회에서도 숨깁니다. 그래서 supabase-js에서는 `select('*')`가 권한 오류가 나므로 항상 컬럼을 명시해서 조회하세요. **관리자는 별도 경로**입니다. 관리자 화면은 서버 액션에서 먼저 `is_admin()`(또는 profiles.role)을 확인한 뒤 `service_role`로 읽고 쓰며, 이때 admin_note도 처리합니다. 관리자가 자기 JWT로 orders를 직접 쿼리하는 구조는 만들지 마세요. 사용자에게 결과를 보여줄 필요가 생기면 `admin_note`와 별개로 `result_text` 컬럼을 추가하세요.
- **금액**: 서버가 `lib/pricing.ts`로 계산한 값만 insert합니다. 폼 제출 서버 액션은 필수 항목·날짜 형식·이메일 검증, 두 동의 체크 필수 검증 후 성공 시 `/done/[id]`로 이동합니다.
- **삭제와 탈퇴**: 삭제 요청은 서버 함수로 `payload`, `contact_email`, `contact_phone`을 null로 바꾸고 `deleted_at=now()`, `status='canceled'`를 기록합니다. **단, 결제 이후 상태(`paid`, `in_progress`, `delivered`, `refunded`)의 주문은 즉시 비우지 마세요.** 전자상거래법상 계약·대금결제 기록의 보존 의무(통상 5년, 분쟁 기록은 3년으로 알려져 있으나 내가 법무 확인 후 확정)와 부딪힐 수 있습니다. 그런 주문에 대한 삭제 요청은 접수 안내("고객센터로 문의해 주세요" `[확정 후 기재]`)만 보여주고 데이터는 건드리지 않으며, 분리 보관·보존기간 후 파기 정책은 `[확정 후 기재]`로 둡니다. 미결제(`requested`, `canceled`) 주문만 즉시 비웁니다. 회원 탈퇴도 같은 기준을 따르고, 결제 이후 주문이 있으면 탈퇴 처리 전에 나에게 확인을 요청하도록 막아 두세요. `on delete restrict`로 주문이 실수로 지워지지 않게 하는 것은 그대로입니다.
- **검증**: 마이그레이션 후 아래를 REST로 직접 확인해서 결과를 보고하세요. ① anon이 orders를 조회·삽입하지 못함 ② 일반 사용자 A가 사용자 B의 주문을 조회하지 못함 ③ 일반 사용자가 `admin_note`를 select하지 못하고 `select('*')`는 권한 오류가 남 ④ 일반 사용자가 insert·update·delete 하지 못함 ⑤ 작명 상품에 package 없이 insert하면 거부됨 ⑥ NULL product로 insert하면 거부됨 ⑦ deleted_at만 찍고 payload를 남기는 update가 check 제약으로 거부됨(service_role로 시험) ⑧ 삭제된 주문이 본인 목록에서 보이지 않음 ⑨ 일반 사용자 계정으로 본인 주문 조회가 정상 동작함(정책이 `deleted_at`을 참조하지만 컬럼 select 권한은 뺐으므로 42501이 나는지 확인. 나면 `deleted_at`을 grant 목록에 추가하되 보고) ⑩ 결제 이후 상태 주문은 삭제 요청해도 payload·연락처가 유지됨.
- 사주 입력값은 민감하므로 `payload`를 로그·에러 리포트에 출력하지 마세요.

## 5단계. 신청 폼 3종

시안의 항목 순서를 그대로 구현합니다.

1. `/apply/date`(개업택일): 개업 유형, 업종·지역, 대표자 생년월일시(양/음력, 시각 모름 체크), 날짜 범위와 피할 날짜, 동업자 추가(+10,000), 연락처, 요청사항, 동의 2개. 오른쪽 신청 요약은 입력에 따라 금액이 실시간으로 바뀝니다.
2. `/apply/name`(상호·브랜드): 유형, 사업 소개, 원하는 느낌 칩, 대표자 정보, 기존 후보, 패키지 선택(기본/상세), 연락처, 동의 2개, KIPRIS·상호 검색 확인 안내문.
3. `/apply/person`(개인·개명): 유형 3종(신생아/성인/개명), 이름 받을 분 정보, 성씨·현재 이름·개명 사유, 가족 정보(선택), 원하는 이름, 패키지, 개명 법원 허가 안내, 인명용 한자 안내.
4. 세 폼 위쪽 탭(개업택일 / 작명 / 개인·개명)으로 서로 이동합니다. 시안의 개업택일·작명 화면에는 개인·개명 탭이 빠져 있으니 **세 화면 모두 3탭으로 통일**하세요.
5. 시각을 모르는 경우의 제공 범위 문구는 `[확정 후 기재]` 그대로 둡니다.

## 6단계. 결제·완료 화면 (결제 연동 없음)

1. `/pay/[orderId]`: 주문 상품, 신청자 확인, 결제수단 영역, 환불·결제 안내, 동의. 결제수단과 환불 문구는 `[확정 후 기재]`입니다. 결제 버튼은 **PG를 호출하지 않고** "결제 준비 중" 안내로 둡니다. 1차는 관리자 수동 확인 방식이라 신청 시 `status='requested'`로 저장됩니다.
2. 나중에 PG(토스페이먼츠 등)를 붙일 때 바뀌는 지점을 `lib/payment.ts`의 함수 하나(`confirmPayment(orderId)`)로 분리해 두세요.
3. `/done/[orderId]`: 접수 내역(신청 번호는 주문 id 앞 8자리), 진행 순서 3단계, 홈/리포트 버튼. 본인 주문만 조회 가능해야 합니다.

## 7단계. 관리자 화면

1. `/admin/orders`: 신청 목록(상품·상태·금액·신청일 필터), 상세에서 payload 확인, 상태 변경(requested → paid → in_progress → delivered / canceled / refunded), 내부 메모(admin_note) 입력. 삭제 요청된 주문(deleted_at)은 payload 없이 상태만 표시합니다.
2. 접근은 `is_admin()`인 계정만. 관리자 계정은 DB에서 직접 `role='admin'`으로 지정합니다.
3. 결과 전달은 1차로 이메일 수동 발송입니다. 자동 발송은 만들지 마세요.

## 8단계. 풀이 연결 (후순위)

1. 메인 입력 폼 제출 시 오늘의 사업운을 실제로 보여주기. 사주 계산(절기 기준 만세력)과 문구뱅크는 이 저장소에서 새로 만듭니다. 소상공닷컴의 `calcSaju`와 `fortune_content_bank` 소스·데이터는 내가 별도로 넘겨주는 파일을 복사해서 쓰고, 네가 소상공닷컴 저장소에 접근해 가져오지 마세요.
2. 신년 월별 리포트 생성기는 별도 설계 후 진행합니다(문구 뱅크 확장이 선행). 이 단계는 지금 구현하지 마세요.

## 9단계. QA와 오픈 전 점검

- 비로그인, 일반 회원, 관리자 3종 계정으로 전 화면 순회, 모바일 폭 확인.
- 다른 사람의 주문 id로 `/pay/[id]`·`/done/[id]` 접근 차단, 필수 동의 미체크·날짜 형식 오류·금액 조작 시도 거부를 확인.
- 화면에 남아 있는 `[확정 후 기재]` 목록을 정리해 보고하세요. 오픈 전에 내가 채울 체크리스트로 씁니다.
- 소상공닷컴 흔적(문구, 링크, 색 코드, 로고)이 남아 있지 않은지 검색해서 보고하세요.
- noindex 해제, sitemap, OG 이미지는 내가 오픈을 승인하면 진행합니다.

## Claude Code가 시작 전에 나에게 물어볼 것

1. 사업자 정보(상호·대표자·사업자등록번호·통신판매업 신고번호)를 누구 명의로 쓸지. 확정 전에는 자리표시로 둡니다.
2. 카카오 로그인 키가 준비되어 있는지(없으면 1차는 이메일 로그인만).
3. 소상공닷컴의 사주 계산 소스와 문구 데이터를 이 프로젝트로 가져올 때 내가 파일로 줄지.
