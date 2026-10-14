import "server-only";

// 오행 표와 일주·일진 관계. 원본은 _import/sosangkong/lib/saju/relationType.ts(소상공닷컴 3c08968).
// 원본과 같은 동작. 지지 오행(ZHI_OHAENG)은 원본 buildBazi.ts에서 옮겨 왔다.

export type Ohaeng = "목" | "화" | "토" | "금" | "수";
export type RelationType = "생" | "극" | "합" | "충" | "비화";

export const GAN_OHAENG: Record<string, Ohaeng> = {
  甲: "목", 乙: "목",
  丙: "화", 丁: "화",
  戊: "토", 己: "토",
  庚: "금", 辛: "금",
  壬: "수", 癸: "수",
};

export const ZHI_OHAENG: Record<string, Ohaeng> = {
  子: "수", 丑: "토", 寅: "목", 卯: "목", 辰: "토", 巳: "화",
  午: "화", 未: "토", 申: "금", 酉: "금", 戌: "토", 亥: "수",
};

// 천간합 (갑기합토, 을경합금, 병신합수, 정임합목, 무계합화)
const CHEONGAN_HAP: Record<string, string> = {
  甲: "己", 己: "甲",
  乙: "庚", 庚: "乙",
  丙: "辛", 辛: "丙",
  丁: "壬", 壬: "丁",
  戊: "癸", 癸: "戊",
};

// 상생: 목생화, 화생토, 토생금, 금생수, 수생목
const SANGSAENG: Record<Ohaeng, Ohaeng> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };

// 상극: 목극토, 토극수, 수극화, 화극금, 금극목
const SANGGEUK: Record<Ohaeng, Ohaeng> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

// 지지충 (자오충, 축미충, 인신충, 묘유충, 진술충, 사해충)
const JIJI_CHUNG: Record<string, string> = {
  子: "午", 午: "子",
  丑: "未", 未: "丑",
  寅: "申", 申: "寅",
  卯: "酉", 酉: "卯",
  辰: "戌", 戌: "辰",
  巳: "亥", 亥: "巳",
};

/** 일간(dayGan)과 일진(todayPillar, 예: '甲子')의 관계. 우선순위: 합 > 비화 > 생 > 극 */
export function getRelationType(dayGan: string, todayPillar: string): RelationType {
  const todayGan = todayPillar[0];
  if (CHEONGAN_HAP[dayGan] === todayGan) return "합";

  const mine = GAN_OHAENG[dayGan];
  const today = GAN_OHAENG[todayGan];
  if (mine === today) return "비화";
  if (SANGSAENG[today] === mine) return "생"; // 오늘이 나를 생함
  if (SANGSAENG[mine] === today) return "생"; // 내가 오늘을 생함(길하게 처리)
  if (SANGGEUK[today] === mine || SANGGEUK[mine] === today) return "극";
  return "비화";
}

/** 일주 전체를 알 때: 지지충을 먼저 본다. 우선순위: 충 > 합 > 비화 > 생 > 극 */
export function getRelationTypePrecise(dayPillar: string, todayPillar: string): RelationType {
  if (JIJI_CHUNG[dayPillar[1]] === todayPillar[1]) return "충";
  return getRelationType(dayPillar[0], todayPillar);
}
