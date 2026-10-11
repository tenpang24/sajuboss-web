# HANDOFF — sajuboss-web

다음 세션이 이 문서만 읽고 이어서 작업할 수 있게 유지합니다. 키와 비밀번호는 쓰지 않습니다.

최종 갱신: 2026-10-11 (4단계 코드 검토 반영 직후)

## 1. 현재 단계

- **현재**: 3단계 승인됨(시안과 다르게 처리한 5가지 포함). **4단계 구현 완료, 사장님 승인 대기**: 가입 동의 기록, 사주 저장·삭제, 주문 저장(신년 리포트 사전신청), 삭제 요청, /my 연결. 브라우저 조작 검증 35건 통과(⑩ 포함).
- **다음**: 5단계(신청 폼 3종: `/apply/date`, `/apply/name`, `/apply/person`). 폼별 서버 액션은 입력을 검증해 payload를 만든 뒤 `lib/orders.ts`의 `createOrder`를 호출한다.
- 작업 지시 원문: `지시문_sajuboss.md`(1~9단계). 디자인 기준: `design/v2/`(시안 v2). 반응형 기준: `docs/RESPONSIVE.md`.

| 단계 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 1 | Next.js 뼈대, 헤더·푸터, 빈 페이지, noindex | 승인됨, push됨 | `52eebf6` |
| - | 사업자 정보 기재 | push됨 | `3bd08b3` |
| 2 | 이메일 인증, profiles, is_admin, 관리자 경로 차단 | 승인됨, **미push** | `85ac5f0` |
| - | 반응형 공통 규칙 + 검증 스크립트 (+ `design/v2/` 파일 추가) | **미push** | `ae366af` |
| 3 | 시안 v2 전환(공통 스타일, 헤더·푸터, 로그인, 내 신청) + 메인·리포트 상세 + 하단 고정 바 | 승인됨, **미push** | `579ecf4` |
| 4 | 주문 저장(orders), 삭제 요청, 약관 동의 시각, 사주 저장 | 구현·검증 완료, 승인 대기, **미push** | SQL `7f688e7`, 코드: 이 문서가 들어간 커밋 |
| 5 | 신청 폼 3종 | 시작 전 | |
| 6 | 결제·완료 화면(PG 연동 없음) | 시작 전 | |
| 7 | 관리자 화면 | 시작 전 | |
| 8 | 풀이 연결(후순위) | 시작 전 | |
| 9 | QA, 오픈 전 점검 | 시작 전 | |

**보관 브랜치 `wip/stage3-old-design`** (`f45980a`, 로컬에만 있음): 구 시안으로 만든 3단계 코드. 참고용이며 main에 합치지 않습니다.

## 2. 이번 세션에서 바꾼 파일과 이유

**시안 v2 전환(공통)**
- `app/site.css`(신규): `design/v2/site.css`를 옮긴 전역 스타일. 색·글자·간격 토큰, 버튼·카드·격자·입력·헤더·푸터·하단 고정 바. 시안의 `max-width: 720px`를 모바일 우선(`min-width: 721px`)으로 뒤집고 글자 크기를 rem으로 바꿈.
- `app/pages.css`(신규): 시안의 인라인 스타일을 화면별 클래스로 옮긴 것(로그인, 내 신청, 메인, 리포트 상세).
- `app/globals.css`: 위 두 파일을 불러오기만 함. `app/tokens.css`, `app/ui.css`는 삭제(내용이 `site.css`로 대체됨).
- `app/layout.tsx`: `<body class="site">`. viewport 설정은 유지.
- `components/ui/Button.tsx`(`Button`, `ButtonLink`, `buttonClass`), `Card.tsx`, `Badge.tsx`, `IconCircle.tsx`(+`CheckIcon`): v2 클래스에 맞춘 공통 컴포넌트.
- `components/ui/MobileBar.tsx`(신규): 모바일 하단 고정 바(금액 + 버튼). 폼·상세·결제 화면 공통.
- `lib/brand.ts`: `support`(고객센터, `[확정 후 기재]`), `copyrightYear` 추가.

**헤더·푸터**
- `components/SiteHeader.tsx`, `components/HeaderNav.tsx`(신규, 클라이언트): 메뉴 4개(오늘의 운세 / 신년 사업운 / 개업택일 / 작명), 현재 경로 강조. 버튼은 비로그인 "로그인·가입", 로그인 "내 신청".
- `components/SiteFooter.tsx`: v2 문구(고객센터, 전통 명리 원리 안내, © 표기).

