import PageHeader from "@/components/PageHeader";
import FindHomes from "@/components/FindHomes";

export const metadata = { title: "예산에 맞는 집 · 윤송이의 내집찾기" };

export default async function FindPage({ searchParams }: { searchParams: Promise<{ budget?: string }> }) {
  const { budget } = await searchParams;
  const initial = Number(budget) > 0 ? Number(budget) : 9;
  return (
    <>
      <PageHeader kicker="내 예산으로" title="예산에 맞는 집 찾기" sub="예산 안에서 살 수 있는 경기도 단지를 종합점수 순으로 보여 드려요." />
      <FindHomes key={initial} initialBudget={initial} />
    </>
  );
}
