import type { Metadata } from "next";
import Link from "next/link";
import { PREORDER_FORM_ID } from "@/components/report/ids";
import { PreorderForm } from "@/components/report/PreorderForm";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckIcon } from "@/components/ui/IconCircle";
import { MobileBar } from "@/components/ui/MobileBar";
import { formatKrw, formatKrwFrom, pricing } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "2027 정미년 신년 사업운 월별 리포트",
  description:
    "올해 우리 가게가 언제 움직이고 언제 쉬어야 하는지, 열두 달 흐름으로 정리해 드립니다.",
};

type MonthKind = "good" | "careful" | "normal";

// 샘플 차트용 예시 데이터입니다. 실제 값은 내 사주로 계산합니다(리포트 생성기는 별도 설계).
const sampleMonths: { name: string; level: number; kind: MonthKind }[] = [
  { name: "인", level: 70, kind: "normal" },
  { name: "묘", level: 100, kind: "normal" },
  { name: "진", level: 140, kind: "good" },
  { name: "사", level: 90, kind: "normal" },
  { name: "오", level: 64, kind: "normal" },
  { name: "미", level: 36, kind: "careful" },
  { name: "신", level: 80, kind: "normal" },
  { name: "유", level: 110, kind: "normal" },
  { name: "술", level: 160, kind: "good" },
  { name: "해", level: 100, kind: "normal" },
  { name: "자", level: 44, kind: "careful" },
  { name: "축", level: 56, kind: "normal" },
];
const CHART_MAX = 180;
const barHeight = (level: number) => `${Math.round((level / CHART_MAX) * 100)}%`;

const monthsOf = (kind: MonthKind) =>
  sampleMonths
    .filter((month) => month.kind === kind)
    .map((month) => `${month.name}월`)
    .join("과 ");
const chartLabel = `12개월 흐름 예시 차트. ${monthsOf("good")}이 확장하기 좋은 달, ${monthsOf("careful")}이 조심할 달`;

const highlights = [
  "올해 사업 전반의 기세를 보는 총운",
  "매출·계약·관계로 나눈 12개월 흐름",
  "조심할 달 2개와 확장하기 좋은 달 2개",
  "바로 해볼 수 있는 개운 행동 3가지",
];

const contents = [
  { title: "총운", body: "올해 사업 전반의 기세와 방향을 한 단락으로 짚습니다." },
  { title: "12개월 흐름", body: "절기 기준 달마다 매출·계약·관계 흐름을 보여 드립니다." },
  { title: "조심할 달 2개", body: "큰 결정과 지출을 미루는 편이 좋은 시기입니다." },
  { title: "확장하기 좋은 달 2개", body: "개업·확장·계약에 힘이 실리는 시기입니다." },
  { title: "개운 행동 3가지", body: "가게에서 바로 해볼 수 있는 구체적인 행동을 제안합니다." },
];

const decisions = [
  { title: "개업을 준비한다면", body: "움직일 달과 기다릴 달을 먼저 확인하세요." },
  { title: "가게를 넓히거나 옮긴다면", body: "확장하기 좋은 달에 맞춰 일정을 잡아보세요." },
  { title: "사람을 들인다면", body: "직원·동업 결정은 관계 흐름과 함께 보세요." },
  { title: "큰 계약을 앞둔다면", body: "조심할 달에는 서명과 지출을 미뤄보세요." },
];

const howItWorks = [
  "생년월일시를 절기 기준 만세력으로 계산합니다.",
  "일간과 오행에 맞춰 준비된 문구를 조합합니다.",
  "달마다 매출·계약·관계 항목으로 나누어 보여 드립니다.",
];

const cautions = [
  "참고용 자료이며 투자·법률·의료 판단을 대신하지 않습니다.",
  "태어난 시각에 따라 풀이가 달라질 수 있습니다.",
  "중요한 결정 전에는 실제 상황을 함께 따져보세요.",
];

const purchaseInfo = [
  { title: "결제", body: "1회 결제입니다. 결제수단 [확정 후 기재]" },
  { title: "보관", body: "결제한 리포트는 마이페이지에서 언제든 다시 볼 수 있습니다." },
  { title: "환불·개인정보", body: "[환불 규정·처리방침 확정 후 기재]" },
];

const crossSell = [
  {
    title: "개업택일",
    body: "내 사주와 부딪히지 않는 후보 날짜 3개를 받아봅니다.",
    price: formatKrwFrom(pricing.date.base),
    href: "/apply/date",
  },
  {
    title: "상호·브랜드 작명",
    body: "가게 이름 후보를 평가하고 추천 이름을 골라 드립니다.",
    price: formatKrwFrom(pricing.nameBiz.basic),
    href: "/apply/name",
  },
];

const price = formatKrw(pricing.report2027);

