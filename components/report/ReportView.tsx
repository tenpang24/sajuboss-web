import { PillarTable } from "@/components/report/PillarTable";
import { PrintButton } from "@/components/report/PrintButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Grade } from "@/lib/saju-engine/judgment-table";
import { visibleText, type StoredReport } from "@/lib/report/view";

// 고객용 신년 리포트 본문(설계서 2장 순서).
// ① 표지 ② 2027년 한눈에 보기 ③ 나의 사업 기질 ④ 월별 사업운 12개월 ⑤ 움직일 달·조심할 달 ⑥ 상반기·하반기 제안 ⑦ 계산 기준과 유의
// 문장은 저장된 그대로 보여 주고, 문구 확정 전 자리표시는 운영 환경에서 숨깁니다(visibleText). 문장이 하나도 안 남는 섹션은 통째로 숨깁니다.

type StoredMonth = StoredReport["calc"]["months"][number];

const FIELDS = [
  { key: "B", label: "사업운" },
  { key: "S", label: "매출운" },
  { key: "D", label: "거래운" },
] as const;

const gradeTone: Record<Grade, "y" | "line" | "tint"> = { 길: "y", 중: "tint", 흉: "line" };

// "2027-02-04 10:46:12" → 2월 4일. 끝은 다음 절입 날짜의 전날(그날 절입 시각 전까지가 이 달)
function dayLabel(kst: string, minusDays = 0) {
  const [y, m, d] = kst.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - minusDays));
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
}

export function monthRange(month: StoredMonth) {
  return `${dayLabel(month.startKst)} ~ ${dayLabel(month.endKst, 1)} (${month.pillar}월)`;
}

function MonthList({ title, indexes, months }: { title: string; indexes: number[]; months: StoredMonth[] }) {
  return (
    <div className="rv-pick">
      <strong>{title}</strong>
      <ul>
        {indexes.map((index) => {
          const month = months.find((item) => item.index === index);
          return month ? <li key={index}>{monthRange(month)}</li> : null;
        })}
      </ul>
    </div>
  );
}

