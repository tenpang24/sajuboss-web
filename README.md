# sajuboss 개발 패키지

- 지시문_sajuboss.md : 단계별 구현 지시문(1~9단계). Claude Code에 이 파일을 먼저 읽히세요.
- design/*.dc.html : 화면 시안 7장. 렌더링용 파일이 아니라 **마크업·문구·색상 참고용 소스**입니다.
  Main(메인), Detail(신년 리포트 상세), Date(개업택일 폼), Name(작명 폼), Person(개인·개명 폼), Pay(결제), Done(신청 완료)
  `<x-dc>` 안의 인라인 스타일 HTML이 실제 화면 구조입니다. 마지막 `<script type="text/x-dc">`와 support.js 참조는 무시하세요.

## Claude Code 첫 입력 (새 터미널에서 빈 폴더 sajuboss-web 만들고 시작)
지시문_sajuboss.md와 design/ 폴더를 읽고, 1단계부터 진행해 주세요. 한 단계가 끝나면 변경 내용과 검증 결과를 보고하고 내 승인을 받은 뒤 다음 단계로 넘어가세요. 시작 전에 지시문 맨 아래 "시작 전에 나에게 물어볼 것" 3가지를 먼저 질문해 주세요.
