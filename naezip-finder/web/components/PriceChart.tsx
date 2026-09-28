"use client";

import { useState } from "react";
import Icon from "./Icon";
import { DATA_AS_OF } from "@/lib/data";
import { formatEok, pct, priceHistory } from "@/lib/score";
import { SLOT_COLORS, slotPrice, slotSize, type Slot } from "./Compare";

const W = 520;
const H = 190;
const PAD = { l: 34, r: 12, t: 12, b: 24 };
const END_YEAR = 2026;

export function PriceChart({ slots }: { slots: Slot[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const series = slots.map((s) => priceHistory(s.complex, slotSize(s).price));
  const all = series.flat().map((p) => p.price);
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const step = [1, 2, 5, 10].find((st) => (rawMax - rawMin) / st <= 5) ?? 10;
  const yMin = Math.max(0, Math.floor(rawMin / step) * step);
  const yMax = Math.ceil(rawMax / step) * step;
  const x = (t: number) => PAD.l + ((t + 10) / 10) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + ((yMax - v) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b);
  const ticks = [];
  for (let v = yMin; v <= yMax; v += step) ticks.push(v);
  const n = series[0]?.length ?? 0;
  const idx = hover ?? n - 1;
  const t = series[0]?.[idx]?.t ?? 0;
  const qIndex = END_YEAR * 4 + 2 + Math.round(t * 4); // 마지막 점 = 2026년 3분기
  const whenLabel = hover === null ? `${DATA_AS_OF} (최근 3개월 평균)` : `${Math.floor(qIndex / 4)}년 ${(qIndex % 4) + 1}분기`;

  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <h2>최근 10년 가격 추이</h2>
        <span className="muted">(샘플 · 평형별 기준가)</span>
      </div>
      <div className="legend">
        {slots.map((s, i) => (
          <span key={s.complex.id}>
            <i style={{ background: SLOT_COLORS[i] }} /> {s.complex.name}
          </span>
        ))}
      </div>
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="단지별 10년 가격 추이"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
            setHover(i >= 0 && i < n ? i : null);
          }}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
              <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" className="axis">{v}억</text>
            </g>
          ))}
          {[-10, -8, -6, -4, -2, 0].map((tt) => (
            <text key={tt} x={x(tt)} y={H - 6} textAnchor="middle" className="axis">{END_YEAR + tt}</text>
          ))}
          <line x1={x(t)} x2={x(t)} y1={PAD.t} y2={H - PAD.b} stroke="#9aa3af" strokeDasharray="3 3" />
          {series.map((pts, i) => (
            <g key={slots[i].complex.id}>
              <polyline
                points={pts.map((p) => `${x(p.t)},${y(p.price)}`).join(" ")}
                fill="none"
                stroke={SLOT_COLORS[i]}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx={x(pts[idx].t)} cy={y(pts[idx].price)} r="4" fill={SLOT_COLORS[i]} stroke="var(--surface)" strokeWidth="2" />
            </g>
          ))}
        </svg>
        <div className="chart-tip">
          <div className="tip-title">{whenLabel}</div>
          {slots.map((s, i) => (
            <div key={s.complex.id} className="tip-row">
              <i style={{ background: SLOT_COLORS[i] }} />
              <span>{s.complex.name}</span>
              <b>{formatEok(hover === null ? slotPrice(s) : series[i][idx].price)}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MetricsTable({ slots }: { slots: Slot[] }) {
  return (
    <section className="panel metrics-panel">
      <div className="panel-head">
        <h2>주요 지표 요약</h2>
        <span className="muted">(84㎡ 기준, 최근 N년 상승률)</span>
        <a className="more right" href="#">더보기 <Icon name="right" size={14} /></a>
      </div>
      <table className="metrics">
        <thead>
          <tr>
            <th>단지명</th><th>세대수</th><th>연식</th><th>1년</th><th>3년</th><th>5년</th><th>10년</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s, i) => (
            <tr key={s.complex.id}>
              <td><i className="dot" style={{ background: SLOT_COLORS[i] }} />{s.complex.name}</td>
              <td>{s.complex.households.toLocaleString()}</td>
              <td>{s.complex.year}</td>
              {(["y1", "y3", "y5", "y10"] as const).map((k) => (
                <td key={k} className="up">{pct(s.complex.growth[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
