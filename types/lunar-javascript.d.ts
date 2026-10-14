// lunar-javascript 1.7.7(MIT, 6tail) 중 lib/saju-engine이 쓰는 부분만 적은 타입.
// 라이브러리의 시각은 모두 중국 기준시(UTC+8) 벽시계 값이다.
declare module "lunar-javascript" {
  interface SolarInstance {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    getJulianDay(): number;
    toYmd(): string;
    toYmdHms(): string;
    getLunar(): LunarInstance;
  }

  interface LunarInstance {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getSolar(): SolarInstance;
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getDayInGanZhi(): string;
    getDayInGanZhiExact(): string;
    getTimeInGanZhi(): string;
    getJieQiTable(): Record<string, SolarInstance>;
  }

  interface LunarMonthInstance {
    getYear(): number;
    getMonth(): number;
    getDayCount(): number;
    getFirstJulianDay(): number;
  }

  interface LunarYearInstance {
    getMonths(): LunarMonthInstance[];
  }

  const lunarJavascript: {
    Solar: {
      fromYmd(year: number, month: number, day: number): SolarInstance;
      fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): SolarInstance;
      fromJulianDay(julianDay: number): SolarInstance;
    };
    Lunar: {
      fromYmd(year: number, month: number, day: number): LunarInstance;
    };
    LunarYear: {
      fromYear(year: number): LunarYearInstance;
    };
  };
  export default lunarJavascript;
}
