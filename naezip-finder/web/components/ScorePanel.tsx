"use client";

import { useState } from "react";
import Icon from "./Icon";
import { DEFAULT_WEIGHTS, SCORE_ITEMS, subScores, topPercent, totalScore, type ScoreKey, type Weights } from "@/lib/score";
import { SLOT_COLORS, type Slot } from "./Compare";

const ITEM_ICONS: Record<ScoreKey, string> = {
  location: "pin",
  growth: "trend",
  households: "building",
  age: "clock",
  hojae: "bus",
};

export default function ScorePanel({
  slots,
  weights,
  onWeights,
}: {
  slots: Slot[];
  weights: Weights;
  onWeights: (w: Weights) => void;
}) {
  const [help, setHelp] = useState(false);
  const scores = slots.map((s) => subScores(s.complex));
  const totals = slots.map((s) => totalScore(s.complex, weights));
  const best = Math.max(...totals);
  const weightText = SCORE_ITEMS.map((it) => `${it.label}${weights[it.key]}`).join(", ");

  return (
    <section className="panel score-panel">
      <div className="panel-head">
        <h2>종합 비교 결과</h2>
        <span className="muted">샘플 단지 대비 백분위 점수로 비교했습니다. (가중치: {weightText})</span>
        <button className="chip-btn right" onClick={() => setHelp(!help)} aria-expanded={help}>
          <Icon name="help" size={14} /> 항목별 점수 설명
        </button>
      </div>

      {help && (
        <div className="weights">
          {SCORE_ITEMS.map((it) => (
            <label key={it.key} className="weight-row">
              <span className="w-label">{it.label}</span>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={weights[it.key]}
                onChange={(e) => onWeights({ ...weights, [it.key]: Number(e.target.value) })}
              />
              <span className="w-val">{weights[it.key]}</span>
              <span className="w-help muted">{it.help}</span>
            </label>
          ))}
          <button className="link-btn" onClick={() => onWeights(DEFAULT_WEIGHTS)}>기본값으로</button>
        </div>
      )}

      <div className="score-table" style={{ gridTemplateColumns: `var(--label-w) repeat(${slots.length}, 1fr)` }}>
        <div />
        {slots.map((s) => (
          <div key={s.complex.id} className="col-head">{s.complex.name}</div>
        ))}

        <div className="row-label total-label">
          <Icon name="crown" size={18} /> 종합 점수
        </div>
        {slots.map((s, i) => (
          <div key={s.complex.id} className="total-cell">
            <div className="total" style={{ color: SLOT_COLORS[i] }}>
              {totals[i]}<small>점</small>
              {totals[i] === best && slots.length > 1 && <span className="best">1위</span>}
            </div>
            <div className="tiny muted">(상위 {topPercent(s.complex, weights)}%)</div>
          </div>
        ))}

        {SCORE_ITEMS.map((it) => (
          <div key={it.key} className="contents">
            <div className="row-label">
              <Icon name={ITEM_ICONS[it.key]} size={15} /> {it.label} ({weights[it.key]}%)
            </div>
            {slots.map((s, i) => (
              <div key={s.complex.id} className="bar-cell" title={`${s.complex.name} ${it.label} ${scores[i][it.key]}점`}>
                <span className="bar-val">{scores[i][it.key]}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${scores[i][it.key]}%`, background: SLOT_COLORS[i] }} />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
