import type { Metadata } from "next";
import { Suspense } from "react";
import { PageStub } from "@/components/PageStub";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "신청 관리" };

async function AdminOrdersContent() {
  await requireAdmin("/admin/orders");
  return <PageStub title="신청 관리" />;
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={null}>
      <AdminOrdersContent />
    </Suspense>
  );
}
