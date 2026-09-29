"use client";

import { useState } from "react";
import Icon from "./Icon";
import { DEFAULT_WEIGHTS, SCORE_ITEMS, subScores, topPercent, totalScore, type ScoreKey, type Weights } from "@/lib/score";
import { METRIC_INFO, PROFILE_KEYS, SCORE_PROFILES, metricScores, profileScore, profileTopPercent } from "@/lib/metrics/profiles";
import type { MetricKey, ScoreProfileKey } from "@/lib/metrics/types";
import { SLOT_COLORS, slotPrice, slotSize, type Slot } from "./Compare";
import JeonseLine from "./metrics/JeonseLine";
import { InfoTip } from "./metrics/MetricBadge";

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
  const [profileKey, setProfileKey] = useState<ScoreProfileKey>("legacy");
  const legacy = profileKey === "legacy";
  const profile = SCORE_PROFILES[profileKey];
  // 점수 기준에 따라 보여 줄 항목·점수·종합점수를 고릅니다. "기존"은 가중치 조절이 되는 원래 방식 그대로입니다.
  const items: { key: string; label: string; icon: string; weight: number; help: string }[] = legacy
    ? SCORE_ITEMS.map((it) => ({ key: it.key, label: it.label, icon: ITEM_ICONS[it.key], weight: weights[it.key], help: it.help }))
    : (Object.entries(profile.weights) as [MetricKey, number][]).map(([k, w]) => ({ key: k, ...METRIC_INFO[k], weight: w }));
  const scores: Record<string, number>[] = slots.map((s) =>
    legacy ? subScores(s.complex) : metricScores(s.complex, slotSize(s), slotPrice(s)),
  );
  const totals = slots.map((s, i) => (legacy ? totalScore(s.complex, weights) : profileScore(scores[i] as Record<MetricKey, number>, profile)));
  const tops = slots.map((s, i) => (legacy ? topPercent(s.complex, weights) : profileTopPercent(totals[i], profileKey)));
  const best = Math.max(...totals);
  const weightText = items.map((it) => `${it.label}${it.weight}`).join(", ");

  return (
    <section className="panel score-panel">
      <div className="panel-head">
        <h2>종합 비교 결과</h2>
        <span className="muted">경기도 단지 대비 점수로 비교했습니다. (가중치: {weightText})</span>
        <div className="pill-tabs profile-tabs right" role="group" aria-label="점수 기준">
          <span className="tiny muted">점수 기준</span>
          {PROFILE_KEYS.map((k) => (
            <button key={k} className={profileKey === k ? "pill on" : "pill"} onClick={() => setProfileKey(k)}>
              {SCORE_PROFILES[k].label}
            </button>
          ))}
        </div>
        <button className="chip-btn" onClick={() => setHelp(!help)} aria-expanded={help}>
          <Icon name="help" size={14} /> 항목별 점수 설명
        </button>
      </div>

      {help && !legacy && (
        <div className="weights">
          {items.map((it) => (
            <div key={it.key} className="weight-row">
              <span className="w-label">{it.label}</span>
              <span className="w-val">{it.weight}</span>
              <span />
              <span className="w-help muted">{it.help}</span>
            </div>
          ))}
          <span className="tiny muted">{profile.label} 기준은 처음 버전이라 계산이 단순합니다. 가중치 조절은 "기존" 기준에서 할 수 있어요.</span>
        </div>
      )}

      {help && legacy && (
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
            <div className="tiny muted">(상위 {tops[i]}%)</div>
          </div>
        ))}

        {items.map((it) => (
          <div key={it.key} className="contents">
            <div className="row-label" title={it.help}>
              <Icon name={it.icon} size={15} /> {it.label} ({it.weight}%)
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

        <div className="row-label sub-label">
          보조 지표 · 전세 <InfoTip text="전세가율 = 최근 전세가 ÷ 기준가. 70% 이상이면 실수요가 탄탄한 편, 50% 미만이면 매매가에 기대 수요가 많이 반영된 편입니다. 종합 점수에는 아직 넣지 않았습니다." />
        </div>
        {slots.map((s) => (
          <div key={s.complex.id} className="sub-cell">
            <JeonseLine size={slotSize(s)} price={slotPrice(s)} />
          </div>
        ))}
      </div>
    </section>
  );
}
