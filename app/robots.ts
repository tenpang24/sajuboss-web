import type { MetadataRoute } from "next";

// 오픈 승인 전까지 전체 차단. 해제 시 app/layout.tsx의 robots도 함께 고칩니다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