**로그인·내 신청**
- `app/login/page.tsx`: v2 레이아웃(제목, 로그인/회원가입 탭, 혜택 3개). 기본은 로그인, `?mode=signup`, `?mode=reset`.
- `components/auth/AuthForms.tsx`: 회원가입에 비밀번호 확인과 약관 동의(전체, 필수 3개, 선택 1개).
- `app/login/actions.ts`: 서버에서 필수 동의 3개 확인, 비밀번호 규칙(영문·숫자 포함 8자 이상). **동의 시각은 저장하지 않음**(4단계에서 설계).
- `app/login/update-password/page.tsx`, `app/my/page.tsx`: v2 레이아웃. `/my`는 2단(신청 목록 + 내 정보).

**3단계(v2)**
- `lib/pricing.ts`: 가격 상수(가정치). 화면에 금액을 직접 쓰지 않음.
- `app/page.tsx`, `components/home/TodayForm.tsx`: 메인. 입력 폼은 UI·검증만(계산은 8단계).
- `app/report/2027/page.tsx`, `components/report/PreorderForm.tsx`, `components/report/ids.ts`: 리포트 상세. 사전신청은 `onSubmit` 자리만. 모바일 하단 고정 바 사용.

**4단계(코드)**
- `lib/products.ts`: 상품·패키지·주문 상태 허용값과 표시 이름, `REPORT_2027_IS_PREORDER`(오픈 시 false로), 신청 번호.
- `lib/validation.ts`: 서버 입력 검증(생년월일, 시각, 이메일, 전화, 텍스트 길이, 허용값).
- `lib/consents.ts`(server-only): 가입 동의 4개 시각 기록(`terms_agreed_at is null`일 때만), 필수 동의 확인.
- `lib/saju.ts`(server-only): 사주 폼 검증, 본인 사주 저장(있으면 수정)·삭제(실제 삭제). 조회(`getSelfSaju`)는 사용자 세션 클라이언트(RLS)로, 쓰기는 service_role로. 시각이 없으면 `time_unknown = true`를 서버가 명시.
- `lib/orders.ts`(server-only): `createOrder`(모든 신청의 공통 경로: 로그인 확인, 상품·패키지 규칙, 신청 동의 2개, 연락처, payload 8KB 상한, 가입 동의 확인, 연속 제출 제한 20초·시간당 10건, 금액·상태·동의 시각은 서버가 결정), `requestOrderDeletion`(preorder·requested만 비움, 결제 이후는 안내만).
- `lib/pricing.ts`: `orderAmount`(서버 금액 계산).
- `lib/supabase/admin.ts`: `createAdminClient`가 async로 바뀜(내부 초기화를 기다림). 호출부는 `await createAdminClient()`.
- `lib/supabase/server.ts`: `await connection()` 추가(프리페치 렌더링에서 세션 확인이 실행돼 로그에 프리렌더 오류가 쌓이던 것을 없앰).
- `app/login/actions.ts`: 가입 직후 동의 시각 기록. 기록에 실패하면 가입 안내에 "약관에 다시 동의" 문구를 함께 보이고(`consentRetry`), 바로 로그인된 경우에는 `/my?notice=consent-retry`로 보냄.
- `app/my/actions.ts`: 약관 동의, 사주 저장·삭제, 신청 삭제 요청 서버 액션.
- `app/report/2027/actions.ts`: 신년 리포트 사전신청 서버 액션.
- `components/saju/SajuFields.tsx`: 사주 입력 묶음(공통). `components/report/PreorderForm.tsx`: 실제 신청으로 연결, 동의 체크박스 2개. `components/my/MyClient.tsx`: 동의 카드, 사주 패널, 삭제 요청(확인 단계).
- `app/my/page.tsx`: 본인 신청 목록(컬럼 명시 조회), 저장된 사주, 약관 동의 카드.
- `scripts/check-responsive.mjs`: 임시 계정에 신청 1건·사주 1건을 넣어 `/my` 목록 화면도 확인(정리 순서 orders → saju_profiles → 계정).

**문서·검증**
- `docs/RESPONSIVE.md`: v2 토큰, 720px 분기점, 하단 고정 바 규칙 반영.
- `scripts/check-responsive.mjs`: 변경 없음(8개 폭, WebKit+Chromium).

## 3. DB 상태 (Supabase 프로젝트 ref `jmolzaubbseytkdaadgf`)

