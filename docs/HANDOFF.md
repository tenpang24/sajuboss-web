# HANDOFF — sajuboss-web

다음 세션이 이 문서만 읽고 이어서 작업할 수 있게 유지합니다. 키와 비밀번호는 쓰지 않습니다.

최종 갱신: 2026-10-14 (8-A 사주 계산 엔진 이식·정확도 검증 완료, 승인 대기, 미push)

## 1. 현재 단계

- **8-A 구현·검증 완료(2026-10-14), 승인 대기, 미push**: 소상공닷컴 사주 계산 코드 원본 보관(`_import/sosangkong/`), 우리 엔진 `lib/saju-engine/`(server-only, 4주·일진·관계·보정 옵션·한국 음력 변환), 한국천문연구원 자료로 만든 자동 테스트 29개(`npm run test:saju`) 모두 통과. 보정 기본값은 모두 꺼짐(사장님 결정 대기, 6번 0000). 화면·DB·스위치 변경 없음. 십성·대운·택일·작명·문구는 아직 없음.
- **7단계 push·배포 완료(2026-10-14, `cb27a77`)**: 관리자 처리 기록 테이블 `order_events`와 관리자 처리 함수 4개(SQL 적용됨), 관리자 화면 `/admin/orders`(목록·필터), `/admin/orders/[orderId]`(상세·입금 확인·상태 변경·환불 기록·내부 메모). 검증: DB 77건, 브라우저 79건, 반응형 quick 20개 경로 160회 모두 통과. 스위치 커밋 값은 그대로(`APPLY_FORMS_OPEN = false`, `PAYMENT_MODE = "off"`, `PAYMENT_PG_PROVIDER = "none"`).
- **6-A 승인됨(2026-10-13), push·배포 완료(`96163e6`)**: 결제 기록 테이블 `payments`와 결제 확인 함수 `confirm_order_payment`(SQL 적용됨), 결제 모듈 `lib/payment.ts`, 결제 화면 `/pay/[orderId]`, 완료 화면 `/done/[orderId]`, 결제 모드 스위치. **PG는 연결하지 않았고 실제 결제는 일어나지 않는다.** 커밋 값은 `PAYMENT_MODE = "off"`, `PAYMENT_PG_PROVIDER = "none"`, `APPLY_FORMS_OPEN = false`. 검증: DB 52건, 브라우저 82건(off 25, manual 계좌 없음 6, manual 19, pg 미연결 8, pg 모의 결제 운영 빌드 8, pg 모의 결제 개발 서버 16), 5단계 회귀(열림 88, 닫힘 16), 반응형 quick 19개 경로 152회 모두 통과.

- **현재**: 4단계 승인됨(2026-10-12). 사장님이 프로덕션 가입·사전신청 실사이트 확인을 마쳤다고 알림. **5단계 구현 완료, 사장님 승인 대기**: 신청 폼 3종(`/apply/date`, `/apply/name`, `/apply/person`), 폼별 서버 검증, 오픈 스위치 `APPLY_FORMS_OPEN`(커밋 값 false). 브라우저 조작 검증: 닫힌 상태 16건, 열린 상태 88건 통과(결정 반영 뒤 다시 실행).
- **다음**: 사장님 결정에 따라 6-B(PG 연동, PG 결정·키 필요) 또는 8단계(풀이 연결, 계산 소스 파일 필요) 또는 9단계(QA). manual 모드는 관리자 확인 화면이 생겼으므로 켤 수 있는 조건이 됐지만, 켜기 전에 계좌 환경변수 3개 입력, 입금 안내 문구 확인, manual 모드 화면 반응형 검사가 필요하다.
- 작업 지시 원문: `지시문_sajuboss.md`(1~9단계). 디자인 기준: `design/v2/`(시안 v2). 반응형 기준: `docs/RESPONSIVE.md`.

| 단계 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 1 | Next.js 뼈대, 헤더·푸터, 빈 페이지, noindex | 승인됨, push됨 | `52eebf6` |
| - | 사업자 정보 기재 | push됨 | `3bd08b3` |
| 2 | 이메일 인증, profiles, is_admin, 관리자 경로 차단 | 승인됨, push됨 | `85ac5f0` |
| - | 반응형 공통 규칙 + 검증 스크립트 (+ `design/v2/` 파일 추가) | push됨 | `ae366af` |
| 3 | 시안 v2 전환(공통 스타일, 헤더·푸터, 로그인, 내 신청) + 메인·리포트 상세 + 하단 고정 바 | 승인됨, push됨 | `579ecf4` |
| 4 | 주문 저장(orders), 삭제 요청, 약관 동의 시각, 사주 저장 | 승인됨, push됨 | SQL `7f688e7`, 코드 `a383e3b`, `b795676` |
| 5 | 신청 폼 3종(개업택일, 상호·브랜드 작명, 개인·개명 작명) | 구현·검증 완료, 결정 반영, push됨(접수 스위치 꺼짐) | `d8ab582`, `a37ecaa` |
| 6-A | 결제 기록(payments), 결제 모드 스위치, 결제·완료 화면(PG 연동 없음) | 승인됨, push됨 | `96163e6` |
| 6-B | PG 연동 | 시작 전(PG 결정·키 대기) | |
| 7 | 관리자 화면(신청 목록·상세, 입금 확인, 상태 변경, 환불 기록, 메모, 처리 기록) | push됨 | `cb27a77` |
| 8-A | 사주 계산 엔진 이식과 정확도 검증(화면 연결 없음) | 구현·검증 완료, 승인 대기, 미push | 이 문서와 같은 커밋 |
| 8 | 풀이 연결(나머지: 십성·대운·택일·작명·문구, 화면 연결) | 시작 전 | |
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

