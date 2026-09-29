import { jeonseMetrics, ratioText } from "@/lib/metrics/jeonse";
import { formatEok, pct, chgClass } from "@/lib/score";
import type { SizeOption } from "@/lib/data";
import { MetricBadge, SampleTag } from "./MetricBadge";

/** 전세가율 · 갭 · 1년 전세 상승률 한 줄. 데이터가 없으면 "전세 데이터 부족" */
export default function JeonseLine({ size, price, compact = false }: { size: SizeOption; price: number; compact?: boolean }) {
  const j = jeonseMetrics(size, price);
  if (j.status === "missing") return <span className="jeonse-line muted tiny">{j.label}</span>;
  return (
    <span className="jeonse-line" title={`최근 전세 ${formatEok(j.price)} (전세 ${size.jeonse?.count ?? 0}건) · 기준가 ${formatEok(price)}`}>
      <MetricBadge tone={j.tone}>전세가율 {ratioText(j.ratio)}</MetricBadge>
      <span>갭 {formatEok(j.gap)}</span>
      {!compact && (
        <span>
          1년 전세 <span className={chgClass(j.y1)}>{pct(j.y1)}</span>
        </span>
      )}
      {j.isSample && <SampleTag />}
    </span>
  );
}
