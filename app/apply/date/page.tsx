import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplyFallback, ApplyHeader } from "@/components/apply/ApplyHeader";
import { DateForm } from "@/components/apply/DateForm";
import { loadApplyViewer } from "@/lib/apply/viewer";

export const metadata: Metadata = {
  title: "개업택일 신청",
  description: "내 사주와 부딪히지 않는 개업 후보 날짜 3개를 선정 이유와 함께 받아봅니다.",
};

async function Form() {
  return <DateForm viewer={await loadApplyViewer()} />;
}

export default function ApplyDatePage() {
  return (
    <>
      <ApplyHeader
        active="date"
        title="개업택일 신청"
        lead="내 사주와 부딪히지 않는 개업 후보 날짜 3개를 선정 이유와 함께 받아봅니다."
      />
      <Suspense fallback={<ApplyFallback />}>
        <Form />
      </Suspense>
    </>
  );
}
