import { PillarTable } from "@/components/report/PillarTable";
import { Card } from "@/components/ui/Card";
import type { ReportPreview } from "@/lib/report/preview";
import { visibleText } from "@/lib/report/view";

// 결제 전 미리보기(결정됨 2026-10-22: 사주표 + 세운 총평 1문장). 계산만 하고 저장하지 않습니다.
// 총평이 문구 확정 전 자리표시면 운영 환경에서는 사주표만 보여 줍니다.
export function PreviewBody({ preview }: { preview: Extract<ReportPreview, { ok: true }> }) {
  const summary = visibleText(preview.summary.text);
  return (
    <>
      <PillarTable pillars={preview.pillars} caption="내 사주표" />
      {summary && (
        <p className="preview-summary">
          <strong>2027년({preview.seun.pillar}) 한눈에</strong> {summary}
        </p>
      )}
      {preview.boundaryRisk && (
        <p className="muted small">태어난 시각에 따라 일부 결과가 달라질 수 있습니다.</p>
      )}
    </>
  );
}

export function ReportPreviewCard({ preview }: { preview: Extract<ReportPreview, { ok: true }> }) {
  return (
    <Card className="preview-card">
      <strong className="my-card-title">미리보기</strong>
      <PreviewBody preview={preview} />
      <p className="muted small">결제하면 12개월 흐름과 움직일 달·조심할 달이 담긴 전체 리포트가 열립니다.</p>
    </Card>
  );
}
