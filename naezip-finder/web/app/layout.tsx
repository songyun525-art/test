import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import CompareTray from "@/components/CompareTray";

export const metadata: Metadata = {
  title: "윤송이의 내집찾기",
  description: "같은 돈으로, 가장 좋은 집을. 경기도 아파트를 데이터로 비교하고 내 예산에 맞는 단지를 찾습니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="app">
          <Sidebar />
          <main className="main">{children}</main>
          <CompareTray />
        </div>
      </body>
    </html>
  );
}
