import { SLOT_COLORS, slotPrice, slotSize, type Slot } from "./Compare";
import { formatEok, nearbyHojae, pct, chgClass, orLow } from "@/lib/score";
import { householdsText } from "@/lib/data";
import { tradeTrust, dateText } from "@/lib/metrics/trust";
import { jeonseMetrics, ratioText } from "@/lib/metrics/jeonse";
import { peakRecovery } from "@/lib/metrics/recovery";
import { supplyOf, supplyRisk } from "@/lib/metrics/supply";
import { InfoTip, MetricBadge, SampleTag } from "./metrics/MetricBadge";

export type RowDef = { label: string; cell: (s: Slot) => React.ReactNode; best?: (s: Slot) => number };

const pastPrice = (s: Slot, g: number) => slotSize(s).price / (1 + g);

export const ROWS: RowDef[] = [
  { label: "세대수", cell: (s) => householdsText(s.complex) || "–", best: (s) => s.complex.households || -Infinity },
  { label: "연식 (사용승인)", cell: (s) => `${s.complex.year}년 (${2026 - s.complex.year}년차)`, best: (s) => s.complex.year },
  { label: "평형", cell: (s) => `전용 ${slotSize(s).area}㎡ (${slotSize(s).pyeong}평)` },
  { label: "용적률", cell: (s) => (s.complex.far ? `${s.complex.far}%` : "–"), best: (s) => (s.complex.far ? -s.complex.far : -Infinity) },
  { label: "초등학교", cell: (s) => `${s.complex.schoolMeters.toLocaleString()}m${s.complex.schoolMeters <= 300 ? " (초품아)" : ""}`, best: (s) => -s.complex.schoolMeters },
  { label: "지하철역", cell: (s) => `${s.complex.stationMeters.toLocaleString()}m · 강남 ${s.complex.gangnamMinutes}분`, best: (s) => -s.complex.stationMeters },
  {
    label: "호재 (반경 3km)",
    cell: (s) => {
      const list = nearbyHojae(s.complex);
      return list.length ? list.map((h) => h.title).join(", ") : "없음";
    },
    best: (s) => nearbyHojae(s.complex).length,
  },
  {
    label: "입주물량 (3년)",
    cell: (s) => {
      const r = supplyRisk(supplyOf(s.complex));
      if (r.status === "missing") return <span className="muted">{r.label}</span>;
      const top = r.data.nearby.slice(0, 3).map((n) => `${n.name} ${n.households.toLocaleString()}세대 (${n.moveIn.replace("-", ".")})`).join("\n");
      return (
        <>
          <MetricBadge tone={r.tone}>리스크 {r.level}</MetricBadge> 반경 3km {r.data.within3km3y.toLocaleString()}세대
          {top && <InfoTip text={top} />}
          <div className="tiny muted">
            1년 안 {r.data.within3km1y.toLocaleString()}세대 · {s.complex.city} 전체 {r.data.sgg3y.toLocaleString()}세대
          </div>
        </>
      );
    },
    best: (s) => {
      const d = supplyOf(s.complex);
      return d ? -d.within3km3y : -Infinity;
    },
  },
  { label: "현재 실거래가", cell: (s) => formatEok(slotSize(s).price) },
  {
    label: "거래 신뢰도",
    cell: (s) => {
      const t = tradeTrust(slotSize(s));
      return (
        <>
          <MetricBadge tone={t.tone}>{t.level ? `신뢰도 ${t.level}` : t.label}</MetricBadge> {t.detail}
          <div className="tiny muted">마지막 거래 {dateText(t.lastDeal)}{t.caution ? ` · ${t.caution}` : ""}</div>
        </>
      );
    },
    best: (s) => {
      const t = tradeTrust(slotSize(s));
      return t.months ? (t.months === 3 ? 1000 : 0) + t.count / t.months : -Infinity;
    },
  },
  {
    label: "최근 전세가",
    cell: (s) => {
      const j = jeonseMetrics(slotSize(s), slotPrice(s));
      if (j.status === "missing") return <span className="muted">{j.label}</span>;
      return (
        <>
          {formatEok(j.price)} <span className="tiny muted">1년</span> <span className={chgClass(j.y1)}>{pct(j.y1)}</span>
          {j.isSample && <SampleTag />}
        </>
      );
    },
  },
  {
    label: "전세가율 · 갭",
    cell: (s) => {
      const j = jeonseMetrics(slotSize(s), slotPrice(s));
      if (j.status === "missing") return <span className="muted">–</span>;
      return (
        <>
          <MetricBadge tone={j.tone}>{ratioText(j.ratio)}</MetricBadge> 갭 {formatEok(j.gap)}
        </>
      );
    },
    best: (s) => {
      const j = jeonseMetrics(slotSize(s), slotPrice(s));
      return j.status === "ok" ? j.ratio : -Infinity;
    },
  },
  {
    label: "10년 최고가",
    cell: (s) => {
      const r = peakRecovery(s.complex, slotSize(s), slotPrice(s));
      if (r.status === "missing") return <span className="muted">–</span>;
      return (
        <>
          {formatEok(r.peak)} <span className="tiny muted">({r.peakWhen})</span>
        </>
      );
    },
  },
  {
    label: "고점 대비",
    cell: (s) => {
      const r = peakRecovery(s.complex, slotSize(s), slotPrice(s));
      if (r.status === "missing") return <span className="muted">–</span>;
      return (
        <>
          <span className={r.drawdown >= 0 ? "chg up" : "chg down"}>{`${r.drawdown >= 0 ? "+" : ""}${(r.drawdown * 100).toFixed(1)}%`}</span>
          {" · "}회복률 {Math.round(r.recovery * 100)}% <MetricBadge tone={r.tone}>{r.stage}</MetricBadge>
        </>
      );
    },
  },
  ...(["y1", "y3", "y5"] as const).map((k, i) => ({
    label: `${[1, 3, 5][i]}년 전 실거래가`,
    cell: (s: Slot) => (
      <>
        {formatEok(pastPrice(s, s.complex.growth[k]))}{" "}
        <span className={chgClass(s.complex.growth[k])}>{pct(s.complex.growth[k])}</span>
      </>
    ),
    best: (s: Slot) => orLow(s.complex.growth[k]),
  })),
];

export default function DetailTable({ slots }: { slots: Slot[] }) {
  return (
    <section className="panel wide detail-panel">
      <div className="panel-head">
        <h2>매물 상세 비교표</h2>
        <span className="muted">항목별로 더 나은 쪽에 ● 표시</span>
      </div>
      <div className="detail-scroll">
        <table className="detail">
          <thead>
            <tr>
              <th />
              {slots.map((s, i) => (
                <th key={s.complex.id}><i className="dot" style={{ background: SLOT_COLORS[i] }} />{s.complex.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const vals = r.best && slots.length > 1 ? slots.map(r.best) : null;
              // 모두 같거나 값이 없으면 표시하지 않습니다.
              const top = vals && new Set(vals).size > 1 && Number.isFinite(Math.max(...vals)) ? Math.max(...vals) : null;
              return (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {slots.map((s, i) => (
                    <td key={s.complex.id} className={vals && vals[i] === top ? "win" : undefined}>
                      {r.cell(s)}
                      {vals && vals[i] === top && <span className="win-dot" aria-label="더 나음">●</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
