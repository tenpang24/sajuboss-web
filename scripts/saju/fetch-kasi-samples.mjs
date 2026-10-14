// 한국천문연구원 음양력 변환에서 해마다 음력 1월 1일(1900~2050)과 몇몇 기준일의
// 세차(년 간지)·월건·일진을 받아 테스트 정답 파일로 저장합니다.
//   node scripts/saju/fetch-kasi-samples.mjs  (먼저 fetch-kasi-lunar.mjs로 kasi-lunar-months.json 필요)
//   → tests/saju-engine/fixtures/kasi-day-samples.json
// 세차는 음력 해 기준, 월건은 음력 달 기준이라 사주 년주·월주와 같아지는 날에서만 비교한다(테스트에서 판단).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MONTHS = path.join(ROOT, "tests/saju-engine/fixtures/kasi-lunar-months.json");
const OUT = path.join(ROOT, "tests/saju-engine/fixtures/kasi-day-samples.json");
const ENDPOINT = "https://astro.kasi.re.kr/life/solc";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hanja = (s) => /\((..)\)/.exec(s)?.[1] ?? null; // "갑진(甲辰)" → "甲辰"

async function kasi(date) {
  const [y, m, d] = date.split("-");
  for (let attempt = 1; ; attempt++) {
    try {
      await sleep(300);
      const res = await fetch(`${ENDPOINT}?yyyy=${y}&mm=${m}&dd=${d}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      return {
        date,
        lunar: { year: Number(j.LUNC_YYYY), month: Number(j.LUNC_MM), day: Number(j.LUNC_DD), leap: j.LUNC_LEAP_MM === "윤" },
        yearGanzhi: hanja(j.LUNC_PRCN),
        monthGanzhi: hanja(j.LUNC_WLGN),
        iljin: hanja(j.LUNC_ILJIN),
      };
    } catch (e) {
      if (attempt >= 4) throw new Error(`${date}: ${e.message}`);
      await sleep(2000 * attempt);
    }
  }
}

const { months } = JSON.parse(readFileSync(MONTHS, "utf8"));
const dates = new Set(["1900-01-01", "2000-01-01", "2050-12-31"]);
for (const m of months) if (m.month === 1 && !m.leap) dates.add(m.start);
// 음력 1월 1일 다음 달(2월 1일)도: 경칩 뒤라 월건과 사주 월주가 같아지는 경우를 더 얻기 위해
for (const m of months) if (m.month === 2 && !m.leap) dates.add(m.start);

const samples = [];
for (const date of [...dates].sort()) samples.push(await kasi(date));

writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: "한국천문연구원 천문우주정보 음양력변환계산 (https://astro.kasi.re.kr/life/solc)",
      fetchedAt: new Date().toISOString().slice(0, 10),
      note: "yearGanzhi=세차(음력 해), monthGanzhi=월건(음력 달), iljin=일진. scripts/saju/fetch-kasi-samples.mjs가 만든다.",
      samples,
    },
    null,
    0,
  ).replace(/\},\{"date"/g, '},\n{"date"'),
);
console.log(`완료: ${samples.length}건`);
