import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "역량지도 | 교원 문항 기반 성장 기록",
  description: "교원 평가 문항을 5점 리커트 척도로 체크하고 7각형 역량 지도로 확인하는 도구입니다.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
