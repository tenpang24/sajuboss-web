# sajuboss-web 작업 규칙

@AGENTS.md

## 세션 운영

- 세션을 시작하면 `docs/HANDOFF.md`와 `docs/RESPONSIVE.md`를 먼저 읽고, 현재 상태를 요약한 뒤 작업한다.
- 각 단계 완료 보고 직전에 `docs/HANDOFF.md`를 갱신하고 같은 커밋에 포함한다.
- 마이그레이션, 환경변수, 라우트, 결정 사항이 바뀌면 그때마다 `docs/HANDOFF.md`에 반영한다.
- 키와 비밀번호는 어떤 문서에도 쓰지 않는다.
- 단계 보고서 끝에 "HANDOFF.md 갱신됨(변경 요약 3줄)"을 항상 붙인다.

## 코드 규칙

- `orders` 조회는 `select('*')`를 쓰지 않고 항상 컬럼을 명시한다. 사용자에게는 컬럼 단위 권한만 있어(`admin_note`, `deleted_at` 제외) `*` 조회는 42501로 실패한다. 관리자(service_role) 코드에서도 같은 규칙을 지켜 `admin_note`가 필요한 곳에서만 명시해 읽는다.
- `createOrder`(`lib/orders.ts`)는 payload 내용을 검증하지 않는다(크기만 확인). 폼별 서버 액션이 검증된 값만 넣는다. 폼에서 받은 값을 그대로 payload에 넣지 않는다.
- 조회는 가능한 한 사용자 세션 클라이언트(RLS)로 하고, service_role은 쓰기와 관리자 처리에만 쓴다.
- `orders`, `saju_profiles`, `profiles`의 쓰기는 서버 액션에서 service_role로만 한다. 사용자 세션 클라이언트로 insert/update/delete하지 않는다.

## 참고 문서

- `지시문_sajuboss.md`: 단계별 구현 지시(1~9단계)와 공통 전제.
- `docs/RESPONSIVE.md`: 반응형 기준. 모든 화면에 적용하고 단계 보고에 `npm run check:responsive` 결과를 첨부한다.
- `docs/HANDOFF.md`: 현재 상태, DB 상태, 대기 중인 결정, 다음에 할 일.
