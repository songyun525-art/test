import PageHeader from "@/components/PageHeader";
import StudyReference from "@/components/StudyReference";

export const metadata = { title: "공부 레퍼런스 · 윤송이의 내집찾기" };

export default function StudyPage() {
  return (
    <>
      <PageHeader kicker="아직 돈이 없어도" title="공부 레퍼런스" sub="대장아파트와 오르고 내린 단지, 거래가 많은 단지부터 살펴보세요." />
      <StudyReference />
    </>
  );
}