마이그레이션은 **사장님이 SQL Editor에서 직접 실행**합니다. Claude는 DDL을 실행할 수단이 없고, CLI 로그인·DB 비밀번호는 쓰지 않기로 했습니다. SQL 파일 전문을 코드 블록으로 보여주고 승인 → 실행 → REST 검증 순서입니다.

| 마이그레이션 파일 | 적용 여부 |
|---|---|
| `supabase/migrations/20261011120000_profiles.sql` | 적용됨(2026-10-11), REST 검증 30/30 통과 |
| `supabase/migrations/20261011150000_profile_consents.sql` | 적용됨(2026-10-11). 실행 순서 1. profiles에 `age_confirmed_at`, `terms_agreed_at`, `privacy_agreed_at`, `marketing_opt_in_at` 추가 |
| `supabase/migrations/20261011150050_saju_profiles.sql` | 적용됨(2026-10-11). 실행 순서 2. `saju_profiles` 테이블, `set_updated_at()` |
| `supabase/migrations/20261011150100_orders.sql` | 적용됨(2026-10-11). 실행 순서 3. `orders` 테이블 |

**테이블 `public.profiles`**: `id`(auth.users FK, on delete cascade), `role`('user'|'admin', 기본 'user'), `created_at`.
- RLS 켜짐. 정책: `profiles_select_own`, `profiles_update_own`(둘 다 본인 행, authenticated).
- 권한: anon 없음. authenticated는 `select`만. **update grant는 어떤 컬럼에도 없음**(role 변경을 권한으로 차단). service_role은 all.
- 실제 가입 계정 0(관리자 없음).

**함수**
- `public.handle_new_user()`: auth.users insert 트리거(`on_auth_user_created`). SECURITY DEFINER, `search_path=''`, role은 항상 'user', 메타데이터 미사용.
- `public.is_admin()`: SECURITY DEFINER, `search_path=''`. execute는 authenticated만(PUBLIC·anon 회수).

**테이블 `public.saju_profiles`**: 저장된 사주. RLS 켜짐, 정책 `saju_profiles_select_own`. authenticated는 select만, 쓰기는 service_role. 본인 사주 1개 제한(부분 unique index), 계정 삭제 시 cascade.

**테이블 `public.orders`**: RLS 켜짐, 정책 `orders_select_own`(본인 + 삭제되지 않은 주문). authenticated는 컬럼 단위 select만(`admin_note`, `deleted_at` 제외), 쓰기는 service_role. 계정 삭제는 restrict.

**profiles 동의 컬럼 4개**: `age_confirmed_at`, `terms_agreed_at`, `privacy_agreed_at`, `marketing_opt_in_at`. 사용자 수정 불가.

**함수 `public.set_updated_at()`**: orders, saju_profiles의 updated_at 트리거.

현재 세 테이블 모두 0행.

**4단계 DB 검증 결과**(2026-10-11, 임시 계정 3개로 수행 후 삭제, 잔여 행 0)
- 사전 점검 6건, ①~⑨, ⑪, ⑬~㉔ 모두 통과(거부는 42501/23514/23502/23505 정확히 일치, 허용은 행 수 일치).
- ㉓ 확인됨: `deleted_at`이 RLS 조건에 쓰이고 열 grant에서 빠져 있어도 본인 주문의 컬럼 명시 조회는 정상(grant 변경 불필요).
- **⑫·㉕ 코드 불일치**: 주문이 있는 계정 삭제는 막혔지만(계정·주문 그대로 남음) Auth 관리 API가 `23503`이 아니라 코드 없는 HTTP 500을 돌려줌. `23503` 자체는 REST로 확인 불가. 필요하면 SQL Editor에서 직접 확인.
- **⑩ 통과**(코드 구현 후 브라우저로 확인): paid·in_progress·delivered·refunded 주문에 삭제 요청 시 안내 문구만 나오고 payload·연락처·상태가 그대로.
- 첫 실행 시도 때는 사전 점검이 PGRST205·42703으로 실패해 중단했고, 사장님이 다시 실행·스키마 리로드한 뒤 통과함.
- 검증 스크립트는 저장소에 없음(세션 임시 폴더). 다시 필요하면 같은 항목으로 새로 작성.