**5단계(신청 폼 3종)**
- `lib/products.ts`: `APPLY_FORMS_OPEN`(접수 스위치, **커밋 값 false**). false이면 화면은 보이되 버튼이 "오픈 준비 중"이고, 서버 액션 3개와 `createOrder`(신년 리포트 외 상품)가 접수하지 않음. 열려면 true로 바꿔 배포.
- `lib/apply/options.ts`: 선택 항목 허용값·표시 이름, 길이 상한(한 줄 60자, 문장 100자, 글자 40자, 긴 글 500자), 기간 상한(6개월), 아기 예정일 상한(300일), `ApplyState`. 화면과 서버가 같은 값을 씀.
- `lib/apply/shared.ts`(server-only): 입력 읽기 도구(`line`, `longText`, `choice`, `optionalChoice`, `choices`), `resolveSaju`(저장된 내 사주는 DB에서 읽어 복사, 직접 입력은 `readSajuForm`), `submitOrder`(연락처·동의만 읽어 `createOrder` 호출 → `/my?notice=requested`).
- `lib/apply/date.ts`, `lib/apply/name-biz.ts`, `lib/apply/name-person.ts`(server-only): 폼별 검증. 정해진 이름만 읽어 payload를 새로 만듦(모르는 키는 버려짐).
- `lib/apply/viewer.ts`(server-only): 폼 화면에 넘길 값(스위치, 로그인 여부, 계정 이메일, 저장된 사주, 한국 시각 오늘).
- `app/apply/date|name|person/actions.ts`: 서버 액션 3개. 스위치 확인 → 로그인 확인 → 폼 검증 → `submitOrder`.
- `app/apply/date|name|person/page.tsx`: 빈 페이지를 실제 폼으로 교체.
- `components/apply/ApplyParts.tsx`(공통 조각: 폼 훅, 단계 카드, 입력, 칩, 패키지 카드, 사주 선택, 연락처, 동의, 요약, 하단 바), `ApplyHeader.tsx`(탭·제목), `DateForm.tsx`, `NameForm.tsx`, `PersonForm.tsx`.
- `components/saju/SajuFields.tsx`: 입력 이름 접두어(`namePrefix`, 동업자용), 성별 숨김(`withGender`), 라벨·예시 문구, 오류 표시 추가. 기존 사용처 동작은 같음.
- `lib/saju.ts`: `readBirthForm`(성별 없는 생년월일·시각 검증) 추가, `readSajuForm`에 `prefix`·`maxFutureDays` 옵션과 오류 `field` 추가.
- `lib/validation.ts`: `parseBirthDate(value, maxFutureDays)`, `parseLine`, `parseLongText`(제어문자 제거), `parseDate`, `todayInSeoul`, `addMonths`, `pickAllowed` 추가.
- `lib/orders.ts`: 스위치가 꺼져 있으면 신년 리포트 외 상품 거부(`reason: "closed"`), 이메일·전화 오류에 `field` 추가.
- `app/my/page.tsx`: `notice=requested` 문구 추가. `app/pages.css`: 폼 화면 스타일.

**문서·검증**
- `docs/RESPONSIVE.md`: v2 토큰, 720px 분기점, 하단 고정 바 규칙 반영.
- `scripts/check-responsive.mjs`: 신청 폼 3종의 로그인 상태 변형 6개 추가(저장된 사주 사용 / 직접 입력+동업자 / 직접 입력+상세 / 아기 / 개명). 경로가 13개에서 19개로 늘어 전체 검사는 30분 안팎.
- **빠른 모드 `npm run check:responsive:quick`**(2026-10-13): 폭 320·390·768·1280 × 기본·글자 130%, git으로 바뀐 화면 경로만(없으면 신청 폼 3종과 `/my`). **평소엔 quick, push 직전과 9단계 QA에서는 전체.** 이미 커밋한 변경은 `-- --since=origin/main`으로 지정. 규칙은 스크립트 맨 위 주석과 `docs/RESPONSIVE.md`.

**5단계 결정 반영(2026-10-13)**
- `components/order/OrderConsents.tsx`(신규): 신청 동의 2개 공통 컴포넌트. `PreorderForm`과 신청 폼 3종이 사용. `ApplyParts.tsx`에 있던 같은 이름의 컴포넌트는 삭제.
- `lib/validation.ts`: `GENDER_UNKNOWN`, `genderUnknownName`. `lib/apply/shared.ts`: `resolveSaju`에 `allowUnknownGender`, `OrderSaju.gender`가 `unknown`도 받음. `lib/apply/name-person.ts`: baby일 때만 허용.
- `components/saju/SajuFields.tsx`: `allowUnknownGender`(선택지와 안내 문구). `ApplyParts.tsx`의 `SajuSource`와 `PersonForm.tsx`가 baby일 때 넘김.

**6-A(결제 기록, 결제·완료 화면)**
- `supabase/migrations/20261013120000_payments.sql`(신규): `payments` 테이블, 결제 확인 함수 `confirm_order_payment`. 아래 3번 참고.
- `lib/products.ts`: 스위치 `PAYMENT_MODE`(`off` | `manual` | `pg`, 커밋 값 `off`), `PAYMENT_PG_PROVIDER`(`none` | `mock`, 커밋 값 `none`).
- `lib/payment.ts`(신규, server-only): `getBankInfo`(계좌 안내, 서버 환경변수), `PaymentProvider` 형태와 연결 안 된 provider·모의 provider, `startPayment`, `confirmPayment`, `requestManualPayment`(입금 확인 요청, ready 행 1개), `confirmManualPayment`(관리자 전용, 아직 부르는 화면 없음), `getPaymentState`, `cancelPendingPayments`. 주문 상태를 requested → paid로 바꾸는 곳은 이 파일의 `settlePayment`(DB 함수 호출) 하나.
- `lib/order-view.ts`(신규, server-only): 결제·완료 화면용 본인 주문 조회(세션 클라이언트, 컬럼 명시, payload는 읽지 않음).
- `app/pay/[orderId]/page.tsx`, `actions.ts`(신규), `components/pay/PayView.tsx`(신규): 결제 화면. 서버 액션이 폼에서 읽는 값은 주문 id와 결제 동의 체크뿐.
- `app/done/[orderId]/page.tsx`: 완료 화면. 주문 상태에 따라 제목·안내·결제 상태 표시가 달라짐(결제 확인 전에는 결제 확인으로 보이지 않음).
- `lib/supabase/proxy.ts`: `/pay/[id]`, `/done/[id]`는 본인의 삭제되지 않은 주문일 때만 열고, 아니면 화면을 그리기 전에 HTTP 404.
- `lib/apply/shared.ts`: 신청 접수 후 `/pay/[orderId]`로 이동. `lib/apply/options.ts`: 패키지 설명·요약 문구를 이쪽으로 옮김(결제 화면과 함께 씀).
- `lib/orders.ts`: 삭제 요청 시 남아 있는 결제 대기 행을 canceled로 바꿈(`cancelPendingPayments`).
- `app/my/page.tsx`: requested 주문에 "결제하기" 링크. `app/pages.css`: 결제·완료 화면 스타일. `.env.example`: 계좌 환경변수 이름.
- `scripts/check-responsive.mjs`: `/pay/[orderId]`, `/done/[orderId]`를 임시 주문으로 검사, 정리 순서에 payments 추가.

**7단계(관리자 화면)**
- `supabase/migrations/20261013150000_admin_actions.sql`(신규): `order_events` 테이블, 관리자 처리 함수 4개. 아래 3번 참고.
- `lib/admin/orders.ts`(신규, server-only): 목록·상세 조회와 처리 4가지. 모든 함수가 맨 앞에서 세션 클라이언트의 `is_admin()`으로 관리자를 확인하고, 통과한 뒤에만 service_role로 DB 함수를 호출한다. 처리한 사람은 세션의 사용자 id. orders·payments를 직접 고치지 않는다.
- `lib/admin/payload.ts`(신규): 신청 내용(payload)을 이름표와 글자로만 바꾸는 함수, 같은 사주 판별 키. `lib/admin/format.ts`(신규): 표시용 이름·날짜.
- `app/admin/orders/page.tsx`(목록·필터), `app/admin/orders/[orderId]/page.tsx`(상세, 신규), `app/admin/orders/actions.ts`(서버 액션, 신규), `components/admin/AdminActions.tsx`(확인 단계가 있는 처리 버튼, 메모 폼, 신규).
- `lib/payment.ts`: 부르는 곳이 없던 `confirmManualPayment`를 지움(관리자 입금 확인은 `lib/admin/orders.ts`의 `adminConfirmPayment` → DB 함수 `admin_confirm_manual_payment`).
- `app/pages.css`: 관리자 화면 스타일. `scripts/check-responsive.mjs`: `/admin/orders/[orderId]` 추가, 정리 순서에 order_events 추가.
- 처리 뒤 화면 갱신은 서버 액션에서 `refresh()`(next/cache)를 쓴다. **`revalidatePath`로 지금 보고 있는 동적 경로(`/admin/orders/[id]`)를 다시 그리게 하면 서버 액션 응답이 끝나지 않는 문제가 있었다**(처리는 DB에 반영되지만 화면이 멈춤). 관리자 화면은 캐시하지 않으므로 `refresh()`로 충분하다.

