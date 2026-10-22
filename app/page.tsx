import Link from "next/link";
import { Suspense } from "react";
import { TodayForm } from "@/components/home/TodayForm";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckIcon, IconCircle } from "@/components/ui/IconCircle";
import { getUser } from "@/lib/auth";
import { formatKrw, formatKrwFrom, pricing } from "@/lib/pricing";
import { getSelfSaju } from "@/lib/saju";
import { calcToday, toTodayView } from "@/lib/today/today";

const heroPoints = ["절기 기준 만세력 계산", "결제 전 미리보기", "입력 정보는 언제든 삭제"];

// 히어로의 "오늘의 사업운" 카드는 예시입니다. 실제 풀이는 아래 "내 사주로 오늘의 사업운 보기"에서 계산합니다.
// 막대는 결과 카드와 같은 기준(좋음 80%, 보통 60%, 조심 35%)입니다.
const sampleScores = [
  { label: "사업운", percent: 80, text: "좋음" },
  { label: "매출운", percent: 60, text: "보통" },
  { label: "거래운", percent: 80, text: "좋음" },
];

// 로그인했고 저장된 내 사주가 있으면 입력 없이 오늘의 사업운을 바로 보여 줍니다(저장된 사주를 다시 저장하지 않음).
async function TodaySection() {
  const user = await getUser();
  if (!user) return <TodayForm />;
  const saju = await getSelfSaju(user.id);
  if (!saju) return <TodayForm />;
  const today = calcToday({ birth_date: saju.birth_date, calendar: saju.calendar, birth_time: saju.birth_time });
  return <TodayForm saved={today.ok ? toTodayView(today) : null} />;
}

const products = [
  {
    featured: true,
    badges: [
      { tone: "y" as const, text: "대표 상품" },
      { tone: "tint" as const, text: "12월 1일 오픈" },
    ],
    title: "신년 사업운 월별 리포트",
    body: "12개월 흐름과 조심할 달, 확장하기 좋은 달, 바로 해볼 개운 행동을 한 번에 봅니다.",
    price: formatKrw(pricing.report2027),
    note: "결제 후 바로 확인",
    href: "/report/2027",
    cta: "자세히 보기",
  },
  {
    featured: false,
    badges: [{ tone: "tint" as const, text: "사전접수 중" }],
    title: "개업택일",
    body: "내 사주와 부딪히지 않는 개업 후보 날짜 3개를 선정 이유와 함께 받아봅니다.",
    price: formatKrwFrom(pricing.date.base),
    note: `동업자 포함 +${formatKrw(pricing.date.partnerAddon)}`,
    href: "/apply/date",
    cta: "택일 신청",
  },
  {
    featured: false,
    badges: [{ tone: "tint" as const, text: "사전접수 중" }],
    title: "상호·브랜드 작명",
    body: "가게 이름 후보를 오행·소리·뜻으로 평가하고 추천 이름을 골라 드립니다.",
    price: formatKrwFrom(pricing.nameBiz.basic),
    note: `상세 ${formatKrw(pricing.nameBiz.detail)}`,
    href: "/apply/name",
    cta: "작명 신청",
  },
  {
    featured: false,
    badges: [{ tone: "tint" as const, text: "사전접수 중" }],
    title: "개인·개명 작명",
    body: "아기 이름, 성인 이름, 개명 후보를 같은 기준으로 평가해 드립니다.",
    price: formatKrwFrom(pricing.namePerson.basic),
    note: `상세 ${formatKrw(pricing.namePerson.detail)}`,
    href: "/apply/person",
    cta: "이름 신청",
  },
];

const concerns = [
  { tag: "개업택일", text: "개업 날짜를 정하고 싶어요", href: "/apply/date" },
  { tag: "신년 사업운", text: "가게를 넓히거나 옮겨도 될까요", href: "/report/2027" },
  { tag: "신년 사업운", text: "큰 계약을 앞두고 있어요", href: "/report/2027" },
  { tag: "상호 작명", text: "가게 이름을 새로 지어야 해요", href: "/apply/name" },
  { tag: "개인·개명", text: "아이 이름이나 개명을 고민해요", href: "/apply/person" },
];

const steps = [
  {
    title: "생년월일시 입력",
    body: "양력·음력과 태어난 시각을 넣습니다. 시각을 몰라도 볼 수 있습니다.",
  },
  {
    title: "절기 기준 사주 계산",
    body: "입춘 같은 절기를 기준으로 사주를 세우고 일간과 오행을 읽습니다.",
  },
  {
    title: "사업 상황에 맞춘 풀이",
    body: "매출·계약·관계 항목으로 나눠 이해하기 쉬운 말로 보여 드립니다.",
  },
];