**4단계에서 확정된 것**(사장님 결정, SQL 적용됨)
- 상품 4종: `report_2027`, `date`, `name_biz`, `name_person`. 개명은 `name_person`의 한 종류(`payload.kind`: baby/adult/rename).
- 패키지: `name_biz`, `name_person`은 필수(basic/detail), `report_2027`, `date`는 null.
- 상태에 `preorder` 추가: 신년 리포트 사전신청(결제 아님)에만 사용(check). 마이페이지 표시는 "사전신청 완료".
- `deleted_at`이 있으면 `status = canceled`(check). 삭제 요청 서버 함수는 `preorder`·`requested`만 canceled로 바꾸고 비움. 결제 이후 상태는 비우지 않음.
- 가입 동의 4개 컬럼은 **가입 서버 액션이 service_role로 기록**(`terms_agreed_at is null`일 때만). 신청 서버 액션은 필수 동의가 비어 있는 계정의 신청을 막음.
- 신청 동의(`consent_privacy_at`, `consent_disclaimer_at`)는 서버가 체크박스 2개를 확인한 뒤 서버 시각으로 기록. 신년 리포트 사전신청 카드에도 체크박스 2개를 추가.
- `saju_profiles`의 시각 규칙은 하나: `(birth_time is null) = time_unknown`. 폼에서 시각을 비워 두면 서버 액션이 `time_unknown = true`로 저장(기본값 없음, 서버가 항상 명시).
- `saju_profiles`: 본인 사주는 사용자당 1개(부분 unique index). 쓰기는 service_role만, 사용자는 본인 행 조회만, 삭제는 실제 삭제. 계정 삭제 시 함께 삭제(cascade).
- 소상공닷컴 `saju_profiles` 스키마는 받지 못함(`_import/sosangkong` 없음). 컬럼은 사장님이 정한 최소 컬럼 기준. 8단계에서 계산 엔진 파일을 받으면 이름·형식 차이를 확인.
- `calendar` 값은 `solar`/`lunar`/`lunar_leap`. 메인 입력 폼의 `lunar-leap`은 4단계 구현 때 `lunar_leap`으로 맞춤.
- `orders` 조회는 `select('*')` 금지, 컬럼 명시(CLAUDE.md 코드 규칙).

**참고**: SQL 실행 직후 REST가 테이블을 못 찾으면(`PGRST205`/`PGRST202`) SQL Editor에서 `notify pgrst, 'reload schema';` 실행.

## 4. 환경변수 (이름만)

| 이름 | 용도 | `.env.local` | Vercel |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 주소 | 있음 | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon 키 | 있음 | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용. `NEXT_PUBLIC_` 금지 | 있음 | Production, Preview (Secret) |
| `NEXT_PUBLIC_KAKAO_LOGIN_ENABLED` | `true`면 카카오 버튼 활성 | 없음(비활성) | 없음(비활성) |

- `.env.local`은 `.gitignore`(`.env*`)로 제외. `.env.example`만 커밋.
- service_role 키를 읽는 코드는 `lib/supabase/admin.ts`(앱)와 `scripts/check-responsive.mjs`(로컬 검증)뿐.

## 5. 미커밋·미push

- 미커밋 변경: 없음(이 문서 커밋 후 기준).
- **미push 커밋 있음**: 2단계 이후 전부(`85ac5f0`부터). **사장님이 승인하기 전에는 push 금지.** push하면 Vercel 프로덕션에 배포됨.
- 원격: `https://github.com/tenpang24/sajuboss-web.git`, 브랜치 `main`.
- 커밋 작성자는 이 저장소 로컬 설정(`tenpang24 <tenpang24@gmail.com>`). 전역 git 설정은 건드리지 않음.

## 6. 사장님 확인·결정 대기

