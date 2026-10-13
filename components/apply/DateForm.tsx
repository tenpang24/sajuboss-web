"use client";

import { useState } from "react";
import { submitDateOrder } from "@/app/apply/date/actions";
import { SajuFields } from "@/components/saju/SajuFields";
import {
  DATE_RANGE_MAX_MONTHS,
  LIMITS,
  OPEN_TYPES,
  WEEKDAY_PREFS,
  openTypeNames,
  weekdayPrefNames,
  type OpenType,
  type WeekdayPref,
} from "@/lib/apply/options";
import { formatKrw, orderAmount, pricing } from "@/lib/pricing";
import { productNames } from "@/lib/products";
import {
  ApplyMobileBar,
  ApplySummary,
  ApplyTopNotice,
  AreaField,
  ChipRadio,
  ContactFields,
  OrderConsents,
  SajuSource,
  Step,
  TextField,
  toOptions,
  useApplyForm,
  type ApplyViewer,
} from "./ApplyParts";

const PATH = "/apply/date";
const FORM_ID = "apply-date";
// 개업택일 신청 폼(시안 v2 Date). 저장은 서버 액션이 하고, 금액은 서버가 다시 계산합니다.
export function DateForm({ viewer }: { viewer: ApplyViewer }) {
  const { state, pending, formProps, errorOf, formError } = useApplyForm(submitDateOrder);
  const [openType, setOpenType] = useState<OpenType>("new");
  const [weekdayPref, setWeekdayPref] = useState<WeekdayPref>("any");
  const [partner, setPartner] = useState(false);
  const [dateFrom, setDateFrom] = useState("");

  const amount = orderAmount("date", null, { partner });
  const summary = [
    { label: "상품", value: productNames.date },
    { label: "받는 내용", value: "후보 날짜 3개 + 선정 이유" },
    { label: "기본 금액", value: formatKrw(pricing.date.base) },
    ...(partner ? [{ label: "동업자 추가", value: `+${formatKrw(pricing.date.partnerAddon)}` }] : []),
  ];

  return (
    <>
      <section className="wrap apply-body">
        <div className="split">
          <form id={FORM_ID} className="split-main" {...formProps}>
            <ApplyTopNotice viewer={viewer} path={PATH} />

            <Step num={1} title="어떤 개업인가요?">
              <ChipRadio
                id="date-type"
                name="openType"
                label="개업 유형"
                options={toOptions(OPEN_TYPES, openTypeNames)}
                value={openType}
                onChange={setOpenType}
              />
              <div className="grid-form">
                <TextField
                  id="date-business"
                  name="business"
                  label="업종"
                  placeholder="예: 한식 음식점, 미용실"
                  required
                  error={errorOf("business")}
                />
                <TextField
                  id="date-area"
                  name="area"
                  label="사업장 지역"
                  placeholder="예: 부산 해운대구"
                  required
                  error={errorOf("area")}
                />
              </div>
            </Step>

            <Step num={2} title="대표자 정보" help="절기 기준으로 사주를 세우는 데 씁니다.">
              <SajuSource
                form="date"
                viewer={viewer}
                errorOf={errorOf}
                fieldError={state}
                unknownNote="(제공 범위 [확정 후 기재])"
              />
            </Step>

            <Step
              num={3}
              title="원하는 날짜 범위"
              help={`후보 날짜 3개를 이 범위 안에서 고릅니다. 범위는 최대 ${DATE_RANGE_MAX_MONTHS}개월입니다.`}
            >
              <div className="grid-form">
                <TextField
                  id="date-from"
                  name="dateFrom"
                  label="가장 빠른 날짜"
                  type="date"
                  min={viewer.today}
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  required
                  error={errorOf("dateFrom")}
                />
                <TextField
                  id="date-to"
                  name="dateTo"
                  label="가장 늦은 날짜"
                  type="date"
                  min={dateFrom || viewer.today}
                  required
                  error={errorOf("dateTo")}
                />
              </div>
              <TextField
                id="date-avoid"
                name="avoid"
                label="피해야 할 요일·날짜"
                opt="선택"
                maxLength={LIMITS.sentence}
                placeholder="예: 월요일 정기휴무, 3월 10일 가족 행사"
                error={errorOf("avoid")}
              />
              <ChipRadio
                id="date-weekday"
                name="weekdayPref"
                label="선호 요일"
                opt="선택"
                options={toOptions(WEEKDAY_PREFS, weekdayPrefNames)}
                value={weekdayPref}
                onChange={setWeekdayPref}
              />
            </Step>

            <Step
              num={4}
              title="함께 보고 싶은 사람"
              help="동업자나 공동대표가 있으면 두 분 모두와 부딪히지 않는 날을 찾습니다."
            >
              <label className="check apply-partner">
                <input
                  type="checkbox"
                  name="partner"
                  checked={partner}
                  onChange={(event) => setPartner(event.target.checked)}
                />
                <span>
                  동업자·공동대표 정보 추가{" "}
                  <span className="apply-plus">+{formatKrw(pricing.date.partnerAddon)}</span>
                </span>
              </label>
              {partner && (
                <div className="apply-partner-box">
                  <SajuFields
                    idPrefix="date-partner"
                    namePrefix="partner_"
                    withGender={false}
                    birthLabel="동업자 생년월일"
                    birthPlaceholder="예: 1975-08-02"
                    timePlaceholder="예: 09:00"
                    error={state.error}
                    errorField={state.field}
                  />
                </div>
              )}
            </Step>

            <Step num={5} title="받는 방법과 요청사항">
              <ContactFields form="date" viewer={viewer} errorOf={errorOf} />
              <AreaField
                id="date-memo"
                name="memo"
                label="추가 요청사항"
                opt="선택"
                placeholder="예: 오전 개업을 원합니다"
                error={errorOf("memo")}
              />
            </Step>

            <OrderConsents disclaimer="결과는 전통 명리 원리에 따른 참고용 자료이며, 사업 성과를 보장하지 않는다는 점을 확인했습니다." />
            {formError}
          </form>

          <ApplySummary
            viewer={viewer}
            path={PATH}
            formId={FORM_ID}
            pending={pending}
            rows={summary}
            amount={amount}
          />
        </div>
      </section>

      <ApplyMobileBar viewer={viewer} path={PATH} formId={FORM_ID} pending={pending} amount={amount} />
    </>
  );
}
