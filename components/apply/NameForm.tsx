"use client";

import { useState } from "react";
import { submitNameBizOrder } from "@/app/apply/name/actions";
import { OrderConsents } from "@/components/order/OrderConsents";
import {
  BIZ_MOODS,
  BIZ_NAME_TYPES,
  LIMITS,
  bizMoodNames,
  bizNameTypeNames,
  type BizNameType,
} from "@/lib/apply/options";
import { orderAmount, pricing } from "@/lib/pricing";
import { packageNames, productNames, type Package } from "@/lib/products";
import {
  ApplyMobileBar,
  ApplySummary,
  ApplyTopNotice,
  AreaField,
  ChipChecks,
  ChipRadio,
  ContactFields,
  InfoNote,
  PackagePicker,
  SajuSource,
  Step,
  TextField,
  toOptions,
  useApplyForm,
  type ApplyViewer,
} from "./ApplyParts";

const PATH = "/apply/name";
const FORM_ID = "apply-name";
export const packageDescriptions: Record<Package, string> = {
  basic: "후보 5개를 오행·소리·뜻으로 평가하고 추천 1~2개를 제시합니다.",
  detail: "후보 10개와 역술가 검수 의견, 수정 1회 [범위 확정 후 기재]",
};
export const packageSummaries: Record<Package, string> = {
  basic: "후보 5개 + 추천 1~2개",
  detail: "후보 10개 + 검수 의견",
};

// 상호·브랜드 작명 신청 폼(시안 v2 Name). 저장은 서버 액션이 하고, 금액은 서버가 다시 계산합니다.
export function NameForm({ viewer }: { viewer: ApplyViewer }) {
  const { state, pending, formProps, errorOf, formError } = useApplyForm(submitNameBizOrder);
  const [nameType, setNameType] = useState<BizNameType>("new");
  const [pkg, setPkg] = useState<Package>("basic");

  const amount = orderAmount("name_biz", pkg);
  const summary = [
    { label: "상품", value: productNames.name_biz },
    { label: "패키지", value: packageNames[pkg] },
    { label: "받는 내용", value: packageSummaries[pkg] },
  ];

  return (
    <>
      <section className="wrap apply-body">
        <div className="split">
          <form id={FORM_ID} className="split-main" {...formProps}>
            <ApplyTopNotice viewer={viewer} path={PATH} />

            <Step num={1} title="어떤 이름이 필요하신가요?">
              <ChipRadio
                id="name-type"
                name="nameType"
                label="이름 종류"
                options={toOptions(BIZ_NAME_TYPES, bizNameTypeNames)}
                value={nameType}
                onChange={setNameType}
              />
            </Step>

            <Step num={2} title="사업 소개" help="이름의 방향을 잡는 데 가장 중요한 정보입니다.">
              <div className="grid-form">
                <TextField
                  id="name-business"
                  name="business"
                  label="업종"
                  placeholder="예: 동네 빵집"
                  required
                  error={errorOf("business")}
                />
                <TextField
                  id="name-area"
                  name="area"
                  label="사업장 지역"
                  opt="선택"
                  placeholder="예: 부산 해운대구"
                  error={errorOf("area")}
                />
              </div>
              <TextField
                id="name-intro"
                name="intro"
                label="한 줄 소개"
                maxLength={LIMITS.sentence}
                placeholder="예: 아침마다 굽는 천연발효 식빵 가게"
                required
                error={errorOf("intro")}
              />
              <TextField
                id="name-customers"
                name="customers"
                label="주 고객"
                opt="선택"
                maxLength={LIMITS.sentence}
                placeholder="예: 동네 30~40대 주부, 출근길 직장인"
                error={errorOf("customers")}
              />
            </Step>

            <Step num={3} title="원하는 느낌" help="여러 개 고를 수 있습니다.">
              <ChipChecks
                id="name-moods"
                name="moods"
                label="느낌·키워드"
                opt="선택"
                options={toOptions(BIZ_MOODS, bizMoodNames)}
              />
              <div className="grid-form">
                <TextField
                  id="name-include"
                  name="includeChars"
                  label="넣고 싶은 글자"
                  opt="선택"
                  maxLength={LIMITS.chars}
                  placeholder="예: 해, 온"
                  error={errorOf("includeChars")}
                />
                <TextField
                  id="name-avoid"
                  name="avoidChars"
                  label="피하고 싶은 글자"
                  opt="선택"
                  maxLength={LIMITS.chars}
                  error={errorOf("avoidChars")}
                />
              </div>
            </Step>

            <Step num={4} title="대표자 정보" help="오행 보완과 글자 선택에 씁니다.">
              <SajuSource form="name" viewer={viewer} errorOf={errorOf} fieldError={state} />
            </Step>

            <Step
              num={5}
              title="이미 생각해 둔 후보가 있나요?"
              help="있으면 같은 기준으로 함께 평가해 드립니다."
            >
              <AreaField
                id="name-candidates"
                name="candidates"
                label="후보 이름"
                opt="선택, 줄바꿈으로 구분"
                placeholder={"예:\n해온베이커리\n아침빵집"}
                error={errorOf("candidates")}
              />
            </Step>

            <Step num={6} title="패키지 선택">
              <PackagePicker
                value={pkg}
                onChange={setPkg}
                prices={pricing.nameBiz}
                descriptions={packageDescriptions}
              />
            </Step>

            <Step num={7} title="받는 방법과 요청사항">
              <ContactFields form="name" viewer={viewer} errorOf={errorOf} />
              <AreaField
                id="name-memo"
                name="memo"
                label="추가 요청사항"
                opt="선택"
                error={errorOf("memo")}
              />
            </Step>

            <InfoNote>
              작명은 상표 등록 가능 여부나 같은 상호가 있는지를 확인해 드리지 않습니다. 쓰시기 전에
              특허정보검색서비스(KIPRIS)와 상호 검색을 직접 확인해 주세요.
            </InfoNote>

            <OrderConsents className="step apply-consents" disclaimer="결과는 전통 명리 원리에 따른 참고용 자료이며, 사업 성과나 상표 등록 가능 여부를 보장하지 않는다는 점을 확인했습니다." />
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
