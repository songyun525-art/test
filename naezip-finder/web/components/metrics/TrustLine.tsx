import { tradeTrust, dateText } from "@/lib/metrics/trust";
import type { SizeOption } from "@/lib/data";
import { MetricBadge } from "./MetricBadge";

/** 기준가 옆 거래 신뢰도: "실거래 기준 · 최근 3개월 12건 · [신뢰도 높음]" (카드에는 위에 "실거래 기준" 배지가 있어 prefix 를 비웁니다) */
export default function TrustLine({ size, prefix = "실거래 기준" }: { size: SizeOption; prefix?: string }) {
  const t = tradeTrust(size);
  return (
    <p className="trust-line tiny" title={`기준가 = 최근 ${t.months || 12}개월 실거래 중위가 · 마지막 거래 ${dateText(t.lastDeal)}`}>
      <span className="muted">
        {prefix ? `${prefix} · ` : ""}
        {t.detail}
      </span>
      <MetricBadge tone={t.tone}>{t.level ? `신뢰도 ${t.level}` : t.label}</MetricBadge>
      {t.caution && <span className="caution">{t.caution}</span>}
    </p>
  );
}
