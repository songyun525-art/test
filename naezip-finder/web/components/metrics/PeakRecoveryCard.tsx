import { peakRecovery, RECOVERY_HELP } from "@/lib/metrics/recovery";
import { formatEok } from "@/lib/score";
import { SLOT_COLORS, slotPrice, slotSize, type Slot } from "../Compare";
import { InfoTip, MetricBadge, SampleTag } from "./MetricBadge";

const pct1 = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

/** 가격 추이 아래 "고점 대비 회복률" 카드 (주요 지표 요약과 같은 표 모양) */
export default function PeakRecoveryCard({ slots }: { slots: Slot[] }) {
  const rows = slots.map((s) => peakRecovery(s.complex, slotSize(s), slotPrice(s)));
  const sample = rows.some((r) => r.status === "ok" && r.isSample);
  return (
    <section className="panel metrics-panel recovery-panel">
      {/* 현재 기준가는 비교 카드에 있으니 여기서는 최고가·하락률·회복률만 보여 줍니다. */}
      <div className="panel-head">
        <h2>고점 대비 회복률</h2>
        <span className="muted">(최근 10년 최고가 기준{sample ? " · 샘플" : ""})</span>
        <span className="right">
          <InfoTip text="10년 최고가 = 최근 10년 분기별 실거래 중위가 중 최고 (거래 2건 이상 분기 우선, 직거래 제외). 고점 대비 = (현재 기준가 − 10년 최고가) ÷ 10년 최고가, 회복률 = 현재 기준가 ÷ 10년 최고가. 호가를 직접 넣으면 그 값으로 계산합니다." />
        </span>
      </div>
      <table className="metrics">
        <thead>
          <tr>
            <th>단지명</th><th>10년 최고가</th><th>고점 대비</th><th>회복률</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s, i) => {
            const r = rows[i];
            return (
              <tr key={s.complex.id}>
                <td><i className="dot" style={{ background: SLOT_COLORS[i] }} />{s.complex.name}</td>
                {r.status === "missing" ? (
                  <td colSpan={3} className="muted">가격 기록 부족</td>
                ) : (
                  <>
                    <td title={r.peakWhen}>{formatEok(r.peak)}<div className="tiny muted">{r.peakWhen}</div></td>
                    <td className={r.drawdown >= 0 ? "up" : "down"}>{pct1(r.drawdown)}</td>
                    <td>
                      <MetricBadge tone={r.tone} title={`현재 ${formatEok(r.current)} · ${r.stage}`}>{Math.round(r.recovery * 100)}%</MetricBadge>
                      {r.isSample && <SampleTag what="가격" />}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="tiny muted recovery-help">{RECOVERY_HELP}</p>
    </section>
  );
}
