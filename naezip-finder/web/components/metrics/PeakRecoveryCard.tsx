import { peakRecovery, RECOVERY_HELP } from "@/lib/metrics/recovery";
import { formatEok } from "@/lib/score";
import { SLOT_COLORS, slotPrice, slotSize, type Slot } from "../Compare";
import { MetricBadge, SampleTag } from "./MetricBadge";

const pct1 = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

/** 가격 추이 아래 "고점 대비 회복률" 카드 */
export default function PeakRecoveryCard({ slots }: { slots: Slot[] }) {
  const rows = slots.map((s) => peakRecovery(s.complex, slotSize(s), slotPrice(s)));
  const sample = rows.some((r) => r.status === "ok" && r.isSample);
  return (
    <section className="panel recovery-panel">
      <div className="panel-head">
        <h2>고점 대비 회복률</h2>
        <span className="muted">(최근 10년 최고가 기준{sample ? " · 샘플" : ""})</span>
      </div>
      <div className="recovery-list">
        {slots.map((s, i) => {
          const r = rows[i];
          return (
            <div key={s.complex.id} className="recovery-row">
              <div className="recovery-name">
                <i className="dot" style={{ background: SLOT_COLORS[i] }} />
                {s.complex.name}
              </div>
              {r.status === "missing" ? (
                <span className="muted tiny">가격 기록 부족</span>
              ) : (
                <>
                  <div className="recovery-nums">
                    <span>
                      10년 최고가 <b>{formatEok(r.peak)}</b> <span className="muted tiny">({r.peakWhen})</span>
                    </span>
                    <span>
                      현재 <b>{formatEok(r.current)}</b>
                    </span>
                    <span>
                      고점 대비 <b className={r.drawdown >= 0 ? "chg up" : "chg down"}>{pct1(r.drawdown)}</b>
                    </span>
                  </div>
                  <div className="recovery-meter" aria-label={`회복률 ${Math.round(r.recovery * 100)}%`}>
                    <span className="recovery-track">
                      <span className="recovery-fill" style={{ width: `${Math.min(100, r.recovery * 100)}%`, background: SLOT_COLORS[i] }} />
                    </span>
                    <b>회복률 {Math.round(r.recovery * 100)}%</b>
                    <MetricBadge tone={r.tone}>{r.stage}</MetricBadge>
                    {r.isSample && <SampleTag what="가격" />}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="tiny muted recovery-help">{RECOVERY_HELP}</p>
      <details className="tiny muted more-info">
        <summary>계산 방법</summary>
        <p>10년 최고가는 최근 10년 분기별 실거래 중위가 중 가장 높은 값입니다 (거래 2건 이상인 분기 우선, 직거래 제외).</p>
        <p>고점 대비 하락률 = (현재 기준가 − 10년 최고가) ÷ 10년 최고가, 회복률 = 현재 기준가 ÷ 10년 최고가. 호가를 직접 넣으면 그 값으로 계산합니다.</p>
      </details>
    </section>
  );
}
