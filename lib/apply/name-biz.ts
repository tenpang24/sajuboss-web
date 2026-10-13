import "server-only";
import { BIZ_MOODS, BIZ_NAME_TYPES, LIMITS } from "@/lib/apply/options";
import { choice, choices, line, longText, resolveSaju, runForm } from "@/lib/apply/shared";

// 상호·브랜드 작명 신청 폼 검증. 아래에 적힌 이름만 읽어 payload를 만듭니다.
// 패키지(basic/detail)는 createOrder가 허용값과 필수 여부를 확인합니다.
export function readNameBizForm(formData: FormData, userId: string) {
  return runForm(async () => {
    const nameType = choice(formData, "nameType", "이름 종류", BIZ_NAME_TYPES);
    const business = line(formData, "business", "업종", LIMITS.line, true);
    const area = line(formData, "area", "사업장 지역", LIMITS.line);
    const intro = line(formData, "intro", "한 줄 소개", LIMITS.sentence, true);
    const customers = line(formData, "customers", "주 고객", LIMITS.sentence);

    const moods = choices(formData, "moods", BIZ_MOODS);
    const includeChars = line(formData, "includeChars", "넣고 싶은 글자", LIMITS.chars);
    const avoidChars = line(formData, "avoidChars", "피하고 싶은 글자", LIMITS.chars);

    const { source, saju } = await resolveSaju(formData, userId);

    const candidates = longText(formData, "candidates", "후보 이름");
    const memo = longText(formData, "memo", "추가 요청사항");

    return {
      payload: {
        form: "name_biz",
        name_type: nameType,
        business,
        area,
        intro,
        customers,
        moods,
        include_chars: includeChars,
        avoid_chars: avoidChars,
        saju_source: source,
        saju,
        candidates,
        memo,
      },
    };
  });
}
