// 3단계 · 점수 기준 토글 (기존 / 기본형 / 실거주형 / 투자형). 항목 점수는 metricScores 가 0~100으로 만듭니다.
// 처음 버전이라 계산이 단순합니다. 항목별 계산식은 METRIC_INFO 의 help 에 적어 두었습니다.
import { complexes, type Complex, type SizeOption } from "../data";
import { nearbyHojae, subScores } from "../score";
import { hojaeDetail, hojaeGradeScore } from "./hojaeGrade";
import { jeonseMetrics } from "./jeonse";
import { peakRecovery } from "./recovery";
import { supplyOf } from "./supply";
import { tradeTrust } from "./trust";
import type { MetricKey, ScoreProfile, ScoreProfileKey } from "./types";

export const SCORE_PROFILES: Record<ScoreProfileKey, ScoreProfile> = {
  legacy: { key: "legacy", label: "기존", weights: { location: 30, growth: 25, households: 15, age: 15, hojae: 15 } },
  basic: { key: "basic", label: "기본형", weights: { location: 25, stability: 20, momentum: 15, demand: 15, product: 15, hojae: 10 } },
  living: { key: "living", label: "실거주형", weights: { location: 30, living: 20, product: 20, stability: 15, age: 10, hojae: 5 } },
  invest: { key: "invest", label: "투자형", weights: { recoveryRoom: 25, growth: 20, jeonse: 20, hojae: 15, volume: 10, supply: 10 } },
};
export const PROFILE_KEYS: ScoreProfileKey[] = ["legacy", "basic", "living", "invest"];

export const METRIC_INFO: Record<MetricKey, { label: string; icon: string; help: string }> = {
  location: { label: "입지", icon: "pin", help: "지하철역 거리와 강남역까지 시간" },
  growth: { label: "상승률", icon: "trend", help: "1·3·5·10년 상승률 백분위" },
  households: { label: "세대수", icon: "building", help: "3,000세대 이상 만점" },
  age: { label: "연식", icon: "clock", help: "신축일수록 높음, 30년 이상 재건축 가점" },
  hojae: { label: "호재", icon: "bus", help: "반경 3km 호재의 유형 점수 × 확실성 등급 (S 100% … D 20%)" },
  stability: { label: "가격 안정성", icon: "list", help: "거래 신뢰도 (높음 90 · 보통 65 · 낮음 35)" },
  momentum: { label: "상승/회복 흐름", icon: "trend", help: "상승률 점수와 고점 대비 회복률의 평균" },
  demand: { label: "수요/전세", icon: "building", help: "전세가율 40% 0점 → 80% 100점" },
  product: { label: "단지 상품성", icon: "building", help: "세대수·연식 점수 평균" },
  living: { label: "학군/생활편의", icon: "book", help: "가까운 초등학교 거리 (생활편의 데이터는 추후)" },
  recoveryRoom: { label: "가격 회복 여력", icon: "trend", help: "회복률 85% 근처가 가장 높고, 고점 돌파·큰 하락은 낮음" },
  jeonse: { label: "전세가율", icon: "building", help: "전세가율 40% 0점 → 80% 100점" },
  volume: { label: "거래량", icon: "list", help: "최근 3개월 거래 건수 (10건 이상 만점)" },
  supply: { label: "입주물량 리스크", icon: "building", help: "반경 3km 3년 입주 예정이 적을수록 높음 (0세대 100 → 10,000세대 0)" },
};

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function metricScores(c: Complex, size: SizeOption, price: number): Record<MetricKey, number> {
  const s = subScores(c);
  const trust = tradeTrust(size);
  const j = jeonseMetrics(size, price);
  const r = peakRecovery(c, size, price);
  const supply = supplyOf(c);
  const trustScore = trust.level === "높음" ? 90 : trust.level === "보통" ? 65 : trust.level === "낮음" ? 35 : 20;
  const jeonse = j.status === "ok" ? clamp((j.ratio - 0.4) * 250) : 50; // 40% → 0점, 80% → 100점
  const recoveryRoom = r.status === "ok" ? clamp(100 - Math.abs(r.recovery - 0.85) * 250) : 50; // 85% 근처가 가장 높음
  return {
    location: s.location,
    growth: s.growth,
    households: s.households,
    age: s.age,
    hojae: hojaeGradeScore(nearbyHojae(c).map(hojaeDetail)),
    stability: trustScore,
    momentum: r.status === "ok" ? clamp((s.growth + Math.min(1, r.recovery) * 100) / 2) : s.growth,
    demand: jeonse,
    product: clamp((s.households + s.age) / 2),
    living: clamp(100 - Math.min(c.schoolMeters, 1500) / 15),
    recoveryRoom,
    jeonse,
    volume: clamp(size.refMonths === 3 ? 40 + size.refCount * 6 : 20),
    supply: supply ? clamp(100 - supply.within3km3y / 100) : 50,
  };
}

/** 선택한 점수 기준의 가중 평균 */
export function profileScore(scores: Record<MetricKey, number>, profile: ScoreProfile) {
  const entries = Object.entries(profile.weights) as [MetricKey, number][];
  const sum = entries.reduce((a, [, w]) => a + w, 0) || 1;
  return Math.round(entries.reduce((a, [k, w]) => a + scores[k] * w, 0) / sum);
}

// 경기도 단지 전체 안에서 상위 몇 % 인지 (단지마다 84㎡ 또는 첫 평형, 실거래 기준가로 계산)
const mainSize = (c: Complex) => c.sizes.find((z) => z.area >= 76 && z.area < 90) ?? c.sizes[0];
const totalsCache = new Map<ScoreProfileKey, number[]>();
export function profileTopPercent(score: number, key: ScoreProfileKey) {
  let totals = totalsCache.get(key);
  if (!totals) {
    totals = complexes.map((c) => profileScore(metricScores(c, mainSize(c), mainSize(c).price), SCORE_PROFILES[key]));
    totalsCache.set(key, totals);
  }
  const better = totals.filter((t) => t > score).length;
  return Math.max(1, Math.round(((better + 1) / totals.length) * 100));
}
