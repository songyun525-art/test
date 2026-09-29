// 2단계 · 리스크 요약 (단지마다 주의할 점). 1단계 지표와 단지 정보로 판정하고, 입주물량·호재 등급은 데이터가 붙으면 반영됩니다.
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
  if (x.supply.status === "ok" && x.supply.level === "높음") out.push({ key: "highSupply", text: "주변 입주물량 많음", severity: "주의" });
  if (x.recovery.status === "ok" && x.recovery.recovery > RISK_RULES.overheatedRecovery)
    out.push({ key: "overheated", text: "10년 고점보다 크게 오른 가격", severity: "참고" });
  if (x.hojaeGrades.length && x.hojaeGrades.every((g) => g === "C" || g === "D"))
    out.push({ key: "weakHojae", text: "주변 호재가 계획 단계", severity: "참고" });
  if (now - x.year > RISK_RULES.oldYears) out.push({ key: "old", text: `${now - x.year}년 된 단지`, severity: "참고" });
  if (x.households && x.households < RISK_RULES.smallHouseholds) out.push({ key: "small", text: "세대수 적음", severity: "참고" });
  return out;
}
