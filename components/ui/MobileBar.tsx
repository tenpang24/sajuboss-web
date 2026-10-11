import type { ReactNode } from "react";

// 모바일 하단 고정 바(금액 + 버튼). 폼·상세·결제 화면 공통.
// 720px 이하에서만 보이고, 화면 아래에 붙어 있으며 safe-area 여백을 포함합니다(app/site.css의 .mbar).
// 페이지 내용의 맨 끝(푸터 바로 앞)에 두어야 내용 위에 겹치지 않고 스크롤 끝에서 제자리에 놓입니다.
export function MobileBar({
  label,
  amount,
  children,
}: {
  label: string;
  amount: string;
  children: ReactNode;
}) {
  return (
    <div className="mbar" role="region" aria-label={`${label} 신청`}>
      <div className="mbar-info">
        <div className="mbar-label">{label}</div>
        <strong className="mbar-amount">{amount}</strong>
      </div>
      {children}
    </div>
  );
}