**8-A(사주 계산 엔진)**
- `_import/sosangkong/`: 소상공닷컴(`C:Usersppparksosangkong-web`, 커밋 `3c08968`)의 `lib/saju/` 3개 파일, `types/lunar-javascript.d.ts`, lunar-javascript LICENSE를 원본 그대로 보관. 출처·해시는 `SOURCE.md`. tsconfig·eslint에서 제외, 앱이 import하지 않음.
- `lib/saju-engine/`(모두 `import "server-only"`): `pillars.ts`(`calcPillars`: saju_profiles 형식 입력 → 4주, 일간, 오행 개수, 시각 불확실·경계 위험, 적용한 보정 기록), `corrections.ts`(보정 옵션 `CorrectionOptions`, 기본 `DEFAULT_CORRECTIONS` 모두 꺼짐, 서울 시간대 이력 표), `korean-lunar.ts` + `korean-lunar-data.ts`(한국천문연구원 1900~2050 한국 음력 표, 자동 생성), `iljin.ts`, `relation.ts`.
- 원본과 다른 점: lunar-javascript 절기는 중국 기준시(UTC+8)라 출생 순간을 UTC+8로 바꿔 비교, 년·월주는 입춘·절입 **시각** 기준(원본은 **당일** 기준), 음력은 한국 음력(원본은 중국 음력). 원본 방식은 절입일 당일 출생 표본 16,560건 중 8,279건에서 월주, 입춘일 표본 1,379건 중 692건에서 년주가 틀렸다(보고용 계산, 저장소 밖).
- `types/lunar-javascript.d.ts`: 우리가 쓰는 API만 적은 타입. `package.json`: `lunar-javascript` 정확히 `1.7.7`, 스크립트 `test:saju`. `tsconfig.json`: `allowImportingTsExtensions`(Node 테스트 러너가 .ts를 직접 실행하도록), `_import` 제외.
- `tests/saju-engine/`: 테스트 4개 파일과 정답 자료(`fixtures/`, 모두 한국천문연구원, 출처는 `fixtures/README.md`). `scripts/saju/`: 정답 자료 받기(`fetch-kasi-lunar.mjs`, `fetch-kasi-samples.mjs`, 인터넷 필요, 요청 0.3초 간격)와 음력 표 만들기(`build-korean-lunar.mjs`).
- 엔진은 아직 어떤 화면도 쓰지 않음. 임시 화면으로 서버에서는 동작(2024-02-10 12:00 → 甲辰 丙寅 甲辰 庚午)하고 클라이언트 번들에 0건, 클라이언트 컴포넌트에서 import하면 빌드가 막히는 것을 확인한 뒤 임시 화면은 지움.

## 3. DB 상태 (Supabase 프로젝트 ref `jmolzaubbseytkdaadgf`)

마이그레이션은 **사장님이 SQL Editor에서 직접 실행**합니다. Claude는 DDL을 실행할 수단이 없고, CLI 로그인·DB 비밀번호는 쓰지 않기로 했습니다. SQL 파일 전문을 코드 블록으로 보여주고 승인 → 실행 → REST 검증 순서입니다.

| 마이그레이션 파일 | 적용 여부 |
|---|---|
| `supabase/migrations/20261011120000_profiles.sql` | 적용됨(2026-10-11), REST 검증 30/30 통과 |
| `supabase/migrations/20261011150000_profile_consents.sql` | 적용됨(2026-10-11). 실행 순서 1. profiles에 `age_confirmed_at`, `terms_agreed_at`, `privacy_agreed_at`, `marketing_opt_in_at` 추가 |
| `supabase/migrations/20261011150050_saju_profiles.sql` | 적용됨(2026-10-11). 실행 순서 2. `saju_profiles` 테이블, `set_updated_at()` |
| `supabase/migrations/20261011150100_orders.sql` | 적용됨(2026-10-11). 실행 순서 3. `orders` 테이블 |
| `supabase/migrations/20261013120000_payments.sql` | 적용됨(2026-10-13). `payments` 테이블, 함수 `confirm_order_payment`. REST 검증 52/52 통과 |
| `supabase/migrations/20261013150000_admin_actions.sql` | 적용됨(2026-10-13). `order_events` 테이블, 함수 `admin_confirm_manual_payment`, `refund_order_payment`, `admin_change_order_status`, `admin_set_order_note`. REST 검증 77/77 통과 |

**테이블 `public.profiles`**: `id`(auth.users FK, on delete cascade), `role`('user'|'admin', 기본 'user'), `created_at`.
- RLS 켜짐. 정책: `profiles_select_own`, `profiles_update_own`(둘 다 본인 행, authenticated).
- 권한: anon 없음. authenticated는 `select`만. **update grant는 어떤 컬럼에도 없음**(role 변경을 권한으로 차단). service_role은 all.
- 관리자(`role = 'admin'`) 계정 1개(2026-10-11 사장님이 지정, 2026-10-13 개수로 확인). 이전에 "관리자 없음"이라고 적혀 있던 것은 틀린 기록이었다.

**함수**
- `public.handle_new_user()`: auth.users insert 트리거(`on_auth_user_created`). SECURITY DEFINER, `search_path=''`, role은 항상 'user', 메타데이터 미사용.
- `public.is_admin()`: SECURITY DEFINER, `search_path=''`. execute는 authenticated만(PUBLIC·anon 회수).

**테이블 `public.saju_profiles`**: 저장된 사주. RLS 켜짐, 정책 `saju_profiles_select_own`. authenticated는 select만, 쓰기는 service_role. 본인 사주 1개 제한(부분 unique index), 계정 삭제 시 cascade.

**테이블 `public.orders`**: RLS 켜짐, 정책 `orders_select_own`(본인 + 삭제되지 않은 주문). authenticated는 컬럼 단위 select만(`admin_note`, `deleted_at` 제외), 쓰기는 service_role. 계정 삭제는 restrict.

