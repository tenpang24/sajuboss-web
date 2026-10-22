import "server-only";

// 오늘의 사업운 호출 제한: 한 IP에서 1분에 30번까지. 서버 인스턴스 메모리 기준이라 인스턴스마다 따로 센다(대략적인 제한).
// IP는 세지 위한 키로만 쓰고 저장·로그하지 않는다.

export const TODAY_LIMIT = 30;
const WINDOW_MS = 60 * 1000;
const hits = new Map<string, number[]>();

/** 이번 호출을 세고, 1분 안 호출이 한도를 넘으면 false */
export function allowTodayCall(ip: string, now: number = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= TODAY_LIMIT) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  // 오래된 키 정리(메모리가 계속 늘지 않게)
  if (hits.size > 5000) {
    for (const [key, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
  }
  return true;
}
