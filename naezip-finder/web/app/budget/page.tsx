import PageHeader from "@/components/PageHeader";
import BudgetCalculator from "@/components/BudgetCalculator";

export const metadata = { title: "내 예산 구하기 · 윤송이의 내집찾기" };

export default function BudgetPage() {
  return (
    <>
      <PageHeader kicker="대출까지 합쳐서" title="내 예산 구하기" sub="현금, 소득, 가구 상황을 넣으면 지금 규정으로 살 수 있는 집값을 계산해요." />
      <BudgetCalculator />
    </>
  );
}
