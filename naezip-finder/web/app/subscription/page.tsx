import PageHeader from "@/components/PageHeader";
import SubscriptionBoard from "@/components/SubscriptionBoard";

export const metadata = { title: "청약 정보 · 윤송이의 내집찾기" };

export default function SubscriptionPage() {
  return (
    <>
      <PageHeader kicker="새 아파트를 노린다면" title="청약 정보" sub="경기도 분양 일정과 분양가·주변 시세 비교, 내 청약 가점을 한 번에 확인해요." />
      <SubscriptionBoard />
    </>
  );
}