**테이블 `public.payments`**(6-A): `id`, `order_id`(orders FK, restrict), `provider`('manual'|'pg'), `provider_name`, `provider_payment_id`, `amount_krw`(0 이상), `status`('ready'|'paid'|'failed'|'canceled'|'refunded', 기본 ready), `paid_at`, `created_at`, `updated_at`.
- RLS 켜짐, 정책 없음. anon·authenticated는 권한 없음(조회·쓰기 모두 42501). service_role만 사용. 화면에 필요한 결제 상태는 서버가 읽어 넘김.
- unique: `(provider_name, provider_payment_id)`(결제 키가 있을 때), 주문당 ready 행 1개(`payments_one_ready_per_order`). 결제 수단 정보(카드번호·계좌번호 등)를 담는 컬럼은 없음.
- 결제 기록이 있는 주문은 삭제할 수 없음(23503). 임시 데이터 정리 순서는 **payments → orders → saju_profiles → 계정**.

**함수 `public.confirm_order_payment(p_order_id, p_provider, p_provider_name, p_provider_payment_id, p_amount_krw)`**(6-A): 주문을 잠그고 금액을 비교한 뒤 payments 기록과 `orders.status = paid`를 한 트랜잭션으로 처리. 결과 문자열: `paid`, `already_paid`, `amount_mismatch`(주문 그대로, failed 행 1개), `duplicate_payment`, `not_payable`, `not_found`, `invalid`. `search_path = ''`. execute는 service_role만(anon·authenticated 호출은 42501).

**테이블 `public.order_events`**(7단계): 관리자 처리 기록. `id`, `order_id`(orders FK, **restrict**), `actor_id`(auth.users FK, set null), `action`('payment_confirmed'|'status_changed'|'refunded'|'canceled'|'note_updated'), `from_status`, `to_status`, `created_at`.
- RLS 켜짐, 정책 없음. anon·authenticated는 권한 없음(42501). service_role만 읽고, 쓰기는 아래 함수가 한다. 메모 내용·신청 내용·연락처는 저장하지 않는다.
- 처리 기록이 있는 주문은 삭제할 수 없음(23503). 임시 데이터 정리 순서는 **order_events → payments → orders → saju_profiles → 계정**.

**관리자 처리 함수 4개**(7단계): 모두 `search_path = ''`, execute는 service_role만(anon·authenticated 호출 42501), `p_actor_id`가 null이면 `invalid`, `profiles.role`이 admin이 아니면 `forbidden`. 주문 행을 잠그고 상태 변경과 `order_events` 기록을 한 트랜잭션으로 쓴다.
- `admin_confirm_manual_payment(p_order_id, p_actor_id)`: DB의 주문 금액으로 `confirm_order_payment(manual)`을 호출. `paid`일 때만 기록. 결과: paid, already_paid, not_payable, not_found, forbidden, invalid.
- `refund_order_payment(p_order_id, p_actor_id)`: 전액 환불 기록(돈은 움직이지 않음). paid·in_progress·delivered만. 결과: refunded, already_refunded, not_refundable, no_payment, not_found, forbidden, invalid. paid 결제 행이 2개 이상이면 예외(P0001)로 전부 되돌림.
- `admin_change_order_status(p_order_id, p_from, p_to, p_actor_id)`: 허용 전이 6개(paid→in_progress, in_progress→delivered, delivered→in_progress, in_progress→paid, preorder→canceled, requested→canceled)만. 현재 상태가 `p_from`과 다르면 `conflict`. 취소는 남은 ready 결제 행도 canceled로, payload·연락처는 유지. 결과: changed, conflict, not_found, forbidden, invalid.
- `admin_set_order_note(p_order_id, p_note, p_actor_id)`: 메모 저장 + note_updated 기록(내용 없음). 2,000자 초과 invalid. 결과: saved, not_found, forbidden, invalid.

**profiles 동의 컬럼 4개**: `age_confirmed_at`, `terms_agreed_at`, `privacy_agreed_at`, `marketing_opt_in_at`. 사용자 수정 불가.

**함수 `public.set_updated_at()`**: orders, saju_profiles의 updated_at 트리거.

2026-10-13 기준 `profiles` 1행, `saju_profiles` 1행, `orders` 1행(사장님이 실사이트에서 만든 것으로 보임. 검증 스크립트는 이 행들을 건드리지 않고, 전후 행 수가 같은지만 확인함).

**5단계 payload 형태**(DB 변경 없음, `orders.payload` jsonb에 저장)
- `date`: `form, open_type, business, area, saju_source, saju, date_from, date_to, avoid, weekday_pref, partner, partner_saju, memo`
- `name_biz`: `form, name_type, business, area, intro, customers, moods, include_chars, avoid_chars, saju_source, saju, candidates, memo`
- `name_person`: `form, kind, saju_source, saju, family_name, current_name, rename_reason, parent_birth_date, avoid_chars, moods, name_length, include_chars, candidates`
- `saju`는 `birth_date, calendar, birth_time, time_unknown, gender`(이름표 없음). `partner_saju`는 성별 없이 4개.

**7단계 DB 검증 결과**(2026-10-13, 임시 계정 3개(임시 관리자 포함)로 수행 후 삭제, 잔여 행 0, 전체 행 수·관리자 수 전과 같음)
- 사전 점검 5건(order_events 컬럼 명시 조회, 함수 4개 호출 → forbidden) 통과 뒤 진행. 77건 모두 통과.
- order_events: anon·authenticated(관리자 계정의 세션 포함) 조회·추가·수정·삭제 42501, 잘못된 action·상태 23514, 없는 주문·없는 계정 23503, order_id·action 없음 23502, 기록이 있는 주문 삭제 23503, 처리한 관리자 계정을 지우면 기록은 남고 actor_id만 null.
- 함수 4개: anon·authenticated(관리자 계정의 세션 포함) 호출 42501, actor null → invalid, actor가 일반 계정·없는 id → forbidden, 주문 id null → invalid, 없는 주문 → not_found.
- 전이: 허용 6개 changed, 그 밖의 (from, to) 조합 43개 전부 invalid, 없는 상태 이름·null·대문자 invalid, 현재 상태 불일치 conflict. 동시 5개 호출은 입금 확인·환불·상태 변경 모두 1번만 반영되고 기록 1행.
- 테스트 주문 42개에서 처음 상태에 기록을 차례로 적용한 결과가 현재 상태와 같음(기록 없는 상태 변경 0건). 거부된 호출은 기록 0행.

