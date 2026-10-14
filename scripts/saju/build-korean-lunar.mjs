// 한국천문연구원 음력 달 정보(tests/saju-engine/fixtures/kasi-lunar-months.json)를
// 엔진이 쓰는 작은 표(lib/saju-engine/korean-lunar-data.ts)로 바꿉니다.
//   node scripts/saju/fetch-kasi-lunar.mjs   # 정답 파일 받기(인터넷 필요)
//   node scripts/saju/build-korean-lunar.mjs # 표 만들기
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(ROOT, "tests/saju-engine/fixtures/kasi-lunar-months.json");
const OUT = path.join(ROOT, "lib/saju-engine/korean-lunar-data.ts");

const { months, source, fetchedAt } = JSON.parse(readFileSync(SRC, "utf8"));
if (months[0].year !== 1900 || months[0].month !== 1 || months[0].leap) throw new Error("첫 달이 1900년 1월이 아님");

const years = new Map();
for (const m of months) {
  if (!years.has(m.year)) years.set(m.year, { leap: 0, lengths: "" });
  const y = years.get(m.year);
  if (m.leap) y.leap = m.month;
  if (m.length !== 29 && m.length !== 30) throw new Error(`${m.year}-${m.month}: 날수 ${m.length}`);
  y.lengths += m.length === 30 ? "1" : "0";
}

const rows = [...years].map(([year, y]) => `  "${year}:${y.leap}:${y.lengths}",`);
writeFileSync(
  OUT,
  `// 자동 생성 파일(scripts/saju/build-korean-lunar.mjs). 손으로 고치지 않는다.
// 출처: ${source}, ${fetchedAt} 받음.
// 한 줄 = "음력 연도:윤달(없으면 0):달마다 크기(1=30일, 0=29일, 윤달은 같은 달 바로 뒤)".
// 첫 줄 음력 1900년 1월 1일 = 양력 ${months[0].start}. 마지막 해는 받은 범위까지만 있다.

export const KOREAN_LUNAR_FIRST_DAY = "${months[0].start}";

export const KOREAN_LUNAR_YEARS: readonly string[] = [
${rows.join("\n")}
];
`,
);
console.log(`음력 ${years.size}년, 달 ${months.length}개 → ${path.relative(ROOT, OUT)}`);
