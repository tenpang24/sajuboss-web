# sajuboss-web 작업 규칙

@AGENTS.md

## 세션 운영

- 세션을 시작하면 `docs/HANDOFF.md`와 `docs/RESPONSIVE.md`를 먼저 읽고, 현재 상태를 요약한 뒤 작업한다.
- 각 단계 완료 보고 직전에 `docs/HANDOFF.md`를 갱신하고 같은 커밋에 포함한다.
- 마이그레이션, 환경변수, 라우트, 결정 사항이 바뀌면 그때마다 `docs/HANDOFF.md`에 반영한다.
- 키와 비밀번호는 어떤 문서에도 쓰지 않는다.
- 단계 보고서 끝에 "HANDOFF.md 갱신됨(변경 요약 3줄)"을 항상 붙인다.

## 참고 문서

- `지시문_sajuboss.md`: 단계별 구현 지시(1~9단계)와 공통 전제.
- `docs/RESPONSIVE.md`: 반응형 기준. 모든 화면에 적용하고 단계 보고에 `npm run check:responsive` 결과를 첨부한다.
- `docs/HANDOFF.md`: 현재 상태, DB 상태, 대기 중인 결정, 다음에 할 일.
