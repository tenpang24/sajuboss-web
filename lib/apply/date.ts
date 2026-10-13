import "server-only";
import {
  DATE_RANGE_MAX_MONTHS,
  DATE_START_MAX_MONTHS,
  LIMITS,
  OPEN_TYPES,
  WEEKDAY_PREFS,
} from "@/lib/apply/options";
import {
  InputError,
  choice,
  line,
  longText,
  optionalChoice,
  resolveSaju,
  runForm,
} from "@/lib/apply/shared";
import { readBirthForm } from "@/lib/saju";
import { addMonths, parseDate, todayInSeoul } from "@/lib/validation";

// 개업택일 신청 폼 검증. 아래에 적힌 이름만 읽어 payload를 만듭니다.

// 희망 개업 기간: 실제 날짜, 오늘(한국 시각) 이후, 끝이 시작보다 빠르지 않고, 길이는 최대 6개월
function readDateRange(formData: FormData) {
  const today = todayInSeoul();
  const from = parseDate(formData.get("dateFrom"));
  if (!from) {
    throw new InputError("가장 빠른 날짜를 선택해 주세요.", "dateFrom");
  }
  if (from < today) {
    throw new InputError("가장 빠른 날짜는 오늘 이후로 선택해 주세요.", "dateFrom");
  }
  if (from > addMonths(today, DATE_START_MAX_MONTHS)) {
    throw new InputError(
      `가장 빠른 날짜는 오늘부터 ${DATE_START_MAX_MONTHS / 12}년 안에서 선택해 주세요.`,
      "dateFrom",
    );
  }

  const to = parseDate(formData.get("dateTo"));
  if (!to) {
    throw new InputError("가장 늦은 날짜를 선택해 주세요.", "dateTo");
  }
  if (to < from) {
    throw new InputError("가장 늦은 날짜가 가장 빠른 날짜보다 앞섭니다. 다시 선택해 주세요.", "dateTo");
  }
  if (to > addMonths(from, DATE_RANGE_MAX_MONTHS)) {
    throw new InputError(`날짜 범위는 최대 ${DATE_RANGE_MAX_MONTHS}개월까지 선택할 수 있습니다.`, "dateTo");
  }
  return { from, to };
}

export function readDateForm(formData: FormData, userId: string) {
  return runForm(async () => {
    const openType = choice(formData, "openType", "개업 유형", OPEN_TYPES);
    const business = line(formData, "business", "업종", LIMITS.line, true);
    const area = line(formData, "area", "사업장 지역", LIMITS.line, true);

    const { source, saju } = await resolveSaju(formData, userId);

    const range = readDateRange(formData);
    const avoid = line(formData, "avoid", "피해야 할 요일·날짜", LIMITS.sentence);
    const weekdayPref = optionalChoice(formData, "weekdayPref", "선호 요일", WEEKDAY_PREFS) ?? "any";

    // 동업자 추가(+금액). 체크했으면 동업자 생년월일·양력음력·시각도 같은 규칙으로 검증합니다.
    const partner = formData.get("partner") === "on";
    let partnerSaju = null;
    if (partner) {
      const parsed = readBirthForm(formData, { prefix: "partner_" });
      if (!parsed.ok) {
        throw new InputError(`동업자 ${parsed.error}`, parsed.field);
      }
      partnerSaju = parsed.value;
    }

    const memo = longText(formData, "memo", "추가 요청사항");

    return {
      partner,
      payload: {
        form: "date",
        open_type: openType,
        business,
        area,
        saju_source: source,
        saju,
        date_from: range.from,
        date_to: range.to,
        avoid,
        weekday_pref: weekdayPref,
        partner,
        partner_saju: partnerSaju,
        memo,
      },
    };
  });
}