export default function Report2027Page() {
  return (
    <>
      <nav className="wrap crumb" aria-label="현재 위치">
        <Link href="/">홈</Link> › <span>신년 사업운 월별 리포트</span>
      </nav>

      <section className="wrap report-top">
        <div className="report-col">
          <div className="cover">
            <div className="cover-head">
              <div>
                <div className="cover-year">2027 정미년</div>
                <div className="cover-title">
                  신년 사업운
                  <br />
                  월별 리포트
                </div>
              </div>
              <Badge tone="dark" className="cover-badge">
                샘플 화면
              </Badge>
            </div>
            <div className="cover-bars" aria-hidden="true">
              {sampleMonths.map((month) => (
                <div key={month.name} className={`is-${month.kind}`} style={{ height: barHeight(month.level) }} />
              ))}
            </div>
            <div className="cover-caption">
              노랑: 확장하기 좋은 달 · 흰색: 조심할 달 · 입춘부터 시작하는 절기 달 기준
            </div>
          </div>
        </div>

        <div className="report-col report-summary">
          <Badge className="report-status">12월 1일 오픈 · 지금은 사전신청 중</Badge>
          <h1 className="t1 report-title">2027 정미년 신년 사업운 월별 리포트</h1>
          <p className="lead">
            올해 우리 가게가 언제 움직이고 언제 쉬어야 하는지, 열두 달 흐름으로 정리해 드립니다.
          </p>
          <div className="report-price">
            <strong>{price}</strong>
            <span className="muted small">1회 결제 · 결제 후 바로 확인 · 마이페이지에 보관</span>
          </div>
          <ul className="check-list">
            {highlights.map((text) => (
              <li key={text}>
                <CheckIcon />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <PreorderForm />
        </div>
      </section>

      <section className="sec-white">
        <div className="wrap sec">
          <div className="sec-head">
            <h2 className="t2">리포트에 담기는 것</h2>
            <p>다섯 가지 항목으로 구성됩니다.</p>
          </div>
          <div className="grid">
            {contents.map((item, index) => (
              <Card key={item.title} tint className="content-item">
                <div className="content-no">{String(index + 1).padStart(2, "0")}</div>
                <h3 className="t3">{item.title}</h3>
                <p className="muted">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="preview" className="wrap sec">
        <div className="sec-head">
          <h2 className="t2">이렇게 보여 드려요</h2>
          <p>샘플 화면입니다. 실제 문구와 흐름은 내 사주로 계산됩니다.</p>
        </div>
        <div className="preview">
          <Card className="preview-chart">
            <div className="chart-head">
              <strong>
                12개월 흐름 <Badge className="chart-badge">예시</Badge>
              </strong>
              <span className="muted small">입춘부터 시작하는 절기 달 기준</span>
            </div>
            <div className="chart-bars" role="img" aria-label={chartLabel}>
              {sampleMonths.map((month) => (
                <div key={month.name} className={`is-${month.kind}`} style={{ height: barHeight(month.level) }} />
              ))}
            </div>
            <div className="chart-labels" aria-hidden="true">
              {sampleMonths.map((month) => (
                <span key={month.name}>{month.name}</span>
              ))}
            </div>
            <div className="chart-legend">
              <span>
                <i className="is-good" />
                확장하기 좋은 달
              </span>
              <span>
                <i className="is-careful" />
                조심할 달
              </span>
              <span>
                <i className="is-normal" />그 외
              </span>
            </div>
          </Card>

          <div className="preview-cards">
            <Card className="month-card">
              <div className="month-label">첫 달 · 인월 (입춘~경칩)</div>
              <p>
                [예시 문구] 새 거래처와 조건을 맞추기 좋은 달입니다. 큰 설비 투자는 다음 달로
                미루세요.
              </p>
              <div className="month-rows">
                <div>
                  <strong>매출</strong> · 완만한 상승
                </div>
                <div>
                  <strong>계약</strong> · 조건 협의에 유리
                </div>
                <div>
                  <strong>관계</strong> · 새 인연은 천천히
                </div>
              </div>
            </Card>
            <Card className="locked-card">
              <div className="locked-head">
                <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                전체 리포트에서 열립니다
              </div>
              <div className="locked-line" style={{ width: "90%" }} />
              <div className="locked-line" style={{ width: "70%" }} />
              <div className="locked-line" style={{ width: "80%" }} />
              <div>나머지 11개월, 조심할 달, 개운 행동 3가지</div>
            </Card>
          </div>
        </div>
      </section>

      <section className="sec-white">
        <div className="wrap sec">
          <h2 className="t2 t2-gap">이런 결정 앞에서 열어보세요</h2>
          <div className="grid">
            {decisions.map((item) => (
              <Card key={item.title} tint className="decision">
                <strong>{item.title}</strong>
                <p className="muted">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap sec">
        <h2 className="t2 t2-gap">풀이 방식과 알아두실 점</h2>
        <div className="grid-wide">
          <Card className="info-card">
            <h3 className="t3">어떻게 만들어지나요</h3>
            <ul>
              {howItWorks.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </Card>
          <Card className="info-card">
            <h3 className="t3">알아두실 점</h3>
            <ul>
              {cautions.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="grid purchase">
          {purchaseInfo.map((item) => (
            <Card key={item.title} tint className="purchase-item">
              <h3 className="t3">{item.title}</h3>
              <p className="muted">{item.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="wrap cross-wrap">
        <h2 className="t2 cross-title">함께 보면 좋은 풀이</h2>
        <div className="grid-wide">
          {crossSell.map((item) => (
            <Link key={item.title} href={item.href} className="card cross">
              <Badge>사전접수 중</Badge>
              <strong className="cross-name">{item.title}</strong>
              <span className="muted">{item.body}</span>
              <strong className="cross-price">{item.price}</strong>
            </Link>
          ))}
        </div>
      </section>

      {/* 모바일에서는 아래 하단 고정 바가 같은 역할을 하므로 이 띠는 PC에서만 보입니다. */}
      <section className="wrap hide-m band-wrap">
        <div className="band band-deep">
          <div className="band-copy">
            <h2>12월 1일, 가장 먼저 열어 드립니다</h2>
            <p>사전신청하시면 오픈 알림을 보내 드립니다.</p>
          </div>
          <a href={`#${PREORDER_FORM_ID}`} className={buttonClass({ variant: "y", size: "lg" })}>
            사전신청하기
          </a>
        </div>
      </section>

      <MobileBar label="신년 사업운 리포트" amount={price}>
        <a href={`#${PREORDER_FORM_ID}`} className={buttonClass({ variant: "p" })}>
          사전신청하기
        </a>
      </MobileBar>
    </>
  );
}
