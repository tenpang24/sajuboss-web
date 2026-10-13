import "server-only";
import {
  BABY_DUE_MAX_DAYS,
  LIMITS,
  NAME_LENGTHS,
  PERSON_KINDS,
  PERSON_MOODS,
  RENAME_REASONS,
} from "@/lib/apply/options";
import {
  InputError,
  choice,
  choices,
  line,
  longText,
  optionalChoice,
  resolveSaju,
  runForm,
} from "@/lib/apply/shared";
import { parseBirthDate } from "@/lib/validation";

// 개인·개명 작명 신청 폼 검증. 아래에 적힌 이름만 읽어 payload를 만듭니다.
// 패키지(basic/detail)는 createOrder가 허용값과 필수 여부를 확인합니다.
export function readNamePersonForm(formData: FormData, userId: string) {
  return runForm(async () => {
    // kind는 baby / adult / rename 중 하나만 받습니다.
    const kind = choice(formData, "kind", "이름 종류", PERSON_KINDS);

    // 이름 받을 분의 사주.
    // 생년월일은 오늘까지만 받는 것이 기본이고, 아기 이름에 한해 출산 예정일(앞날)을 받습니다.
    // 아기 이름은 신청자 본인의 사주가 아니므로 저장된 내 사주를 쓸 수 없습니다.
    const { source, saju } = await resolveSaju(formData, userId, {
      maxFutureDays: kind === "baby" ? BABY_DUE_MAX_DAYS : 0,
      allowSelf: kind !== "baby",
    }).catch((error: unknown) => {
      if (kind === "baby" && error instanceof InputError && error.field === "birth") {
        throw new InputError(
          "출생일 또는 출산 예정일을 다시 확인해 주세요. 예정일은 오늘부터 약 10개월 안으로 입력해 주세요.",
          "birth",
        );
      }
      throw error;
    });

    const familyName = line(formData, "familyName", "성씨", LIMITS.line, true);

    // 현재 이름과 개명 사유는 개명일 때만 받습니다. 다른 종류에서 보내도 저장하지 않습니다.
    let currentName: string | null = null;
    let renameReason: string | null = null;
    if (kind === "rename") {
      currentName = line(formData, "currentName", "현재 이름", LIMITS.line, true);
      renameReason = optionalChoice(formData, "renameReason", "개명 사유", RENAME_REASONS);
    }

    // 가족 정보(선택)
    const parentBirthRaw = formData.get("parentBirth");
    let parentBirth: string | null = null;
    if (typeof parentBirthRaw === "string" && parentBirthRaw.trim() !== "") {
      parentBirth = parseBirthDate(parentBirthRaw);
      if (!parentBirth) {
        throw new InputError("부모 생년월일을 다시 확인해 주세요. 예: 1990-05-21", "parentBirth");
      }
    }
    const avoidChars = line(formData, "avoidChars", "돌림자·피하고 싶은 글자", LIMITS.chars);

    const moods = choices(formData, "moods", PERSON_MOODS);
    const nameLength = optionalChoice(formData, "nameLength", "이름 글자 수", NAME_LENGTHS) ?? "any";
    const includeChars = line(formData, "includeChars", "넣고 싶은 글자", LIMITS.chars);
    const candidates = longText(formData, "candidates", "이미 생각해 둔 후보");

    return {
      payload: {
        form: "name_person",
        kind,
        saju_source: source,
        saju,
        family_name: familyName,
        current_name: currentName,
        rename_reason: renameReason,
        parent_birth_date: parentBirth,
        avoid_chars: avoidChars,
        moods,
        name_length: nameLength,
        include_chars: includeChars,
        candidates,
      },
    };
  });
}
