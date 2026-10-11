import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { brand } from "@/lib/brand";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: {
    default: brand.name,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: brand.name,
    title: brand.name,
    description: brand.description,
    // OG 이미지는 오픈 승인 후 추가합니다.
  },
  // 오픈 승인 전까지 noindex. 해제 시 app/robots.ts도 함께 고칩니다.
  robots: { index: false, follow: false },
};

// 반응형 기준(docs/RESPONSIVE.md): viewport-fit=cover 사용, 확대 금지 옵션은 넣지 않습니다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body className="site">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