export function ReportView({ report, orderNo }: { report: StoredReport; orderNo: string }) {
  const calc = report.calc;
  const seun = visibleText(report.seunSummary?.text);
  const dayGan = visibleText(report.dayGanPhrase?.text);
  const firstHalf = visibleText(report.halves?.first.phrase.text);
  const secondHalf = visibleText(report.halves?.second.phrase.text);
  const applied = calc.corrections.applied;

  return (
    <article className="rv">
      <div className="rv-actions">
        <ButtonLink href="/my" variant="g" size="sm">
          ← 내 신청
        </ButtonLink>
        <PrintButton />
      </div>

      {/* ① 표지 */}
      <section className="cover rv-cover" aria-labelledby="rv-title">
        <div className="cover-head">
          <div>
            <div className="cover-year">2027 정미년</div>
            <h1 className="cover-title" id="rv-title">
              신년 사업운
              <br />
              월별 리포트
            </h1>
          </div>
          <Badge tone="dark" className="cover-badge">
            신청 번호 {orderNo}
          </Badge>
        </div>
        <div className="cover-bars" aria-hidden="true">
          {calc.months.map((month) => (
            <div
              key={month.index}
              className={month.grade === "길" ? "is-good" : month.grade === "흉" ? "is-careful" : undefined}
              style={{ height: `${36 + Math.max(0, Math.min(month.score, 3)) * 28}px` }}
            />
          ))}
        </div>
        <div className="cover-caption">노랑: 길한 달 · 흰색: 흉한 달 · 입춘부터 시작하는 절기 달 기준</div>
        <div className="rv-cover-saju">
          <PillarTable pillars={calc.natal} />
          <p className="rv-basis">
            한국 표준시 기준, 입춘을 해의 경계로 봅니다. 서머타임·옛 표준시 시기는 보정했습니다.
          </p>
          {calc.boundaryRisk && <p className="rv-basis">태어난 시각에 따라 일부 결과가 달라질 수 있습니다.</p>}
          <p className="rv-basis">전통 명리 원리에 따른 참고용 자료이며 투자·법률·의료 판단을 대신하지 않습니다.</p>
        </div>
      </section>

      {/* ② 2027년 한눈에 보기 */}
      {seun && (
        <Card className="rv-sec">
          <h2 className="t3">2027년 한눈에 보기</h2>
          <p className="muted small">2027년 세운 {calc.seun.pillar}</p>
          <p>{seun}</p>
        </Card>
      )}

      {/* ③ 나의 사업 기질 */}
      {dayGan && (
        <Card className="rv-sec">
          <h2 className="t3">나의 사업 기질</h2>
          <p className="muted small">일간 {calc.dayGan}</p>
          <p>{dayGan}</p>
        </Card>
      )}

      {/* ④ 월별 사업운 12개월 */}
      <section className="rv-sec rv-months" aria-labelledby="rv-months-title">
        <h2 className="t2" id="rv-months-title">
          월별 사업운 12개월
        </h2>
        <div className="chart-legend rv-legend">
          <span>
            <i className="is-good" aria-hidden="true" />길
          </span>
          <span>
            <i className="is-normal" aria-hidden="true" />중
          </span>
          <span>
            <i className="is-careful" aria-hidden="true" />흉
          </span>
        </div>
        <ol className="rv-month-list">
          {calc.months.map((month, i) => {
            const phrases = report.months[i];
            const rows = FIELDS.map((field) => ({ ...field, text: visibleText(phrases?.[field.key]?.text) })).filter(
              (row) => row.text,
            );
            const relation = visibleText(phrases?.relation?.text);
            return (
              <li key={month.index}>
                <Card className="month-card rv-month">
                  <div className="rv-month-head">
                    <span className="month-label">{monthRange(month)}</span>
                    <Badge tone={gradeTone[month.grade]} className="rv-grade">
                      {month.grade}
                    </Badge>
                  </div>
                  {rows.length > 0 && (
                    <div className="month-rows">
                      {rows.map((row) => (
                        <div key={row.key}>
                          <strong>{row.label}</strong> · {row.text}
                        </div>
                      ))}
                    </div>
                  )}
                  {relation && <p className="rv-relation">{relation}</p>}
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ⑤ 움직일 달·조심할 달 */}
      <Card className="rv-sec">
        <h2 className="t3">움직일 달 · 조심할 달</h2>
        <div className="rv-picks">
          <MonthList title="움직일 달" indexes={calc.bestMonths.indexes} months={calc.months} />
          <MonthList title="조심할 달" indexes={calc.cautionMonths.indexes} months={calc.months} />
        </div>
      </Card>

      {/* ⑥ 상반기·하반기 제안 */}
      {(firstHalf || secondHalf) && (
        <Card className="rv-sec">
          <h2 className="t3">상반기 · 하반기 제안</h2>
          {firstHalf && (
            <p>
              <strong>상반기</strong> {firstHalf}
            </p>
          )}
          {secondHalf && (
            <p>
              <strong>하반기</strong> {secondHalf}
            </p>
          )}
        </Card>
      )}

      {/* ⑦ 계산 기준과 유의 */}
      <Card tint className="rv-sec rv-notes">
        <h2 className="t3">계산 기준과 유의</h2>
        <ul>
          <li>생년월일시를 한국 표준시 기준 절기 만세력으로 계산했습니다. 해는 입춘, 달은 절기(입춘·경칩 등 12절)로 나눕니다.</li>
          <li>
            서머타임 보정 {applied.summerTimeHourRemoved ? "적용(1시간 뺌)" : "해당 없음"} · 계산에 쓴 표준시{" "}
            {applied.standardOffset}
          </li>
          {calc.timeUncertain && <li>태어난 시각을 몰라 시주 없이 계산했습니다.</li>}
          <li>길·중·흉은 그 달 천간과 내 일간의 관계, 그 달 지지와 내 일지의 관계로 정했습니다.</li>
          <li>참고용 자료이며 투자·법률·의료 판단을 대신하지 않습니다. 중요한 결정은 실제 상황과 함께 판단해 주세요.</li>
        </ul>
        <p className="muted small">
          {report.engineVersion} · {report.phraseVersion}
        </p>
      </Card>
    </article>
  );
}
