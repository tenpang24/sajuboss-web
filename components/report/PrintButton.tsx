"use client";

import { Button } from "@/components/ui/Button";

// 리포트 인쇄(브라우저 인쇄 창). 인쇄할 때는 이 버튼과 헤더·푸터가 빠집니다(app/pages.css의 @media print).
export function PrintButton() {
  return (
    <Button type="button" variant="o" size="sm" onClick={() => window.print()}>
      인쇄하기
    </Button>
  );
}
