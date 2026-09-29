// 2단계 · 리스크 요약 (단지마다 주의할 점). 1단계 지표, 입주물량, 호재 등급, 연식·세대수로 판정합니다.
import type { Complex, SizeOption } from "../data";
import { nearbyHojae } from "../score";
import { hojaeDetail } from "./hojaeGrade";
import { jeonseMetrics } from "./jeonse";
import { peakRecovery } from "./recovery";
import { supplyOf, supplyRisk } from "./supply";
import { tradeTrust } from "./trust";
import type { HojaeGrade, JeonseMetrics, PeakRecovery, RiskItem, SupplyRisk, TradeTrust } from "./types";

export type RiskInput = {
  trust: TradeTrust;
  jeonse: JeonseMetrics;
  recovery: PeakRecovery;
  supply: SupplyRisk;
  hojaeGrades: HojaeGrade[]; // 반경 3km 호재 등급
  year: number; // 사용승인 연도
  households: number; // 0 = 모름
};

export const RISK_RULES = {
  jeonseRatioMin: 0.5, // 전세가율 50% 미만
  overheatedRecovery: 1.2, // 10년 최고가보다 20% 넘게 높음
  oldYears: 25, // 25년 넘은 단지
  smallHouseholds: 300, // 300세대 미만
};

export const NO_RISK_TEXT = "뚜렷한 주요 리스크 없음";

export function riskSummary(x: RiskInput, now = 2026): RiskItem[] {
  const out: RiskItem[] = [];
  if (x.trust.level === "낮음" || x.trust.level === null) out.push({ key: "lowTrust", text: "최근 거래 수 적음", severity: "주의" });
  if (x.jeonse.status === "ok" && x.jeonse.ratio < RISK_RULES.jeonseRatioMin)
    out.push({ key: "lowJeonse", text: `전세가율 ${Math.round(RISK_RULES.jeonseRatioMin * 100)}% 미만`, severity: "주의" });
  if (x.supply.status === "ok" && x.supply.level === "높음") out.push({ key: "highSupply", text: `주변 입주물량 많음 (3km 내 3년 ${x.supply.data.within3km3y.toLocaleString()}세대)`, severity: "주의" });
  if (x.recovery.status === "ok" && x.recovery.recovery > RISK_RULES.overheatedRecovery)
    out.push({ key: "overheated", text: "10년 고점보다 크게 오른 가격", severity: "참고" });
  if (x.hojaeGrades.length && x.hojaeGrades.every((g) => g === "C" || g === "D"))
    out.push({ key: "weakHojae", text: "주변 호재가 계획 단계", severity: "참고" });
  if (now - x.year > RISK_RULES.oldYears) out.push({ key: "old", text: `${now - x.year}년 된 단지`, severity: "참고" });
  if (x.households && x.households < RISK_RULES.smallHouseholds) out.push({ key: "small", text: "세대수 적음", severity: "참고" });
  return out;
}

/** 비교 칸 하나의 리스크 목록 (기준가는 호가를 넣었으면 호가) */
export function risksFor(c: Complex, size: SizeOption, price: number): RiskItem[] {
  return riskSummary({
    trust: tradeTrust(size),
    jeonse: jeonseMetrics(size, price),
    recovery: peakRecovery(c, size, price),
    supply: supplyRisk(supplyOf(c)),
    hojaeGrades: nearbyHojae(c).map((h) => hojaeDetail(h).grade),
    year: c.year,
    households: c.households,
  });
}