**6-A DB 검증 결과**(2026-10-13, 임시 계정 2개로 수행 후 삭제, 잔여 행 0, 전후 전체 행 수 같음)
- 사전 점검 2건(테이블은 컬럼을 명시한 일반 조회로, 함수는 없는 주문 → `not_found`로 확인) 통과 뒤 진행. 52건 모두 통과.
- 권한: anon·authenticated의 payments 조회·추가·수정·삭제와 함수 호출 모두 42501. 제약: 음수 금액·허용되지 않은 status·provider 23514, 같은 (PG 이름, 결제 키) 23505, 결제 기록이 있는 주문 삭제 23503, 없는 주문 id 23503, order_id 없음 23502.
- 함수: 정상 → paid, 재시도 → already_paid(행 늘지 않음), 동시 5개 → paid 1번, 금액 불일치(적게·많게) → amount_mismatch + failed 1행(재시도해도 1행), 같은 결제 키를 다른 주문에 → duplicate_payment, preorder·canceled·삭제 요청·in_progress → not_payable, 없는 주문 → not_found, 잘못된 입력 7가지 → invalid, ready 행이 있으면 그 행이 paid로 바뀜(새 행 없음), 입금 확인 요청 연타 → ready 1행 유지.
- 첫 시도 때는 사전 점검이 PGRST205·PGRST202로 실패해 중단했고, 사장님이 SQL을 다시 실행·스키마 리로드한 뒤 통과함. **행 수만 세는 조회(head)는 테이블이 없어도 오류가 드러나지 않으므로 사전 점검에 쓰지 않는다.**

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
| `BANK_NAME` | 계좌이체 안내의 은행 이름(서버 전용, `PAYMENT_MODE = "manual"`일 때 사용) | 없음 | 없음(사장님이 직접 입력) |
| `BANK_HOLDER` | 예금주(서버 전용) | 없음 | 없음(사장님이 직접 입력) |
| `BANK_ACCOUNT` | 계좌번호(서버 전용) | 없음 | 없음(사장님이 직접 입력) |

- `.env.local`은 `.gitignore`(`.env*`)로 제외. `.env.example`만 커밋.
- service_role 키를 읽는 코드는 `lib/supabase/admin.ts`(앱)와 `scripts/check-responsive.mjs`(로컬 검증)뿐.
- 계좌 3개는 `lib/payment.ts`의 `getBankInfo`만 읽음. 하나라도 비어 있으면 화면에 `[확정 후 기재]`가 보이고 입금 확인 요청을 받지 않음. 값은 사장님이 직접 넣고, 문서·코드에는 쓰지 않음. PG 키는 6-B에서 사장님이 직접 넣음.

## 5. 미커밋·미push

- **8-A 커밋은 로컬에만 있음(미push)**. 그 앞의 문서 갱신 커밋 `8d9c195`(7단계 배포 확인 기록)도 미push. push는 사장님 승인 뒤에.
- 2026-10-14 사장님 승인으로 `cb27a77`까지 push함(`f28fb14`, `cb27a77`). 인증 계정 `tenpang24`(원격 URL의 사용자 이름, 인증 창 없음). Vercel 프로덕션 배포 Ready(GitHub 상태 `success`). 그 뒤의 문서 갱신 커밋(이 문서)은 로컬에만 있음.
- 이번 push 전에는 전체 반응형 검사를 다시 하지 않음(사장님 지시: 6-A 전체 19개 경로 380회 + 7단계 quick 20개 경로 160회를 근거로). lint·tsc·build 통과, 로컬 `.next/static` 147개 파일 키 0건.

**배포 확인 결과(2026-10-14, `cb27a77`)**
- 공용 DNS(8.8.8.8) 기준 `/`, `/report/2027`, `/login`, `/apply/date|name|person`, `/robots.txt` 200, `noindex, nofollow` 유지. 신청 폼 3종 "오픈 준비 중", 제출 버튼 0개.
- 비로그인 `/admin/orders`, `/admin/orders/[id]`, `/my` 307로 로그인 이동. www는 4개 경로 308로 루트 이동.
- **일반 계정의 `/admin/orders` 404는 이번에 확인하지 못함**: 운영 DB에 임시 계정을 만드는 단계가 Claude Code 권한 설정에서 거부됨. 7단계 로컬 검증(운영 DB 연결)에서는 404 확인됨. 사장님이 일반 계정으로 직접 확인하거나 임시 계정 생성을 허락하면 다시 확인.
- 스위치는 push된 커밋에서 `APPLY_FORMS_OPEN = false`, `PAYMENT_MODE = "off"`, `PAYMENT_PG_PROVIDER = "none"`. 첫째는 배포 화면으로도 확인.
- 배포된 페이지 9개와 연결된 JS·CSS 15개에서 service_role 키 값·이름·`sb_secret_` 0건. `.env`, `.env.local`, `.git/config`, 문서·마이그레이션 파일 404.


- 2026-10-13 사장님의 "push 진행"으로 `96163e6`까지 push함(`a3b66ac`, `96163e6`). 인증 계정 `tenpang24`. Vercel 프로덕션 배포 Ready(`sajuboss-34nvf221m`). 그 뒤의 문서 갱신 커밋(이 문서)은 로컬에만 있음.
- 첫 push 시도는 3분 넘게 응답이 없다가 PC 메모리 부족으로 중단됐고(원격 변화 없음), 다시 실행해 성공함. push가 오래 걸리면 3분에서 끊고 보고한다.

**배포 확인 결과(2026-10-13, `96163e6`)**
- 공용 DNS(8.8.8.8) 기준 `/`, `/report/2027`, `/login` 200(noindex 유지). 신청 폼 3종은 "오픈 준비 중", 제출 버튼 없음. www는 4개 경로 308로 루트 이동.
- 비로그인 `/my`, `/pay/[id]`, `/done/[id]`는 307로 로그인 이동. 로그인(임시 계정) `/my` 200, `/pay/[없는 id]`·`/done/[없는 id]`·`/pay/abc` 404, 본인 주문의 `/pay`는 off 화면(준비 중 버튼, 동의 체크 없음), `/done`은 접수 안내. 임시 계정·주문은 삭제, 잔여 0.
- 스위치는 push된 커밋에서 `APPLY_FORMS_OPEN = false`, `PAYMENT_MODE = "off"`, `PAYMENT_PG_PROVIDER = "none"`. 앞의 둘은 배포 화면으로도 확인. `PAYMENT_PG_PROVIDER`는 off 모드에서 화면에 드러나지 않아 커밋 내용과 배포 커밋 일치로만 확인.
- 배포된 페이지 9개와 연결된 JS·CSS 15개, 로그인 화면 3개 본문, 로컬 빌드 `.next/static` 146개 파일에서 service_role 키 값·이름 0건. `.env*`, `.git/config`, 마이그레이션·문서 파일은 404.
- push 직전 전체 반응형 검사: 19개 경로 380회 전 경로 통과.

- 2026-10-11 사장님의 "push 진행"으로 `b795676`까지 push함. Vercel 프로덕션 배포 Ready(`sajuboss-l2pwtbapn`), `www.sajuboss.com`에 연결됨.
- 2026-10-13 사장님의 "push 진행"으로 `a37ecaa`까지 push함(`5120fd9`, `a8336f6`, `d8ab582`, `a37ecaa`). Vercel 프로덕션 배포 Ready(`sajuboss-bncwjq2r4`). 그 뒤의 문서 갱신 커밋(이 문서)은 로컬에만 있음. **push는 매번 사장님 승인 후에만.** push하면 Vercel 프로덕션에 배포됨.
- 이 PC의 Git 자격 증명 관리자에 GitHub 계정이 2개(`tenpang24`, `moonpak45-ui`) 있음. 첫 push 시도는 `moonpak45-ui`로 인증돼 403으로 실패했고, 사장님이 자격 증명을 지운 뒤 `tenpang24`로 성공. 다시 403이 나면 어떤 계정으로 인증됐는지와 오류 문구만 보고하고 멈춘다(자격 증명을 임의로 지우지 않음).