1. **4단계 승인**. (⑫·㉕는 사장님이 수용함: 삭제가 막히고 계정·주문이 남는 것으로 충분.)
1-1. **사전신청 완료 후 이동 위치**: 지시문은 `/done/[id]`지만 그 화면이 6단계라, 지금은 `/my?notice=preorder-done`으로 보냄. 6단계에서 바꿀 예정.
1-2. **연속 제출 제한 값**: 같은 사용자 20초 간격, 1시간 10건(`lib/orders.ts`). 조정이 필요하면 알려 주기.
1-3. **같은 사주로 사전신청을 여러 번 하는 것**은 막지 않음(다른 사람 사주로도 신청할 수 있어서). 중복 방지가 필요하면 규칙 결정 필요.
2. **push**: 사장님이 Supabase URL Configuration과 비밀번호 정책을 설정한 뒤 **"push 진행"이라고 하면** push. push 후 Vercel 배포 상태와 `https://sajuboss.com`, `/report/2027`, `/login` 응답을 확인해 보고.
3. **리디렉션 방향**: 대표 주소는 `https://sajuboss.com`으로 결정됨. 사장님이 Vercel에서 www→apex로 바꾸기로 했으나 마지막 확인(2026-10-11) 시 아직 apex→www(308). 바뀐 뒤 방향 확인 필요.
4. **통신판매업 신고번호**: 확인 중. `lib/brand.ts`에 `[확인 후 기재]`.
6. **이용약관·개인정보처리방침 문서**: 없음. 가입 화면의 "보기"와 푸터 링크가 `#`.
9. **검증 스크립트의 임시 계정**: `check:responsive`가 실행마다 운영 DB에 임시 관리자 계정을 만들고 지움. 원치 않으면 `--no-auth` 기본값으로 변경.
10. **실제 메일 흐름**(가입 인증, 비밀번호 재설정): 사장님이 직접 확인하기로 함.
11. **관리자 계정 지정**: 가입 후 SQL Editor에서 `update public.profiles set role = 'admin' where id = '<uid>';`.
12. **사주 계산 소스·문구 데이터**(8단계): 사장님이 파일로 전달 예정. Claude가 소상공닷컴 저장소에 접근해 가져오지 않음.
13. **카카오 로그인 키**: 없음. 버튼은 "카카오로 시작하기 (준비 중)" 비활성.
14. **결제 이후 주문의 삭제·보존 정책**(4단계): 사장님이 법무 확인 후 확정. 그 전까지 `[확정 후 기재]`.

## 7. 알려진 문제와 임시 처리(TODO)

- `components/home/TodayForm.tsx`: 검증 통과 시 "준비 중" 안내만 표시. 실제 계산은 8단계.
- 신청 폼 3종(5단계)이 아직 없어, 실제로 만들 수 있는 신청은 신년 리포트 사전신청뿐. `createOrder`는 4개 상품을 모두 받지만 택일·작명의 폼별 입력 검증은 5단계에서 추가.
- 가입 화면의 실제 가입 성공 → 동의 기록 경로는 실제 메일이 필요해 끝까지 확인하지 못함. 같은 기록 함수(`recordSignupConsents`)를 쓰는 /my의 약관 동의 경로는 브라우저로 확인함.
- 가입 동의 기록 실패 안내(`consentRetry`)는 실패 상황을 만들 수 없어 실제 동작을 확인하지 못함(코드 검토와 빌드만).
- 사장님 화면에서 언어 표시가 붙은 코드 블록이 보이지 않는 일이 반복됨. 코드·SQL 전문을 보여줄 때는 언어 표시 없는 코드 블록으로 출력하고, 검토용 묶음 파일도 함께 만든다(`Desktopsajuboss-review`, 저장소 밖).
- 연속 제출 제한은 조회 후 저장 방식이라, 같은 순간에 동시에 들어온 두 요청은 둘 다 통과할 수 있음(금전 피해는 없음. 필요하면 DB 제약으로 보강).
- 메인의 "오늘의 사업운" 입력은 저장된 사주와 아직 연결하지 않음(8단계).
- 검증 스크립트(DB 검증, 4단계 브라우저 검증)는 저장소에 없음(세션 임시 폴더). `scripts/check-responsive.mjs`만 저장소에 있음.
- 메인 히어로의 예시 카드: 시안에는 날짜("10월 11일")가 있으나, 고정 날짜는 금방 틀려 보여 "예시 · 오늘의 한마디"로 표기.
- `/apply/*`, `/pay/[orderId]`, `/done/[orderId]`, `/admin/orders`: 제목만 있는 빈 페이지(`PageStub`). v2 시안은 `design/v2/Date·Name·Person·Pay·Done.dc.html`.
- 푸터 "이용약관", "개인정보처리방침": 링크가 `#`(문서 미정).
- 파비콘: Next.js 기본 아이콘.
- 미정 문구가 두 종류: `[확정 후 기재]`(계열 문구 포함)와 `[확인 후 기재]`(신고번호). 9단계에서 둘 다 검색.
- **실기기·인앱 브라우저 미확인**: 반응형과 폼 동작은 Playwright(WebKit, Chromium 에뮬레이션)로만 확인. 카카오톡·인스타그램·네이버 인앱 브라우저, 실제 키보드가 올라온 상태는 미확인.
- **실제 가입·로그인 성공 흐름 미확인**: 가입 거부(필수 동의 없음, 비밀번호 규칙, 확인 불일치)는 브라우저로 확인. 가입 성공과 인증 메일은 실제 메일이 필요해 사장님 확인 대기.
- 하단 고정 바는 `position: sticky`라 전체 페이지 스크린샷에서는 화면 중간에 찍혀 보임(실제 화면에서는 아래에 붙음. 브라우저로 위치 확인함).
- 이 PC의 `curl`은 인증서 폐기 확인 실패로 `--ssl-no-revoke`가 필요. 로컬 DNS가 `sajuboss.com`을 옛 주소로 줄 때가 있어 `--resolve`로 Vercel IP를 지정해 확인함.
- Next.js 16.4: `middleware`가 아니라 `proxy.ts`. `cacheComponents`가 켜져 있어 쿠키·`searchParams`·`usePathname`을 읽는 컴포넌트는 `<Suspense>` 안에 둬야 하고, 렌더링 중 `new Date()`를 쓰면 빌드가 막힘. `"use client"` 파일에서 상수를 내보내 서버 컴포넌트에서 쓰면 안 됨(`components/report/ids.ts` 참고). 코드 작성 전 `node_modules/next/dist/docs/` 확인(`AGENTS.md`).

