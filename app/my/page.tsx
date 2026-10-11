import type { Metadata } from "next";
import { PageStub } from "@/components/PageStub";

export const metadata: Metadata = { title: "내 신청" };

export default function MyPage() {
  return <PageStub title="내 신청" />;
}
