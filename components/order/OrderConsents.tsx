// 신청 동의 2개. 신년 리포트 사전신청 카드와 신청 폼 3종이 모두 이 컴포넌트를 씁니다.
// - "개인정보 수집·이용" 문구는 여기 한 곳에만 있습니다(모든 신청에서 같음).
// - "참고용 자료 확인" 문구는 상품마다 달라 disclaimer로 받습니다.
// 둘 다 필수입니다. 체크하지 않으면 브라우저가 제출을 막고, 서버(lib/orders.ts의 createOrder)도
// 다시 확인한 뒤 consent_privacy_at, consent_disclaimer_at을 서버 시각으로 기록합니다.
export function OrderConsents({
  disclaimer,
  className,
}: {
  disclaimer: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="check">
        <input type="checkbox" name="consentPrivacy" required />
        <span>
          [필수] 개인정보 수집·이용에 동의합니다. <a href="#">내용 보기</a>{" "}
          <span className="muted small">(항목·보관기간 [확정 후 기재])</span>
        </span>
      </label>
      <label className="check">
        <input type="checkbox" name="consentDisclaimer" required />
        <span>[필수] {disclaimer}</span>
      </label>
    </div>
  );
}
