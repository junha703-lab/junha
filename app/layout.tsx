import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "역량지도 | 대전양지초 맞춤형 CARE 성장 기록",
  description:
    "맞춤형 CARE 지원 모델에 따라 교원 역량을 돌아보고 4월·10월·1월의 성장을 7각형 지도로 확인합니다.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

