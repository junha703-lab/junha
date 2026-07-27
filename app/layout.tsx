import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "역량나침반 | 교원용 성장 기록 도구",
  description: "교원의 역량 점수를 입력하고 오각형·육각형 그래프로 확인하는 성장 기록 도구입니다.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
