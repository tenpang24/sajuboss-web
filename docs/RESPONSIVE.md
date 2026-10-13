# 반응형 기준 (프로젝트 공통 규칙)

디자인 기준은 **시안 v2**(`design/v2/site.css` + `.dc.html` 17개)이고, 앱 전역 스타일 `app/site.css`가 이를 옮긴 것입니다. `design/` 바로 아래의 구 시안은 참고용입니다.

모든 단계의 모든 화면에 적용합니다. 새 화면을 만들거나 기존 화면을 고칠 때 이 문서를 먼저 확인하고, 단계 보고에는 반응형 검사 결과를 첨부합니다(평소엔 `npm run check:responsive:quick`, push 직전과 9단계 QA에서는 `npm run check:responsive`).

## 원칙

- **모바일 우선**으로 작성합니다. 기본 스타일이 모바일이고, 넓은 화면은 `min-width` 미디어쿼리로 덧붙입니다. `max-width` 미디어쿼리는 쓰지 않습니다.
- 사용자 대부분이 카카오톡·인스타그램·네이버 앱 안의 브라우저(인앱 웹뷰)로 들어온다고 가정합니다.
- 어떤 폭에서도 **페이지 가로 스크롤이 생기면 안 됩니다.**

## 검증 폭

| 구분 | 폭(px) |
|---|---|
| 모바일 | 320, 360, 390, 430 |
| 태블릿 세로 | 768 |
| 태블릿 가로 | 1024 |
| 데스크톱 | 1280, 1440 |

분기점은 시안 v2의 **720px 하나**입니다. 시안은 "720px 이하에서 1단"(`max-width: 720px`)으로 적혀 있지만, 앱에서는 모바일 우선으로 뒤집어 **기본값이 720px 이하 화면이고 `@media (min-width: 721px)`에서 넓힙니다.** 결과는 시안과 같습니다. 새 분기점은 꼭 필요할 때만 추가합니다.

720px 이하에서 달라지는 것: 좌우 여백 16px(이상 24px), 섹션 상하 48px(이상 72px), 카드 여백 20px(이상 28px), 헤더 메뉴 가로 스크롤 줄, 2단 배치의 옆 칸 고정 해제, 하단 고정 바 표시, `.hide-m` 숨김.

## 시안 v2 토큰 (`app/site.css`)

| 구분 | 값 |
|---|---|
| 색 | 주색 `--p` #0B7A5A, 진한 주색 `--p-d` #08604A, 글자용 주색 `--p-t` #0B6B4F, 잉크 `--ink` #13302A, 본문 `--body` #2F4740, 보조 `--muted` #53675F, 라인 `--line` #D5E8DF, 입력 테두리 `--field` #6F8D81, 배경 `--bg` #F6FBF8, 옅은 면 `--tint` #E6F4EC, 히어로 `--hero` #E1F2E8, 포인트 `--y` #FFD84D |
| 글꼴 | Noto Sans KR 하나. 기본 17px(1.0625rem), 줄간격 1.7 (40~60대 가독성 기준) |
| 제목 | `.t1` clamp(30px, 4.4vw, 50px), `.t2` clamp(24px, 3vw, 32px), `.t3` 20px, `.lead` clamp(17px, 1.6vw, 20px) |
| 버튼 | `.btn` 높이 52px, `.btn-lg` 58px, `.btn-sm` 48px. 종류 `btn-p/o/g/y/w/danger` |
| 입력 | `.input` 높이 52px, 글자 17px, 테두리 1.5px |
| 격자 | `.grid`(최소 260px), `.grid-wide`(340px), `.grid-form`(220px) — `auto-fit`으로 줄 수 자동 조정 |
| 2단 | `.split` + `.split-main` + `.split-side`(721px 이상에서만 sticky) |

색·크기는 화면에 직접 쓰지 않고 이 변수와 클래스를 씁니다. 시안의 인라인 스타일은 `app/pages.css`의 클래스로 옮기고, 글자 크기는 px 대신 rem으로 적습니다.

## 필수 규칙

1. **뷰포트**: `viewport-fit=cover`를 씁니다. 확대 금지(`user-scalable=no`, `maximum-scale=1`)는 쓰지 않습니다. `app/layout.tsx`의 `viewport`에서만 설정합니다.
   `viewport-fit=cover`를 쓰므로 좌우 여백은 `.container`가 `env(safe-area-inset-left/right)`를 반영합니다. 화면 가장자리에 붙는 요소는 `.container` 안에 둡니다.
2. **높이**: `100vh` 대신 `100dvh`를 쓰고, 지원하지 않는 브라우저용으로 `100vh`를 바로 앞줄에 둡니다. 하단 고정 버튼·바에는 `padding-bottom: env(safe-area-inset-bottom)`을 더합니다.
3. **입력**
   - `input`, `select`, `textarea`의 글자 크기는 16px(1rem) 이상입니다(iOS 자동 확대 방지).
   - 입력 요소 높이는 52px(시안 v2 `.input`), 버튼은 52px입니다. 어떤 경우에도 입력은 48px 이상, 터치 영역은 44px 이상입니다.
   - `type`과 `inputMode`를 맞게 지정합니다(`email`, `tel`, `numeric`).
     숫자 키패드에는 `-`와 `:`가 없으므로, 날짜·시각처럼 구분 기호가 필요한 입력은 숫자만 받고 구분 기호를 자동으로 넣습니다.
   - 오류 문구는 해당 입력 바로 아래, 제출 버튼보다 위에 둡니다. 검증 실패 시 첫 오류 입력으로 포커스를 옮겨 키보드가 올라와도 오류와 버튼이 가려지지 않게 합니다.
