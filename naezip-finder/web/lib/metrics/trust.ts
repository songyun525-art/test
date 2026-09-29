// 1단계 · 거래 신뢰도 (기준가가 얼마나 믿을 만한지)
import type { SizeOption } from "../data";
import type { TradeTrust } from "./types";

/**
 * 최근 3개월 5건 이상: 높음 / 3개월 1~4건: 보통 / 3개월 0건이라 6·12개월로 넓혔으면: 낮음.
 * 기준가 산정 규칙(3→6→12개월 중위가)은 수집기 collector/build_db.py 와 같습니다.
 */
export function tradeTrust(size: SizeOption): TradeTrust {
  const { refMonths: months, refCount: count, lastDeal } = size;
  const detail = months ? `최근 ${months}개월 ${count}건` : "최근 12개월 거래 없음";
  if (!months || !count) return { level: null, tone: "none", months, count, lastDeal, label: "거래 없음", detail, caution: "가격 해석 주의" };
  if (months === 3 && count >= 5) return { level: "높음", tone: "good", months, count, lastDeal, label: "거래 신뢰도 높음", detail, caution: "" };
  if (months === 3) return { level: "보통", tone: "normal", months, count, lastDeal, label: "거래 신뢰도 보통", detail, caution: "" };
  return { level: "낮음", tone: "warn", months, count, lastDeal, label: "거래 신뢰도 낮음", detail, caution: "가격 해석 주의" };
}

/** "2026-09-22" → "2026.09.22" */
export const dateText = (d: string) => (d ? d.replaceAll("-", ".") : "–");
