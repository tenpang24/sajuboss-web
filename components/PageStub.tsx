// 아직 만들지 않은 단계의 빈 페이지. 각 단계에서 실제 화면으로 교체합니다.
export function PageStub({ title, note }: { title: string; note?: string }) {
  return (
    <div className="wrap page-stub">
      <h1 className="t1 t1-sm">{title}</h1>
      <p>{note ?? "준비 중인 화면입니다."}</p>
    </div>
  );
}