const faqs = [
  {
    q: "풀이는 어떤 방식인가요?",
    a: "생년월일시를 절기 기준 만세력으로 계산하고, 일간·오행에 맞춰 준비된 문구를 조합합니다. 참고용 자료입니다.",
  },
  { q: "태어난 시각을 모르면 어떻게 하나요?", a: "[시각 미입력 시 제공 범위 확정 후 기재]" },
  {
    q: "입력한 정보는 어떻게 쓰이나요?",
    a: "풀이에만 사용하며 마이페이지에서 언제든 삭제할 수 있습니다. [처리방침 확정 후 기재]",
  },
  {
    q: "결제 후 환불할 수 있나요?",
    a: "결제 전에 미리보기를 확인할 수 있습니다. 환불 규정은 [확정 후 기재]",
  },
  {
    q: "휴대폰으로도 볼 수 있나요?",
    a: "네. 카카오톡이나 문자로 받은 링크를 눌러도 같은 화면으로 열립니다.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-in">
          <div className="hero-copy">
            <Badge tone="line" className="hero-season">
              2027 정미년 신년 시즌
            </Badge>
            <h1 className="t1">
              올해 우리 가게,
              <br />
              <span className="hero-accent">언제 움직이고 언제 쉴까요</span>
            </h1>
            <p className="lead hero-lead">
              생년월일시로 풀어보는 사장님 전용 사업운입니다. 오늘의 사업운은 무료로 보시고, 신년
              월별 리포트는 12월 1일에 열립니다.
            </p>
            <div className="hero-actions">
              <ButtonLink href="/#today" size="lg">
                무료로 오늘의 사업운 보기
              </ButtonLink>
              <ButtonLink href="/report/2027" variant="o" size="lg">
                신년 사업운 사전신청
              </ButtonLink>
            </div>
            <ul className="hero-points">
              {heroPoints.map((point) => (
                <li key={point}>
                  <CheckIcon />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-sample">
            <Card className="sample">
              <div className="sample-head">
                <strong>오늘의 사업운</strong>
                <Badge>예시 화면</Badge>
              </div>
              <div className="sample-today">
                <div className="sample-tarot">
                  <svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      d="M24 5 L28.4 18.6 L43 19 L31.3 27.6 L35.6 41.5 L24 33.3 L12.4 41.5 L16.7 27.6 L5 19 L19.6 18.6 Z"
                      fill="none"
                      stroke="#FFD84D"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="sample-text">
                  <div className="muted small">예시 · 오늘의 한마디</div>
                  <p>새 계획을 꺼내 보기 좋은 날입니다. 큰 지출은 하루 미루세요.</p>
                </div>
              </div>
              <div className="sample-scores">
                {sampleScores.map((score) => (
                  <div key={score.label} className="score">
                    <span className="score-label">{score.label}</span>
                    <div className="score-bar" aria-hidden="true">
                      <div style={{ width: `${score.percent}%` }} />
                    </div>
                    <span className="score-text muted">{score.text}</span>
                  </div>
                ))}
              </div>
              <Link href="/#today" className="sample-link">
                내 사주로 보기 →
              </Link>
            </Card>
          </div>
        </div>
      </section>

      <section id="today" className="wrap today">
        <Card className="today-card">
          <div>
            <h2 className="t2">내 사주로 오늘의 사업운 보기</h2>
            <p className="muted today-lead">
              가입하지 않아도 볼 수 있습니다. 생년월일과 태어난 시각을 넣어 주세요.
            </p>
          </div>
          <Suspense fallback={<TodayForm />}>
            <TodaySection />
          </Suspense>
        </Card>
      </section>

      <section id="products" className="wrap sec">
        <div className="sec-head">
          <h2 className="t2">사장님을 위한 풀이</h2>
          <p>신년 시즌에 맞춰 순서대로 엽니다. 가격은 모두 1회 결제입니다.</p>
        </div>
        <div className="grid">
          {products.map((product) => (
            <Card key={product.title} className={product.featured ? "product product-featured" : "product"}>
              <div className="product-badges">
                {product.badges.map((badge) => (
                  <Badge key={badge.text} tone={badge.tone}>
                    {badge.text}
                  </Badge>
                ))}
              </div>
              <h3 className="t3">{product.title}</h3>
              <p className="muted product-body">{product.body}</p>
              <div className="product-price-row">
                <strong className="product-price">{product.price}</strong>
                <span className="muted small">{product.note}</span>
              </div>
              <ButtonLink href={product.href} variant={product.featured ? "p" : "o"} block>
                {product.cta}
              </ButtonLink>
            </Card>
          ))}
        </div>
      </section>

      <section className="sec-white">
        <div className="wrap sec">
          <div className="sec-head">
            <h2 className="t2">이런 고민이 있으신가요</h2>
            <p>상황을 고르면 맞는 풀이로 안내합니다.</p>
          </div>
          <div className="grid">
            {concerns.map((concern) => (
              <Link key={concern.text} href={concern.href} className="card-tint concern">
                <span>{concern.tag}</span>
                <strong>{concern.text}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap sec">
        <div className="sec-head">
          <h2 className="t2">풀이는 이렇게 만들어집니다</h2>
          <p>입력부터 결과까지 세 단계입니다.</p>
        </div>
        <div className="grid-wide">
          {steps.map((step, index) => (
            <div key={step.title} className="how-step">
              <IconCircle tone="y" size="lg">
                {index + 1}
              </IconCircle>
              <div>
                <h3 className="t3">{step.title}</h3>
                <p className="muted">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="card-tint how-note">
          풀이는 전통 명리 원리에 따른 참고용 자료입니다. 투자·법률·의료 판단을 대신하지 않습니다.
        </p>
      </section>

      <section className="wrap band-wrap">
        <div className="band">
          <div className="band-copy">
            <h2>무료로 가입하고 내 사주를 저장하세요</h2>
            <p>
              한 번 저장하면 매일 생년월일을 다시 넣지 않아도 오늘의 사업운을 바로 볼 수 있습니다.
              신청 내역도 한곳에서 확인합니다.
            </p>
          </div>
          <ButtonLink href="/login?mode=signup" variant="y" size="lg">
            무료 회원가입
          </ButtonLink>
        </div>
      </section>

      <section className="wrap faq-wrap">
        <h2 className="t2 faq-title">자주 묻는 질문</h2>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <details key={faq.q} className="faq" open={index === 0}>
              <summary>
                {faq.q}
                <span className="faq-mark" aria-hidden="true">
                  ＋
                </span>
              </summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
