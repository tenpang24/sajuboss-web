import "server-only";

// 두 지지의 관계(육충, 육합, 형). 여러 관계가 겹치면 모두 돌려준다(예: 寅申 충+형(부분), 巳申 합+형(부분)).

export type BranchRelation = "충" | "합" | "형" | "형(부분)" | "자형";

/** 관계를 돌려주는 순서 */
export const BRANCH_RELATION_ORDER: readonly BranchRelation[] = ["충", "합", "형", "형(부분)", "자형"];

// 육충: 자오, 축미, 인신, 묘유, 진술, 사해
const YUKCHUNG = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"];

// 육합: 자축, 인해, 묘술, 진유, 사신, 오미
const YUKHAP = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];

// 형: 자묘(무례지형)
const HYEONG = ["子卯"];

// 삼형: 두 글자가 같은 묶음에 있으면 형(부분)
const SAMHYEONG = ["寅巳申", "丑戌未"];

// 자형: 같은 글자 두 개일 때만
const JAHYEONG = "辰午酉亥";

const isPair = (pairs: string[], a: string, b: string) => pairs.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));

export function branchRelations(a: string, b: string): BranchRelation[] {
  const found = new Set<BranchRelation>();
  if (isPair(YUKCHUNG, a, b)) found.add("충");
  if (isPair(YUKHAP, a, b)) found.add("합");
  if (isPair(HYEONG, a, b)) found.add("형");
  if (a !== b && SAMHYEONG.some((g) => g.includes(a) && g.includes(b))) found.add("형(부분)");
  if (a === b && JAHYEONG.includes(a)) found.add("자형");
  return BRANCH_RELATION_ORDER.filter((r) => found.has(r));
}