**배포 확인 결과(2026-10-13, `a37ecaa`)**
- 공용 DNS(8.8.8.8) 기준 `https://sajuboss.com`의 `/`, `/report/2027`, `/login`, `/apply/date`, `/apply/name`, `/apply/person` 모두 200. www는 6개 경로 모두 308로 루트 이동. `/my`는 로그인으로 307.
- 신청 폼 3종: PC·모바일 모두 버튼 "오픈 준비 중"(비활성), 제출 버튼 0개. 폼을 강제로 제출해도 서버가 준비 중 안내만 돌려줌. `noindex, nofollow` 유지.
- 배포된 페이지·스크립트와 로컬 빌드의 `.next/static` 전체에서 service_role 키 값, `SUPABASE_SERVICE_ROLE_KEY`·`service_role` 문자열 0건.
- push 직전 전체 반응형 검사: 19개 경로 380회 전 경로 통과.
- 원격: `https://github.com/tenpang24/sajuboss-web.git`, 브랜치 `main`.
- 커밋 작성자는 이 저장소 로컬 설정(`tenpang24 <tenpang24@gmail.com>`). 전역 git 설정은 건드리지 않음.
- 보관 브랜치 `wip/stage3-old-design`은 push하지 않음(로컬 전용).

**배포 확인 결과(2026-10-11)**
- `https://www.sajuboss.com`의 `/`, `/report/2027`, `/login` 200. 보호 경로(`/my`, `/admin/orders`, `/pay/*`, `/done/*`)는 로그인으로 307.
- **리디렉션 방향 해결됨**(2026-10-11, 사장님이 Vercel Domains에서 변경): `sajuboss.com`이 직접 200, `www.sajuboss.com` → 308 → `sajuboss.com`, http → https 308. 공용 DNS(8.8.8.8) 기준으로 확인.
- 위의 "`https://www.sajuboss.com`의 … 200"은 변경 전 기록. 지금 대표 주소는 `https://sajuboss.com`(`lib/brand.ts`의 `url`과 일치).
- 배포된 페이지·스크립트에서 service_role 키, `service_role` 문자열, `sb_secret_` 형식 키 0건. `.env*`, `.git/config`, 마이그레이션·문서 파일은 404. git 이력에 키 값 0건.

## 6. 사장님 확인·결정 대기

0000. **8-A 승인**과 아래 결정.
0000-1. **보정 기본값**(지금은 모두 꺼짐 = 적힌 시각을 UTC+9로 봄, 한국천문연구원 24기 표와 같은 가정): 진태양시(켜면 몇 분? 서울 약 -32, 지역별로 다르게 할지), 서머타임(1948~51, 1955~60, 1987~88), 표준시 이력(1908 전 지방평균시, 1908~1911·1954~1961 UTC+8:30), 자시(00:00 변경 / 23:00 변경). 결과에 무엇을 적용했는지와 그 시기 안내(`periodNotes`)는 항상 기록된다.
0000-2. **자시 시주 천간**: 기본(00:00 변경)에서 23:00~23:59의 시주 천간은 다음 날 기준(lunar-javascript 기본, 원본과 같음). 같은 날 기준을 원하면 옵션 추가 필요.
0000-3. **경계 위험 범위 60분**(`BOUNDARY_RISK_MINUTES`): 시각을 알 때 절입·날짜 변경에서 60분 안이면 알림. 서머타임·표준시 보정 여부로 1시간까지 달라질 수 있어서 정한 값.
0000-4. **라이브러리 절입 시각 오차**: 한국천문연구원 표와 0~3분 차이(2,172건 중 1분 이상 593건). 절입 3분 안 출생은 결과가 표와 다를 수 있다. 1920~2100은 한국천문연구원 표를 엔진에 직접 넣는 방법도 있음(정하면 반영).
0000-5. **한국천문연구원 자료 이용**: 테스트 정답 자료와 음력 표(`korean-lunar-data.ts`, 앱이 씀)가 한국천문연구원 자료다. 저작권정책(공공누리 유형 등)은 확인하지 못함. 사장님 확인 필요.
0000-6. **음력 입력 범위**: 1900년 1월 1일 ~ 2050년 11월(한국천문연구원 변환 범위). 그 밖은 `out_of_range`. 양력은 1900-01-01 ~ 2100-12-31.
0000-7. **1954년 표준시 변경 시각**: IANA는 3월 21일 00:00, 국가기록원 자료는 "오전 0시 30분부터". 그날 0~1시 출생만 영향. 1961-08-10 복귀는 IANA로만 확인.

000. **7단계 승인**과 아래 확인 사항.
000-1. (결정됨, 2026-10-13) order_events 포함, 한 칸 되돌리기 포함, 관리자 취소는 payload·연락처 유지, 환불은 전액만. SQL의 추가 2개(함수 안의 관리자 재확인 `forbidden`, 메모 저장 함수)도 승인됨.
000-2. **처리 뒤 안내 문구**: 입금 확인·상태 변경·환불이 성공하면 화면이 새로 그려지면서 버튼 옆의 "처리했습니다" 문구는 보이지 않고, 바뀐 상태 표시와 처리 기록으로 결과를 확인한다. 메모는 "마지막 저장: 시각"으로 확인한다. 성공 문구를 따로 띄우길 원하면 알려 주기.
000-3. **없는 신청 id의 관리자 상세 주소**는 관리자에게 "찾을 수 없음" 화면이 나오지만 HTTP 상태는 200일 수 있음(관리자만 볼 수 있는 화면이라 그대로 둠).
000-4. **관리자 화면으로 가는 메뉴 링크는 없음**. 주소(`/admin/orders`)로 직접 들어간다. 헤더나 내 신청에 관리자용 링크가 필요하면 알려 주기.
000-5. **이메일로 신청 찾기 없음**: 개인정보를 주소에 넣지 않으려고 뺐다. 신청 번호·상품·상태·금액·신청일로 찾는다.

00. 6-A 승인됨(2026-10-13). 아래는 결정된 것과 남은 것.
00-1. **지시에 없던 DB 항목 2개**: 주문당 결제 대기 행 1개 제한 인덱스, 결제 확인 함수 `confirm_order_payment`(SQL 전문을 보고 실행하심).
00-2. (결정됨, 2026-10-13) **manual 모드는 7단계 관리자 확인 화면이 생기기 전에는 켜지 않는다.** 켜기 전에 `BANK_NAME`, `BANK_HOLDER`, `BANK_ACCOUNT`를 Vercel에 넣어야 하고, manual·pg 모드 화면의 반응형을 다시 검사해야 함.
00-3. **manual 모드의 입금 안내 문구**("입금자명 뒤에 신청 번호를 함께 적어 주세요")는 Claude가 쓴 문구. 사장님이 별도로 확인하기로 함(2026-10-13).
00-4. **off 모드 결제 화면의 버튼**: "결제하기 (준비 중)" 비활성 + "신청만 먼저 접수하기"(→ `/my?notice=requested`). 결제 안내 방식은 `[안내 방식 확정 후 기재]`.
00-5. **환불 규정, 영수증·현금영수증, 결과 전달 방법·시기, 입금 확인 소요 시간**: 모두 `[확정 후 기재]`.
00-6. (결정됨, 2026-10-13) **신년 리포트 사전신청 완료 후 이동은 `/my?notice=preorder-done` 유지.**