4. **글자**
   - 한글은 `word-break: keep-all`(전역 적용).
   - 이메일·URL·주문번호처럼 긴 문자열은 `overflow-wrap: anywhere`.
   - 제목은 `clamp()`로 폭에 따라 줄입니다.
   - 글자 크기는 `rem`으로 씁니다. 시스템 글꼴 크기 130%에서도 겹치거나 넘치지 않아야 합니다.
5. **레이아웃**
   - 레이아웃 컨테이너에 고정 px 폭을 쓰지 않습니다(`max-width` + `width: 100%`). 아이콘·막대 같은 작은 장식 요소는 예외입니다.
   - 가로 배치는 `flex-wrap` 또는 `grid` `auto-fit`으로 합니다. flex 자식에는 `min-width: 0`을 줍니다.
   - 데스크톱 2단(폼 + 신청 요약)은 `.split`으로 만들고, 모바일에서는 1단으로 쌓입니다.
   - **모바일 하단 고정 바**(금액 + 버튼)는 폼·상세·결제 화면 공통 컴포넌트 `components/ui/MobileBar.tsx`를 씁니다. 720px 이하에서만 보이고 safe-area 여백을 포함합니다. 페이지 내용의 맨 끝(푸터 바로 앞)에 둡니다. 같은 역할의 PC용 요소에는 `.hide-m`을 붙여 모바일에서 중복되지 않게 합니다.
6. **메뉴**: 헤더 메뉴는 4개(오늘의 운세 / 신년 사업운 / 개업택일 / 작명)입니다. 720px 이하에서는 로고·버튼 줄 아래에 가로 스크롤 메뉴 줄로 나옵니다(시안 v2 방식. 스크롤은 메뉴 줄 안에서만, 링크는 그대로 키보드로 이동 가능). 신청 폼 상단 탭(`.tabs`)도 같은 방식입니다.
7. **표·차트**: 모바일에서 넘치지 않게 합니다(막대 폭을 비율로 주거나, 컨테이너 안에서만 가로 스크롤). 색 외에 텍스트 범례를 유지합니다.
8. **이미지·아이콘**: `next/image`를 쓰거나 `max-width: 100%`와 고정 비율로 레이아웃이 흔들리지 않게 합니다.
9. **호버 전용 기능 금지**: 터치 기기에서 동작하지 않습니다. 호버는 색 변화 같은 보조 표현에만 쓰고, 포커스 표시(`:focus-visible`)를 유지합니다.
10. **다크모드**: `color-scheme: light`를 명시하고 배경색을 직접 지정합니다. 시스템 다크모드나 웹뷰 강제 다크에서 글자가 사라지지 않아야 합니다.

## 자동 검증

```
npm run build
npm run check:responsive:quick   # 평소 작업 중
npm run check:responsive         # push 직전, 9단계 QA
```

**평소엔 quick, push 직전과 9단계 QA에서는 전체 검사를 돌립니다.**

| | quick | 전체 |
|---|---|---|
| 폭 | 320(Android Chromium), 390(iPhone WebKit), 768, 1280 | 320, 360, 390, 430(iPhone WebKit + Android Chromium), 768, 1024, 1280, 1440 |
| 글자 130% | 4개 폭 모두 | 모바일 폭 4개 |
| 경로 | git으로 바뀐 화면 경로만. 없으면 신청 폼 3종과 `/my` | 모든 경로 |
| 걸리는 시간 | 몇 분 | 30분 안팎 |

quick의 경로 선택: 커밋하지 않은 변경과 새 파일을 화면 경로로 바꿉니다(`app/<경로>/` 아래 파일은 그 경로, `components/apply`·`lib/apply`는 신청 폼, `components/saju`·`components/order`는 그 부품을 쓰는 화면). `app/layout.tsx`, `app/*.css`, `components/ui`, 헤더·푸터 같은 전역 파일이 바뀌면 모든 경로를 봅니다. 이미 커밋한 변경을 보려면 `-- --since=origin/main`처럼 기준을 줍니다. 자세한 규칙은 스크립트 맨 위 주석에 있습니다.

`scripts/check-responsive.mjs`가 하는 일(전체 검사 기준):

- 프로덕션 빌드를 로컬에 띄우고, 모든 경로를 8개 폭에서 엽니다.
- 모바일 폭(320~430)은 **iPhone(WebKit)** 과 **Android(Chromium)** 기기 에뮬레이션 둘 다로 확인합니다.
- 각 화면에서 `document.documentElement.scrollWidth <= clientWidth`를 확인합니다.
- 입력 요소의 글자 크기(16px 이상)와 높이(48px 이상)를 확인합니다.
- 모바일 폭에서는 글자 크기 130% 상태로도 가로 넘침을 확인합니다.
- 스크린샷을 `.responsive/`에 저장하고(커밋하지 않음), 통과/실패 경로 목록을 출력합니다. 실패가 있으면 종료 코드 1입니다.

로그인이 필요한 경로(`/my`, `/login/update-password`, `/admin/orders`, `/pay/…`, `/done/…`)는 `.env.local`의 service_role 키로 **임시 테스트 계정**(무작위 `@example.com` 주소)을 만들어 확인하고, 끝나면 삭제합니다. `/my`의 신청 목록과 저장된 사주 화면을 보려고 임시 신청 1건과 사주 1건도 넣었다가 함께 지웁니다(정리 순서: orders → saju_profiles → 계정). 키가 없거나 `--no-auth`를 주면 이 경로들은 건너뜁니다.

처음 한 번은 브라우저를 받아야 합니다: `npx playwright install chromium webkit`
