# 사주 엔진 테스트 정답 자료

정답은 모두 한국천문연구원(KASI) 자료입니다. 라이브러리(lunar-javascript) 계산값은 정답으로 쓰지 않습니다.
이용 조건은 한국천문연구원 저작권정책(https://www.kasi.re.kr/kor/pageView/134)을 따릅니다. 앱 번들에는 들어가지 않고 테스트에만 씁니다.

| 파일 | 출처 | 받은 날 | 내용 |
|---|---|---|---|
| `kasi-24gi-1920-2100.txt` | 한국천문연구원 천문우주정보 > 역서 > "24기 데이터 다운받기"(https://astro.kasi.re.kr/kor/almanac/solarTerms/download), 원래 파일 이름 `24기입기시각(1920-2100)_20260902.txt` | 2026-10-14 | 1920~2100년 24기 입기 시각. KST(UTC+9), 분 단위 반올림. 과거 표준자오선 변경·서머타임은 반영하지 않음(파일 머리말). 내용은 받은 그대로. |
| `kasi-lunar-months.json` | 한국천문연구원 음양력변환계산(https://astro.kasi.re.kr/life/solc) | 파일 안 `fetchedAt` | 1900~2050년 한국 음력 달마다 시작일(양력)·날수·윤달 여부. `scripts/saju/fetch-kasi-lunar.mjs`가 만든다. |
| `kasi-day-samples.json` | 같은 곳 | 파일 안 `fetchedAt` | 해마다 음력 1월 1일·2월 1일과 기준일(1900-01-01, 2000-01-01, 2050-12-31)의 세차·월건·일진. `scripts/saju/fetch-kasi-samples.mjs`가 만든다. |

- 세차는 음력 해(설날) 기준, 월건은 음력 달 기준이라 사주 년주(입춘 기준)·월주(절입 기준)와 항상 같지는 않습니다. 테스트는 둘이 같아지는 날에서만 비교합니다.
- `lib/saju-engine/korean-lunar-data.ts`는 `kasi-lunar-months.json`에서 `scripts/saju/build-korean-lunar.mjs`로 만든 표입니다(앱이 씀).
