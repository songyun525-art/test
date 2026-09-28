import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "윤송이의 내집찾기",
  description: "같은 돈으로, 가장 좋은 집을. 경기도 아파트를 데이터로 비교하고 비슷한 가격대 단지를 추천합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
