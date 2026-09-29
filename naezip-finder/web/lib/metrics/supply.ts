// 2단계 · 입주물량 리스크 (데이터 구조와 판정 함수만. 입주 예정 단지 데이터를 붙이면 supplyOf 를 채웁니다)
import type { Complex } from "../data";
import type { SupplyData, SupplyRisk, SupplyRiskLevel, Tone } from "./types";

/** 임시 기준: 반경 3km 3년 입주 예정 1,000세대 미만 낮음, 1,000~4,999 보통, 5,000 이상 높음 */
export const SUPPLY_LEVELS: { min: number; level: SupplyRiskLevel; tone: Tone }[] = [
  { min: 5000, level: "높음", tone: "warn" },
  { min: 1000, level: "보통", tone: "normal" },
  { min: 0, level: "낮음", tone: "good" },
];

/** 단지 주변 입주 예정 물량. 아직 데이터가 없어 null ("입주물량 데이터 준비 중")을 돌려줍니다. */
export function supplyOf(_c: Complex): SupplyData | null {
  return null;
}

export function supplyRisk(data: SupplyData | null): SupplyRisk {
  if (!data) return { status: "missing", label: "입주물량 데이터 준비 중" };
  const band = SUPPLY_LEVELS.find((b) => data.within3km3y >= b.min)!;
  return { status: "ok", level: band.level, tone: band.tone, data, detail: `반경 3km 내 3년간 ${data.within3km3y.toLocaleString()}세대 입주 예정` };
}
