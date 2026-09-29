import { risksFor, NO_RISK_TEXT } from "@/lib/metrics/risk";
import { SUPPLY_SOURCE } from "@/lib/metrics/supply";
import { SLOT_COLORS, slotPrice, slotSize, type Slot } from "../Compare";
import { InfoTip, MetricBadge } from "./MetricBadge";

const RULES_HELP =
  "거래 신뢰도 낮음, 전세가율 50% 미만, 반경 3km 3년 입주 예정 5,000세대 이상, 10년 최고가보다 20% 넘게 높은 가격, 주변 호재가 모두 계획·검토 단계, 25년 넘은 단지, 300세대 미만이면 표시합니다.";

/** 단지마다 주의할 점 (상세 비교표 위) */
export default function RiskSummaryCard({ slots }: { slots: Slot[] }) {
  return (
    <section className="panel wide risk-panel">
      <div className="panel-head">
        <h2>주의 리스크</h2>
        <span className="muted">좋은 점만이 아니라 확인할 점도 함께 보세요.</span>
        <span className="right">
          <InfoTip text={RULES_HELP} />
        </span>
      </div>
      <div className="risk-grid" style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}>
        {slots.map((s, i) => {
          const risks = risksFor(s.complex, slotSize(s), slotPrice(s));
          return (
            <div key={s.complex.id} className="risk-col">
              <div className="risk-name">
                <i className="dot" style={{ background: SLOT_COLORS[i] }} />
                {s.complex.name}
              </div>
              {risks.length ? (
                <ul className="risk-list">
                  {risks.map((r) => (
                    <li key={r.key}>
                      <MetricBadge tone={r.severity === "주의" ? "warn" : "normal"}>{r.severity}</MetricBadge> {r.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="risk-none">
                  <MetricBadge tone="good">양호</MetricBadge> {NO_RISK_TEXT}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="tiny muted risk-foot">입주물량은 {SUPPLY_SOURCE}</p>
    </section>
  );
}