0. **5단계 승인**과 아래 5단계 결정 사항.
0-1. (결정됨, 2026-10-13) **신청 동의 문구**: "개인정보 수집·이용" 문구는 `components/order/OrderConsents.tsx` 한 곳에서 가져옴(사전신청 카드 + 신청 폼 3종). "참고용 자료 확인" 문구는 시안대로 상품별(`disclaimer`로 넘김).
0-2. (결정됨, 2026-10-13) **아기 성별**: `kind`가 baby일 때만 "아직 몰라요"(`unknown`) 허용. adult·rename과 다른 폼은 female/male만. payload에만 저장되고 `saju_profiles`와 DB 제약은 변경 없음.
0-3. **아기 출산 예정일 상한 300일**, **가장 빠른 개업일은 오늘부터 2년 안**(시안·지시에 없던 상한, `lib/apply/options.ts`).
0-4. **스위치를 켜는 시점**: `APPLY_FORMS_OPEN`을 true로 바꾸면 결제 화면 없이 "결제 확인 대기" 주문이 쌓임. 6단계 뒤에 켜는 것을 권장.
0-5. **프로덕션 검증(2026-10-12)에서 나온 것**: 기본 메일 발송 한도(`over_email_send_rate_limit`)로 가입이 막힌 적 있음. 관리자 생성 링크는 `#access_token` 형식이라 콜백에서 실패하고, `token_hash` 형식은 성공. `signUp` 실패 시 오류 코드가 서버 로그에 남지 않음. 사장님이 실사이트 확인을 마쳤다고 했으나, SMTP·메일 템플릿·오류 로그를 어떻게 정했는지는 전달받지 못함.
1. 4단계 승인됨. (⑫·㉕는 사장님이 수용함: 삭제가 막히고 계정·주문이 남는 것으로 충분.)
1-1. (결정됨, 2026-10-13) 사전신청 완료 후 이동 위치는 `/my?notice=preorder-done` 유지.
1-2. **연속 제출 제한 값**: 같은 사용자 20초 간격, 1시간 10건(`lib/orders.ts`). 조정이 필요하면 알려 주기.
1-3. **같은 사주로 사전신청을 여러 번 하는 것**은 막지 않음(다른 사람 사주로도 신청할 수 있어서). 중복 방지가 필요하면 규칙 결정 필요.
2. **push**: 2026-10-11 완료(`b795676`). 이후 push도 매번 사장님 승인 후에.
4. **통신판매업 신고번호**: 확인 중. `lib/brand.ts`에 `[확인 후 기재]`.
6. **이용약관·개인정보처리방침 문서**: 없음. 가입 화면의 "보기"와 푸터 링크가 `#`.
9. **검증 스크립트의 임시 계정**: `check:responsive`가 실행마다 운영 DB에 임시 관리자 계정을 만들고 지움. 원치 않으면 `--no-auth` 기본값으로 변경.
10. **실제 메일 흐름**(가입 인증, 비밀번호 재설정): 사장님이 직접 확인하기로 함.
11. **관리자 계정 지정**: 가입 후 SQL Editor에서 `update public.profiles set role = 'admin' where id = '<uid>';`.
12. **사주 계산 소스·문구 데이터**(8단계): 사장님이 파일로 전달 예정. Claude가 소상공닷컴 저장소에 접근해 가져오지 않음.
13. **카카오 로그인 키**: 없음. 버튼은 "카카오로 시작하기 (준비 중)" 비활성.
14. **결제 이후 주문의 삭제·보존 정책**(4단계): 사장님이 법무 확인 후 확정. 그 전까지 `[확정 후 기재]`.

## 7. 알려진 문제와 임시 처리(TODO)

