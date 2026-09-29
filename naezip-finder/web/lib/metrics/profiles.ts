// 3단계 · 점수 기준 토글 (기본형 / 실거주형 / 투자형). 항목 점수는 metricScores 가 0~100으로 만들고,
// 아직 데이터가 없는 항목(학군, 입주물량 등)은 50점으로 둡니다. 화면 연결 전이라 계산이 단순합니다.
import type { Complex, SizeOption } from "../data";
import { subScores } from "../score";
import { jeonseMetrics } from "./jeonse";
import { peakRecovery } from "./recovery";
import { tradeTrust } from "./trust";
import type { MetricKey, ScoreProfile, ScoreProfileKey } from "./types";

export const SCORE_PROFILES: Record<ScoreProfileKey, ScoreProfile> = {
  legacy: { key: "legacy", label: "기존", weights: { location: 30, growth: 25, households: 15, age: 15, hojae: 15 } },
  basic: { key: "basic", label: "기본형", weights: { location: 25, stability: 20, momentum: 15, demand: 15, product: 15, hojae: 10 } },
  living: { key: "living", label: "실거주형", weights: { location: 30, living: 20, product: 20, stability: 15, age: 10, hojae: 5 } },
  invest: { key: "invest", label: "투자형", weights: { recoveryRoom: 25, growth: 20, jeonse: 20, hojae: 15, volume: 10, supply: 10 } },
};

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function metricScores(c: Complex, size: SizeOption, price: number): Record<MetricKey, number> {
  const s = subScores(c);
  const trust = tradeTrust(size);
  const j = jeonseMetrics(size, price);
  const r = peakRecovery(c, size, price);
  const trustScore = trust.level === "높음" ? 90 : trust.level === "보통" ? 65 : trust.level === "낮음" ? 35 : 20;
  const jeonse = j.status === "ok" ? clamp((j.ratio - 0.4) * 250) : 50; // 40% → 0점, 80% → 100점
  const recoveryRoom = r.status === "ok" ? clamp(100 - Math.abs(r.recovery - 0.85) * 250) : 50; // 85% 근처가 가장 높음
  return {
    location: s.location,
    growth: s.growth,
    households: s.households,
    age: s.age,
    hojae: s.hojae,
    stability: trustScore,
    momentum: r.status === "ok" ? clamp((s.growth + r.recovery * 100) / 2) : s.growth,
    demand: jeonse,
    product: clamp((s.households + s.age) / 2),
    living: clamp(100 - Math.min(c.schoolMeters, 1500) / 15),
    recoveryRoom,
    jeonse,
    volume: clamp(size.refMonths === 3 ? 40 + size.refCount * 6 : 20),
    supply: 50,
  };
}

/** 선택한 점수 기준의 가중 평균 */
export function profileScore(scores: Record<MetricKey, number>, profile: ScoreProfile) {
  const entries = Object.entries(profile.weights) as [MetricKey, number][];
  const sum = entries.reduce((a, [, w]) => a + w, 0) || 1;
  return Math.round(entries.reduce((a, [k, w]) => a + scores[k] * w, 0) / sum);
}
