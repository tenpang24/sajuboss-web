import "server-only";
import type { Sipsung } from "../../saju-engine/sipsung.ts";
import { PENDING, type PhraseField } from "./types.ts";

// 월별 문구 묶음: 그 달 천간 십성 10종 × 사업운(B)·매출운(S)·거래운(D) × 3개 = 90개.
// ID는 "십성-분야번호"(예: "정재-S2"). 문장이 확정되기 전에는 모두 자리표시(PENDING)다.
// 문장을 바꾸면 PHRASE_VERSION(index.ts)을 올린다. ID는 저장된 리포트가 참조하므로 바꾸지 않는다.

export const MONTHLY_PHRASES: Record<Sipsung, Record<PhraseField, Record<string, string>>> = {
  비견: {
    // 사업운
    B: {
      "비견-B1": PENDING,
      "비견-B2": PENDING,
      "비견-B3": PENDING,
    },
    // 매출운
    S: {
      "비견-S1": PENDING,
      "비견-S2": PENDING,
      "비견-S3": PENDING,
    },
    // 거래운
    D: {
      "비견-D1": PENDING,
      "비견-D2": PENDING,
      "비견-D3": PENDING,
    },
  },
  겁재: {
    // 사업운
    B: {
      "겁재-B1": PENDING,
      "겁재-B2": PENDING,
      "겁재-B3": PENDING,
    },
    // 매출운
    S: {
      "겁재-S1": PENDING,
      "겁재-S2": PENDING,
      "겁재-S3": PENDING,
    },
    // 거래운
    D: {
      "겁재-D1": PENDING,
      "겁재-D2": PENDING,
      "겁재-D3": PENDING,
    },
  },
  식신: {
    // 사업운
    B: {
      "식신-B1": PENDING,
      "식신-B2": PENDING,
      "식신-B3": PENDING,
    },
    // 매출운
    S: {
      "식신-S1": PENDING,
      "식신-S2": PENDING,
      "식신-S3": PENDING,
    },
    // 거래운
    D: {
      "식신-D1": PENDING,
      "식신-D2": PENDING,
      "식신-D3": PENDING,
    },
  },
  상관: {
    // 사업운
    B: {
      "상관-B1": PENDING,
      "상관-B2": PENDING,
      "상관-B3": PENDING,
    },
    // 매출운
    S: {
      "상관-S1": PENDING,
      "상관-S2": PENDING,
      "상관-S3": PENDING,
    },
    // 거래운
    D: {
      "상관-D1": PENDING,
      "상관-D2": PENDING,
      "상관-D3": PENDING,
    },
  },
  편재: {
    // 사업운
    B: {
      "편재-B1": PENDING,
      "편재-B2": PENDING,
      "편재-B3": PENDING,
    },
    // 매출운
    S: {
      "편재-S1": PENDING,
      "편재-S2": PENDING,
      "편재-S3": PENDING,
    },
    // 거래운
    D: {
      "편재-D1": PENDING,
      "편재-D2": PENDING,
      "편재-D3": PENDING,
    },
  },
  정재: {
    // 사업운
    B: {
      "정재-B1": PENDING,
      "정재-B2": PENDING,
      "정재-B3": PENDING,
    },
    // 매출운
    S: {
      "정재-S1": PENDING,
      "정재-S2": PENDING,
      "정재-S3": PENDING,
    },
    // 거래운
    D: {
      "정재-D1": PENDING,
      "정재-D2": PENDING,
      "정재-D3": PENDING,
    },
  },
  편관: {
    // 사업운
    B: {
      "편관-B1": PENDING,
      "편관-B2": PENDING,
      "편관-B3": PENDING,
    },
    // 매출운
    S: {
      "편관-S1": PENDING,
      "편관-S2": PENDING,
      "편관-S3": PENDING,
    },
    // 거래운
    D: {
      "편관-D1": PENDING,
      "편관-D2": PENDING,
      "편관-D3": PENDING,
    },
  },
  정관: {
    // 사업운
    B: {
      "정관-B1": PENDING,
      "정관-B2": PENDING,
      "정관-B3": PENDING,
    },
    // 매출운
    S: {
      "정관-S1": PENDING,
      "정관-S2": PENDING,
      "정관-S3": PENDING,
    },
    // 거래운
    D: {
      "정관-D1": PENDING,
      "정관-D2": PENDING,
      "정관-D3": PENDING,
    },
  },
  편인: {
    // 사업운
    B: {
      "편인-B1": PENDING,
      "편인-B2": PENDING,
      "편인-B3": PENDING,
    },
    // 매출운
    S: {
      "편인-S1": PENDING,
      "편인-S2": PENDING,
      "편인-S3": PENDING,
    },
    // 거래운
    D: {
      "편인-D1": PENDING,
      "편인-D2": PENDING,
      "편인-D3": PENDING,
    },
  },
  정인: {
    // 사업운
    B: {
      "정인-B1": PENDING,
      "정인-B2": PENDING,
      "정인-B3": PENDING,
    },
    // 매출운
    S: {
      "정인-S1": PENDING,
      "정인-S2": PENDING,
      "정인-S3": PENDING,
    },
    // 거래운
    D: {
      "정인-D1": PENDING,
      "정인-D2": PENDING,
      "정인-D3": PENDING,
    },
  },
};
