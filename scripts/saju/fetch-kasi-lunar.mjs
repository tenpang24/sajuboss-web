// 한국천문연구원 음양력 변환(https://astro.kasi.re.kr/kor/life/pageView/8)에서
// 1900~2050년 음력 달마다 시작일(양력)·크기·윤달 여부를 받아 테스트 정답 파일로 저장합니다.
//   node scripts/saju/fetch-kasi-lunar.mjs
//   → tests/saju-engine/fixtures/kasi-lunar-months.json
//
// 방법: lunar-javascript(중국 기준)가 계산한 달의 첫날을 한국천문연구원에 물어 보고,
// 한국 음력의 몇째 날인지로 한국 쪽 시작일을 구합니다. 한국천문연구원 답만 저장하고
// lunar-javascript 값은 어디에도 정답으로 쓰지 않습니다. 끝에 달이 빈틈없이 이어지는지 확인합니다.
// 요청은 하나씩 0.3초 간격으로 보냅니다(약 1,900건, 10분 안팎).
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lunarJs from "lunar-javascript";

const { LunarYear, Solar } = lunarJs;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "tests/saju-engine/fixtures/kasi-lunar-months.json");
const ENDPOINT = "https://astro.kasi.re.kr/life/solc";
const FIRST = "1900-01-31"; // 한국천문연구원 기준 1900년 음력 1월 1일
const LAST = "2050-12-31"; // 한국천문연구원 변환 상한

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (s) => `${s.getYear()}-${String(s.getMonth()).padStart(2, "0")}-${String(s.getDay()).padStart(2, "0")}`;
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

let requests = 0;
async function kasi(date) {
  const [y, m, d] = date.split("-");
  for (let attempt = 1; ; attempt++) {
    try {
      await sleep(300);
      requests++;
      const res = await fetch(`${ENDPOINT}?yyyy=${y}&mm=${m}&dd=${d}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      return {
        year: Number(j.LUNC_YYYY),
        month: Number(j.LUNC_MM),
        day: Number(j.LUNC_DD),
        leap: j.LUNC_LEAP_MM === "윤",
        length: Number(j.LUNC_EN_DD),
        iljin: j.LUNC_ILJIN,
      };
    } catch (e) {
      if (attempt >= 4) throw new Error(`${date}: ${e.message}`);
      await sleep(2000 * attempt);
    }
  }
}

// lunar-javascript 기준 달의 첫날 목록(질문할 날짜를 고르는 데만 씀)
const probes = [];
for (let y = 1899; y <= 2051; y++) {
  for (const m of LunarYear.fromYear(y).getMonths()) {
    const date = ymd(Solar.fromJulianDay(m.getFirstJulianDay()));
    if (date >= FIRST && date <= LAST) probes.push(date);
  }
}
const uniqueProbes = [...new Set(probes)].sort();

const months = new Map(); // key: 시작일 → 한국천문연구원 달 정보
let differs = 0;
for (const probe of uniqueProbes) {
  let k = await kasi(probe);
  let start = addDays(probe, -(k.day - 1));
  if (k.day > 15) {
    // 한국 쪽은 아직 이전 달 → 다음 날이 한국 달의 첫날
    start = addDays(probe, k.length - k.day + 1);
    k = await kasi(start);
    if (k.day !== 1) throw new Error(`${probe}: 시작일을 찾지 못함`);
  } else if (k.day !== 1) {
    const check = await kasi(start);
    if (check.day !== 1) throw new Error(`${probe}: 시작일을 찾지 못함`);
  }
  if (start !== probe) differs++;
  months.set(start, { year: k.year, month: k.month, leap: k.leap, start, length: k.length });
  if (requests % 100 === 0) console.log(`요청 ${requests}건, ${probe}`);
}

const list = [...months.values()].sort((a, b) => a.start.localeCompare(b.start));
// 빈틈 없이 이어지는지 확인(앞 달 시작 + 크기 = 다음 달 시작)
for (let i = 1; i < list.length; i++) {
  if (addDays(list[i - 1].start, list[i - 1].length) !== list[i].start) {
    // 한국 쪽에만 있는 달(윤달 위치가 다른 경우)은 빈틈으로 나타남 → 채워 넣음
    const gap = addDays(list[i - 1].start, list[i - 1].length);
    const k = await kasi(gap);
    if (k.day !== 1) throw new Error(`${gap}: 빈틈 확인 실패`);
    list.splice(i, 0, { year: k.year, month: k.month, leap: k.leap, start: gap, length: k.length });
    differs++;
  }
}

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: "한국천문연구원 천문우주정보 음양력변환계산 (https://astro.kasi.re.kr/life/solc)",
      fetchedAt: new Date().toISOString().slice(0, 10),
      range: [FIRST, LAST],
      note: "start는 한국 음력 달의 첫날(양력), length는 그 달의 날수. 이 파일은 scripts/saju/fetch-kasi-lunar.mjs가 만든다.",
      months: list,
    },
    null,
    0,
  ).replace(/\},\{/g, "},\n{"),
);
console.log(`완료: 달 ${list.length}개, 중국 기준과 시작일이 다른 달 ${differs}개, 요청 ${requests}건`);
