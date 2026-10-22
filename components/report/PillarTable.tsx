// 사주표(시·일·월·년주). 태어난 시각을 모르면 시주 칸을 비워 둡니다.
// 리포트 화면, 결제 전 미리보기, 내 신청의 사전신청 미리보기에서 함께 씁니다.

export type PillarValues = { year: string; month: string; day: string; hour: string | null };

const COLUMNS: { key: keyof PillarValues; label: string }[] = [
  { key: "hour", label: "시주" },
  { key: "day", label: "일주" },
  { key: "month", label: "월주" },
  { key: "year", label: "년주" },
];

export function PillarTable({ pillars, caption }: { pillars: PillarValues; caption?: string }) {
  return (
    <table className="pillars">
      {caption && <caption className="pillars-caption">{caption}</caption>}
      <thead>
        <tr>
          {COLUMNS.map((column) => (
            <th key={column.key} scope="col">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {COLUMNS.map((column) => {
            const value = pillars[column.key];
            return (
              <td key={column.key} className={value ? undefined : "pillars-empty"}>
                {value ? (
                  <>
                    <span className="pillars-gan">{value[0]}</span>
                    <span className="pillars-zhi">{value[1]}</span>
                  </>
                ) : (
                  <span className="pillars-unknown">시각 모름</span>
                )}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
