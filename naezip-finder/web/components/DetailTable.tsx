import { SLOT_COLORS, slotSize, type Slot } from "./Compare";
import { formatEok, nearbyHojae, pct } from "@/lib/score";

type RowDef = { label: string; cell: (s: Slot) => React.ReactNode; best?: (s: Slot) => number };

const pastPrice = (s: Slot, g: number) => slotSize(s).price / (1 + g);

const ROWS: RowDef[] = [
  { label: "세대수", cell: (s) => `${s.complex.households.toLocaleString()}세대`, best: (s) => s.complex.households },
  { label: "연식 (사용승인)", cell: (s) => `${s.complex.year}년 (${2026 - s.complex.year}년차)`, best: (s) => s.complex.year },
  { label: "평형", cell: (s) => `전용 ${slotSize(s).area}㎡ (${slotSize(s).pyeong}평)` },
  { label: "용적률", cell: (s) => `${s.complex.far}%`, best: (s) => -s.complex.far },
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
  { label: "현재 실거래가", cell: (s) => formatEok(slotSize(s).price) },
  ...(["y1", "y3", "y5"] as const).map((k, i) => ({
    label: `${[1, 3, 5][i]}년 전 실거래가`,
    cell: (s: Slot) => (
      <>
        {formatEok(pastPrice(s, s.complex.growth[k]))}{" "}
        <span className={s.complex.growth[k] >= 0 ? "chg up" : "chg down"}>{pct(s.complex.growth[k])}</span>
      </>
    ),
    best: (s: Slot) => s.complex.growth[k],
  })),
];

export default function DetailTable({ slots }: { slots: Slot[] }) {
  return (
    <section className="panel wide detail-panel">
      <div className="panel-head">
        <h2>매물 상세 비교표</h2>
        <span className="muted">항목별로 더 나은 쪽에 ● 표시 (샘플 데이터)</span>
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
              const top = vals ? Math.max(...vals) : null;
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