## 8. 다음 세션 시작 순서

```
git status -sb                     # 미커밋·미push 확인
git log --oneline -8               # 위 표의 커밋과 일치하는지
npm install                        # 필요 시
npx tsc --noEmit
npm run lint
npm run build
npm run check:responsive           # 처음이면 먼저: npx playwright install chromium webkit
```

1. 이 문서와 `docs/RESPONSIVE.md`를 읽고 현재 상태를 요약한다.
2. 6번 목록에서 사장님 답이 온 항목을 처리한다(특히 4단계 SQL 승인, "push 진행").
3. SQL이 승인되고 사장님이 SQL Editor에서 실행했다고 하면(`…_profile_consents.sql` → `…_saju_profiles.sql` → `…_orders.sql` 순서) 아래 검증을 수행. 결정에 따라 SQL을 고쳤다면 고친 파일 전문을 다시 보여주고 승인받는다.
4. 실행 확인 후 검증 ①~㉒을 REST로 수행(목록은 4단계 보고에 있음: 지시문 ①~⑩ + ⑪ 음수 금액 23514, ⑫ 주문 있는 계정 삭제 23503, ⑬~⑯ 가입 동의 컬럼, ⑰ preorder를 report_2027 외에 쓰면 23514, ⑱ deleted_at만 있고 canceled가 아니면 23514, ⑲ saju_profiles 권한과 본인 사주 2개째 23505, ⑳ 계정 삭제 시 saju_profiles 함께 삭제, ㉑ birth_time null + time_unknown false 23514, ㉒ birth_time 있음 + time_unknown true 23514)(임시 계정은 무작위 `@example.com`, `email_confirm: true`, 끝나면 삭제하고 잔여 행 확인. 거부는 기대 오류 코드로 판정, `PGRST205`/`PGRST202`는 실패. 사전 점검에서 이 코드가 나오면 멈추고 보고).
5. 새 화면은 `design/v2/`의 해당 시안과 `app/site.css` 클래스를 쓰고, 금액 + 버튼이 있는 화면에는 `MobileBar`를 넣는다.
6. 단계 보고 직전에 이 문서를 갱신해 같은 커밋에 넣고, 보고 끝에 "HANDOFF.md 갱신됨(변경 요약 3줄)"을 붙인다.

## 9. 작업 방식(이 프로젝트에서 정해진 것)

- 한 단계씩 진행. 단계 끝에 변경 파일·검증 결과·`check:responsive` 결과를 보고하고 승인받은 뒤 다음 단계.
- 마이그레이션 SQL은 실행 전에 파일 전문을 코드 블록으로 보여주고 승인받는다.
- push는 사장님 승인 후에만.
- 키·비밀번호는 출력·커밋·문서 어디에도 쓰지 않는다. 검증 스크립트는 이름과 통과 여부만 출력.
- 소상공닷컴과 저장소·DB·계정을 모두 분리. 그쪽 코드를 import하거나 저장소에 접근하지 않는다.
- 가격은 `lib/pricing.ts`, 브랜드·사업자 정보는 `lib/brand.ts`에서만.
- 후기·이용자 수·통계를 만들지 않는다. "예시/샘플" 표시 유지. 시안의 예시 데이터를 실제 데이터처럼 화면에 넣지 않는다.
- 사주 입력값(`payload`)은 로그·에러 리포트에 출력하지 않는다.
