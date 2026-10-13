import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplyFallback, ApplyHeader } from "@/components/apply/ApplyHeader";
import { PersonForm } from "@/components/apply/PersonForm";
import { loadApplyViewer } from "@/lib/apply/viewer";

export const metadata: Metadata = {
  title: "개인·개명 작명 신청",
  description: "아기 이름, 성인 이름, 개명 후보를 오행·소리·뜻으로 평가해 받아봅니다.",
};

async function Form() {
  return <PersonForm viewer={await loadApplyViewer()} />;
}

export default function ApplyPersonPage() {
  return (
    <>
      <ApplyHeader
        active="person"
        title="개인·개명 작명 신청"
        lead="아기 이름, 성인 이름, 개명 후보를 오행·소리·뜻으로 평가해 받아봅니다."
      />
      <Suspense fallback={<ApplyFallback />}>
        <Form />
      </Suspense>
    </>
  );
}
