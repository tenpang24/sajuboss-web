# 소상공닷컴 사주 계산 코드 원본 보관

이 폴더는 원본을 그대로 보관만 합니다. 빌드·tsconfig·lint에서 제외되어 있고, 앱 코드가 import하지 않습니다.
실제로 쓰는 엔진은 `lib/saju-engine/`입니다(원본을 바탕으로 다시 작성).

- 원본 저장소: `sosangkong-web` (로컬 `C:\Users\pppark\sosangkong-web`, 원격 `github.com/moonpak45-ui/sosangkong-web`)
- 원본 커밋: `3c08968`
- 복사일: 2026-10-14
- 복사 방법: 파일 내용을 바꾸지 않고 그대로 복사(`cmp`로 원본과 같음을 확인)

| 이 폴더 | 원본 경로 | sha256 앞 16자 |
|---|---|---|
| `lib/saju/buildBazi.ts` | `lib/saju/buildBazi.ts` | `54e4946d250cf6cb` |
| `lib/saju/calcSaju.ts` | `lib/saju/calcSaju.ts` | `ab3ae5fdcda9fd5b` |
| `lib/saju/relationType.ts` | `lib/saju/relationType.ts` | `900f5c0de883be7e` |
| `types/lunar-javascript.d.ts` | `types/lunar-javascript.d.ts` | `498f28b0f82a596f` |
| `licenses/lunar-javascript-LICENSE` | `node_modules/lunar-javascript/LICENSE` (1.7.7, MIT, © 2018 6tail) | |

가져오지 않은 것: 문구 SQL(`fortune_content_bank`), 등록 화면(`app/fortune/register`), 운세 API(`app/api/fortune/daily`), 운세 카드.

## 원본과 우리 엔진의 차이(요약)

- 원본 `buildBazi`는 한국 시각을 그대로 `lunar-javascript`에 넣는다. 이 라이브러리의 절기는 중국 기준시(UTC+8)라 절입 시각이 1시간 어긋난다. 우리 엔진은 출생 순간을 UTC+8로 바꿔 비교한다.
- 원본은 년주를 입춘 **당일** 기준(`getYearInGanZhiByLiChun`), 월주를 절입 **당일** 기준(`getMonthInGanZhi`)으로 정한다. 우리 엔진은 절입 **시각** 기준(`...Exact`)이다.
- 원본은 음력 입력을 중국 음력으로 바꾼다. 우리 엔진은 한국천문연구원 기준 한국 음력으로 바꾼다.