- 사주 엔진(8-A)은 화면에 연결되지 않음. 메인 "오늘의 사업운"은 여전히 준비 중 안내.
- 사주 엔진의 오행 개수는 천간·지지 겉글자만 센다(지장간 없음, 원본과 같음). 시주 경계(홀수 시 정각) 근처 위험은 알리지 않음.
- 진태양시 보정은 경도 차이만(분 단위 상수), 균시차는 넣지 않음. 출생지 입력 칸은 없음.
- 시각을 모를 때 결과의 년·월·일주는 그 날 12:00 기준. 경계 위험이 있으면 `boundaryRisks`에 앞뒤 후보가 있음.
- 테스트는 Node 내장 러너(`node --test`)로 .ts를 직접 실행. 그래서 엔진 안 import는 `.ts` 확장자를 붙인다.
- `components/home/TodayForm.tsx`: 검증 통과 시 "준비 중" 안내만 표시. 실제 계산은 8단계.
- 신청 폼 3종은 스위치가 꺼져 있어(`APPLY_FORMS_OPEN = false`) 배포해도 접수되지 않음. 실제로 만들 수 있는 신청은 신년 리포트 사전신청뿐.
- 신청 폼의 버튼 문구는 시안의 "신청하고 결제로"가 아니라 "신청하기". 결제 화면이 생겼으니 결제 모드를 켤 때 되돌릴지 결정.
- 신청 폼은 길이 상한 때문에 payload가 8KB를 넘을 수 없음(최대 약 3KB). `createOrder`의 8KB 확인은 뒤쪽 안전장치로만 남아 있고, 폼으로는 그 분기에 닿지 않음.
- 금액·status·user_id·모르는 키를 주입한 요청은 "거부"가 아니라 그 값을 버리고 정상 값으로 저장됨(서버가 그 이름을 읽지 않음).
- 비로그인 상태에서 폼을 채운 뒤 로그인하러 가면 입력이 지워짐. 폼 위 안내와 "로그인하고 신청하기" 버튼으로 먼저 로그인하게 안내함.
- `parseBirthDate`는 날짜를 UTC 자정으로 비교해, 한국 시각 0~9시에는 "오늘" 생년월일이 거부됨(4단계부터 있던 동작. 아기 이름은 예정일 허용이라 영향 없음).
- 검증 스크립트는 `next start`로 뜬 로컬 서버를 운영 DB에 붙여 확인함(임시 계정 2개, 끝나면 삭제). Vercel 배포본에서 신청 폼 제출은 확인하지 않음(스위치가 꺼져 있음).
- 가입 화면의 실제 가입 성공 → 동의 기록 경로는 실제 메일이 필요해 끝까지 확인하지 못함. 같은 기록 함수(`recordSignupConsents`)를 쓰는 /my의 약관 동의 경로는 브라우저로 확인함.
- 가입 동의 기록 실패 안내(`consentRetry`)는 실패 상황을 만들 수 없어 실제 동작을 확인하지 못함(코드 검토와 빌드만).
- 사장님 화면에서 언어 표시가 붙은 코드 블록이 보이지 않는 일이 반복됨. 코드·SQL 전문을 보여줄 때는 언어 표시 없는 코드 블록으로 출력하고, 검토용 묶음 파일도 함께 만든다(`Desktopsajuboss-review`, 저장소 밖).
- 연속 제출 제한은 조회 후 저장 방식이라, 같은 순간에 동시에 들어온 두 요청은 둘 다 통과할 수 있음(금전 피해는 없음. 필요하면 DB 제약으로 보강).
- 메인의 "오늘의 사업운" 입력은 저장된 사주와 아직 연결하지 않음(8단계).
- 검증 스크립트(DB 검증, 4단계 브라우저 검증)는 저장소에 없음(세션 임시 폴더). `scripts/check-responsive.mjs`만 저장소에 있음.
- 메인 히어로의 예시 카드: 시안에는 날짜("10월 11일")가 있으나, 고정 날짜는 금방 틀려 보여 "예시 · 오늘의 한마디"로 표기.
- `/admin/orders`, `/admin/orders/[orderId]`: 7단계에서 구현함. 관리자 화면 시안은 없어서 기존 공통 스타일(`site.css`, 내 신청 화면의 카드)로 만들었다.
- 관리자 접근 차단은 세 겹: 프록시(`/admin/*`는 `is_admin()`이 아니면 404), 페이지·`lib/admin/orders.ts`의 `is_admin()` 확인, DB 함수의 `profiles.role` 확인. 일반 계정이 관리자 서버 액션 요청을 다른 주소로 직접 보내도 프레임워크가 그 요청을 관리자 주소로 넘기고 프록시가 막는다(빈 응답, 변화 없음). 그래서 **둘째 겹(`lib/admin/orders.ts` 안의 확인)만 따로 떼어 브라우저로 확인하지는 못했다**(첫째·셋째 겹은 확인함).
- 관리자 화면의 실제 관리자 계정(사장님 계정) 로그인은 확인하지 않음. 검증은 임시 관리자 계정으로 했다.
- 환불은 기록만 바꾼다(돈은 사장님이 직접 돌려준 뒤 누름). 부분 환불, PG 취소 연동(6-B) 없음. 결제 기록이 없는 paid 주문(직접 DB에서 바꾼 경우)은 환불로 기록할 수 없다.
- 같은 사주 비교는 서버 코드에서 한다(생년월일이 같은 주문의 사주 값 4개만 읽음, payload 전체는 읽지 않음). 시각은 앞 5글자로 맞춤. 동업자 사주·삭제 요청된 신청은 비교하지 않음. 목록 비교는 한 번에 2,000건까지만 읽는다(주문이 많아지면 DB 쪽으로 옮겨야 함).
- 목록은 한 쪽 30건. 신청 번호 검색은 8자리를 모두 입력해야 한다.
- 브라우저 검증 중 서버 로그에 `Error: aborted`(ECONNRESET) 2줄이 남았다. 일반 계정으로 관리자 주소에 본문이 있는 요청을 직접 보냈을 때 프록시가 본문을 읽기 전에 404로 끊어서 생긴 것으로, 그 밖의 오류 줄은 없었다.
- 검증 스크립트가 중간에 끊기면(시간 초과, 강제 중지) 임시 계정이 남는다. 이번에 두 번 남았고 이름 규칙(`sajuboss-…test-…@example.com`)으로 찾아 order_events → payments → orders → saju_profiles → 계정 순서로 지웠다(잔여 0, 전체 행 수·관리자 수 확인).
- 이 PC는 남은 메모리가 적어(0.4GB) 검증 중 브라우저가 한 번 죽었다(`Target crashed`). 다시 실행해 통과했다.
- 결제 스위치는 코드 상수라 바꾸려면 커밋·배포가 필요함(환경변수 아님). 모드별 화면은 스위치를 로컬에서만 바꿔 빌드해 확인했고, 커밋에는 `off`·`none`으로 남김.
- 모의 결제(`PAYMENT_PG_PROVIDER = "mock"`)는 `NODE_ENV`가 production이면 결제 준비·확인 양쪽에서 거부함. 운영 빌드(`next start`)에서는 "이 결제 방식은 사용할 수 없습니다"만 나오고 기록이 생기지 않음을 확인. 결제 성공 흐름은 개발 서버(`next dev`)에서만 확인함.
- 실제 PG로는 아무것도 확인하지 않음(6-B). 금액 불일치 거부는 DB 함수 검증으로만 확인했고(모의 결제는 주문 금액을 그대로 돌려줘 화면으로는 불일치를 만들 수 없음), 웹훅·결제 취소·환불은 구현하지 않음(provider에 자리만 있음).
- 관리자 입금 확인(`confirmManualPayment`)은 부르는 화면이 없어 브라우저로 확인하지 못함. 같은 DB 함수의 manual 경로는 DB 검증으로 확인함.
- 반응형 검사는 커밋 상태(off 모드)의 결제·완료 화면만 봄. manual·pg 모드 화면의 반응형은 그 모드를 켤 때 다시 검사해야 함.
- 금액·status·결제 키를 주입한 결제 요청도 "거부"가 아니라 그 값을 읽지 않고 버림(서버 액션은 주문 id와 동의 체크만 읽음).
- 서버 로그에는 오류 코드와 결과 종류만 남김. 개발 서버 로그에는 요청 경로가 찍혀 주문 id가 보이지만(Next.js 기본 동작) 이메일·전화·payload·결제 키는 없음.
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
npm run test:saju                  # 사주 엔진 테스트(인터넷 필요 없음, 15초 안팎)
npm run check:responsive:quick     # 평소. push 직전·9단계 QA는 npm run check:responsive (처음이면 먼저: npx playwright install chromium webkit)
```

1. 이 문서와 `docs/RESPONSIVE.md`를 읽고 현재 상태를 요약한다.
2. 6번 목록에서 사장님 답이 온 항목을 처리한다(특히 5단계 승인, "push 진행").
3. `lib/products.ts`의 `APPLY_FORMS_OPEN`이 false, `PAYMENT_MODE`가 `off`, `PAYMENT_PG_PROVIDER`가 `none`인지 먼저 확인한다. 검증할 때만 로컬에서 바꾸고, 커밋 전에 되돌린다.
4. DB를 바꾸는 작업이 생기면 SQL 전문을 보여주고 승인 → 사장님이 SQL Editor에서 실행 → REST 검증 순서(임시 계정은 무작위 `@example.com`, `email_confirm: true`, 끝나면 order_events → payments → orders → saju_profiles → 계정 순서로 삭제하고 잔여 행 확인. 거부는 기대 오류 코드로 판정, `PGRST205`/`PGRST202`는 실패. 사전 점검에서 이 코드가 나오면 멈추고 보고).
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
