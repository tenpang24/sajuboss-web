import "server-only";
import { PENDING } from "./types.ts";

// 월별 문구 밖의 묶음(자리만). 문장이 확정되면 채운다. ID는 바꾸지 않는다.
// 지금 리포트 생성에 쓰는 것은 세운 총평뿐이다(미리보기의 총평 1문장도 이 묶음).

// 세운 총평: 2027 세운(丁未) 천간의 십성마다 1개. ID "세운-식신-1"
export const SEUN_PHRASES: Record<string, string> = {
  "세운-비견-1": PENDING,
  "세운-겁재-1": PENDING,
  "세운-식신-1": PENDING,
  "세운-상관-1": PENDING,
  "세운-편재-1": PENDING,
  "세운-정재-1": PENDING,
  "세운-편관-1": PENDING,
  "세운-정관-1": PENDING,
  "세운-편인-1": PENDING,
  "세운-정인-1": PENDING,
};

// 일간 기질: 일간 천간 10개마다 1개. ID "일간-甲-1"
export const ILGAN_PHRASES: Record<string, string> = {
  "일간-甲-1": PENDING,
  "일간-乙-1": PENDING,
  "일간-丙-1": PENDING,
  "일간-丁-1": PENDING,
  "일간-戊-1": PENDING,
  "일간-己-1": PENDING,
  "일간-庚-1": PENDING,
  "일간-辛-1": PENDING,
  "일간-壬-1": PENDING,
  "일간-癸-1": PENDING,
};

// 오행 과부족: 오행 5개 × 많음·없음. ID "오행-목-많음"
export const OHAENG_PHRASES: Record<string, string> = {
  "오행-목-많음": PENDING,
  "오행-목-없음": PENDING,
  "오행-화-많음": PENDING,
  "오행-화-없음": PENDING,
  "오행-토-많음": PENDING,
  "오행-토-없음": PENDING,
  "오행-금-많음": PENDING,
  "오행-금-없음": PENDING,
  "오행-수-많음": PENDING,
  "오행-수-없음": PENDING,
};

// 충·합 보조: 그 달 월지와 일지의 관계 중 점수에 들어가는 것(합, 충, 형). ID "관계-충-1"
export const RELATION_PHRASES: Record<string, string> = {
  "관계-합-1": PENDING,
  "관계-충-1": PENDING,
  "관계-형-1": PENDING,
};

// 반기 제안: 상반기(1~6번째 달)·하반기(7~12번째 달) × 그 반기에 많은 등급. ID "반기-상-길"
export const HALF_PHRASES: Record<string, string> = {
  "반기-상-길": PENDING,
  "반기-상-중": PENDING,
  "반기-상-흉": PENDING,
  "반기-하-길": PENDING,
  "반기-하-중": PENDING,
  "반기-하-흉": PENDING,
};
