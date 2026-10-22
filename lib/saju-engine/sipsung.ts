import "server-only";
import { GAN_OHAENG, type Ohaeng } from "./relation.ts";

// 십성. 일간과 대상 천간의 오행 생극과 음양으로 계산한다(표를 손으로 적지 않음).
// 지지는 지장간 본기 천간으로 바꿔 같은 방법으로 구한다.

export type Sipsung = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";

const GAN = "甲乙丙丁戊己庚辛壬癸";

// 상생 순서. 한 칸 뒤는 내가 생하는 오행, 두 칸 뒤는 내가 극하는 오행.
const OHAENG_CYCLE: Ohaeng[] = ["목", "화", "토", "금", "수"];

// 일간에서 대상 오행까지의 거리(0~4)마다 [음양 같음, 음양 다름]
const BY_DISTANCE: ReadonlyArray<readonly [Sipsung, Sipsung]> = [
  ["비견", "겁재"], // 같은 오행
  ["식신", "상관"], // 내가 생함
  ["편재", "정재"], // 내가 극함
  ["편관", "정관"], // 나를 극함
  ["편인", "정인"], // 나를 생함
];

/** 양간(甲丙戊庚壬)이면 true */
function isYang(gan: string): boolean {
  const i = GAN.indexOf(gan);
  if (i < 0) throw new Error(`천간이 아님: ${gan}`);
  return i % 2 === 0;
}

export function ganSipsung(dayGan: string, targetGan: string): Sipsung {
  const distance = (OHAENG_CYCLE.indexOf(GAN_OHAENG[targetGan]) - OHAENG_CYCLE.indexOf(GAN_OHAENG[dayGan]) + 5) % 5;
  return BY_DISTANCE[distance][isYang(dayGan) === isYang(targetGan) ? 0 : 1];
}

// 지장간 본기. 사장님 확정(2026-10-22, 설계서 7장).
export const JIJANGGAN_BONGI: Readonly<Record<string, string>> = {
  子: "癸", 丑: "己", 寅: "甲", 卯: "乙", 辰: "戊", 巳: "丙",
  午: "丁", 未: "己", 申: "庚", 酉: "辛", 戌: "戊", 亥: "壬",
};

export function zhiSipsung(dayGan: string, zhi: string): Sipsung {
  const gan = JIJANGGAN_BONGI[zhi];
  if (!gan) throw new Error(`지지가 아님: ${zhi}`);
  return ganSipsung(dayGan, gan);
}
