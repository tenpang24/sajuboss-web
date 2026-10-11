import type { Metadata } from "next";
import { PageStub } from "@/components/PageStub";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return <PageStub title="로그인" />;
}
