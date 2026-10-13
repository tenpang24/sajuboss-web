import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplyFallback, ApplyHeader } from "@/components/apply/ApplyHeader";
import { NameForm } from "@/components/apply/NameForm";
import { loadApplyViewer } from "@/lib/apply/viewer";

export const metadata: Metadata = {
  title: "상호·브랜드 작명 신청",
  description:
    "가게 이름과 브랜드 이름 후보를 오행·소리·뜻으로 평가해 추천 이름을 골라 드립니다.",
};

async function Form() {
  return <NameForm viewer={await loadApplyViewer()} />;
}

export default function ApplyNamePage() {
  return (
    <>
      <ApplyHeader
        active="name"
        title="상호·브랜드 작명 신청"
        lead="가게 이름과 브랜드 이름 후보를 오행·소리·뜻으로 평가해 추천 이름을 골라 드립니다."
      />
      <Suspense fallback={<ApplyFallback />}>
        <Form />
      </Suspense>
    </>
  );
}
