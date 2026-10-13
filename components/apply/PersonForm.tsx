"use client";

import { useState } from "react";
import { submitNamePersonOrder } from "@/app/apply/person/actions";
import { formatBirth } from "@/components/saju/SajuFields";
import { OrderConsents } from "@/components/order/OrderConsents";
import {
  LIMITS,
  NAME_LENGTHS,
  PERSON_KINDS,
  PERSON_MOODS,
  RENAME_REASONS,
  nameLengthNames,
  packageDescriptions,
  packageSummaries,
  personKindNames,
  personKindProductNames,
  personMoodNames,
  renameReasonNames,
  type PersonKind,
} from "@/lib/apply/options";
import { orderAmount, pricing } from "@/lib/pricing";
import { packageNames, type Package } from "@/lib/products";
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
  SelectField,
  Step,
  TextField,
  toOptions,
  useApplyForm,
  type ApplyViewer,
} from "./ApplyParts";

const PATH = "/apply/person";
const FORM_ID = "apply-person";
// 개인·개명 작명 신청 폼(시안 v2 Person). 저장은 서버 액션이 하고, 금액은 서버가 다시 계산합니다.
export function PersonForm({ viewer }: { viewer: ApplyViewer }) {
  const { state, pending, formProps, errorOf, formError } = useApplyForm(submitNamePersonOrder);
  const [kind, setKind] = useState<PersonKind>("baby");
  const [pkg, setPkg] = useState<Package>("basic");
  const [parentBirth, setParentBirth] = useState("");
  const isBaby = kind === "baby";
  const isRename = kind === "rename";

  const amount = orderAmount("name_person", pkg);
  const summary = [
    { label: "상품", value: personKindProductNames[kind] },
    { label: "패키지", value: packageNames[pkg] },
    { label: "받는 내용", value: packageSummaries[pkg] },
  ];

  return (
    <>
      <section className="wrap apply-body">
        <div className="split">
          <form id={FORM_ID} className="split-main" {...formProps}>
            <ApplyTopNotice viewer={viewer} path={PATH} />

            <Step num={1} title="어떤 이름인가요?">
              <ChipRadio
                id="person-kind"
                name="kind"
                label="이름 종류"
                options={toOptions(PERSON_KINDS, personKindNames)}
                value={kind}
                onChange={setKind}
              />
            </Step>

            <Step
              num={2}
              title="이름 받을 분 정보"
              help={
                isBaby
                  ? "절기 기준으로 사주를 세우는 데 씁니다. 아직 태어나지 않았다면 출산 예정일을 넣어 주세요."
                  : "절기 기준으로 사주를 세우는 데 씁니다."
              }
            >
              {/* 아기 이름은 신청자 본인의 사주가 아니므로 저장된 내 사주를 쓰지 않습니다. */}
              <SajuSource
                key={isBaby ? "baby" : "grown"}
                form="person"
                viewer={viewer}
                allowSelf={!isBaby}
                allowUnknownGender={isBaby}
                errorOf={errorOf}
                fieldError={state}
                birthLabel={isBaby ? "출생일 또는 출산 예정일" : "생년월일"}
                birthPlaceholder={isBaby ? "예: 2026-12-03" : "예: 1972-03-15"}
                timePlaceholder="예: 06:40"
              />
            </Step>

            <Step num={3} title={isRename ? "성씨와 현재 이름" : "성씨"}>
              <div className="grid-form">
                <TextField
                  id="person-family"
                  name="familyName"
                  label="성씨"
                  placeholder="예: 박(朴)"
                  required
                  error={errorOf("familyName")}
                />
                {isRename && (
                  <TextField
                    id="person-current"
                    name="currentName"
                    label="현재 이름"
                    required
                    error={errorOf("currentName")}
                  />
                )}
                {isRename && (
                  <SelectField
                    id="person-reason"
                    name="renameReason"
                    label="개명 사유"
                    opt="선택"
                    defaultValue=""
                    error={errorOf("renameReason")}
                  >
                    <option value="">선택해 주세요</option>
                    {RENAME_REASONS.map((value) => (
                      <option key={value} value={value}>
                        {renameReasonNames[value]}
                      </option>
                    ))}
                  </SelectField>
                )}
              </div>
              {isRename && (
                <p className="card-tint apply-legal">
                  개명은 가정법원 허가가 필요한 절차입니다. 이 서비스는 후보 이름의 참고 평가만
                  제공하며 법적 절차를 대행하지 않습니다.
                </p>
              )}
            </Step>

            <Step
              num={4}
              title={
                <>
                  가족 정보 <span className="opt">(선택)</span>
                </>
              }
              help="아기 이름은 부모와의 글자 조화를 함께 봅니다."
            >
              <div className="grid-form">
                <TextField
                  id="person-parent"
                  name="parentBirth"
                  label="부모 생년월일 (한 분)"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="예: 1990-05-21"
                  value={parentBirth}
                  onChange={(event) => setParentBirth(formatBirth(event.target.value))}
                  error={errorOf("parentBirth")}
                />
                <TextField
                  id="person-avoid"
                  name="avoidChars"
                  label="돌림자·피하고 싶은 글자"
                  maxLength={LIMITS.chars}
                  error={errorOf("avoidChars")}
                />
              </div>
            </Step>

            <Step num={5} title="원하는 이름">
              <ChipChecks
                id="person-moods"
                name="moods"
                label="원하는 느낌"
                opt="선택, 여러 개"
                options={toOptions(PERSON_MOODS, personMoodNames)}
              />
              <div className="grid-form">
                <SelectField
                  id="person-length"
                  name="nameLength"
                  label="이름 글자 수"
                  defaultValue="any"
                  error={errorOf("nameLength")}
                >
                  {NAME_LENGTHS.map((value) => (
                    <option key={value} value={value}>
                      {nameLengthNames[value]}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  id="person-include"
                  name="includeChars"
                  label="넣고 싶은 글자"
                  opt="선택"
                  maxLength={LIMITS.chars}
                  error={errorOf("includeChars")}
                />
              </div>
              <AreaField
                id="person-candidates"
                name="candidates"
                label="이미 생각해 둔 후보"
                opt="선택"
                placeholder="줄바꿈으로 구분해 주세요"
                error={errorOf("candidates")}
              />
            </Step>

            <Step num={6} title="패키지 선택">
              <PackagePicker
                value={pkg}
                onChange={setPkg}
                prices={pricing.namePerson}
                descriptions={packageDescriptions}
              />
            </Step>

            <Step num={7} title="받는 방법">
              <ContactFields form="person" viewer={viewer} errorOf={errorOf} />
            </Step>

            <InfoNote>
              이름은 전통 명리와 소리 기준의 참고 평가입니다. 출생신고나 가족관계등록에 쓸 한자는
              인명용 한자인지 직접 확인해 주세요.
            </InfoNote>

            <OrderConsents className="step apply-consents" disclaimer="결과는 전통 명리 원리에 따른 참고용 자료이며, 결과를 보장하지 않는다는 점을 확인했습니다." />
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
