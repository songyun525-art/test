// 1단계 · 고점 대비 회복률
import { IS_SAMPLE, type Complex, type SizeOption } from "../data";
import { priceHistory } from "../score";
import type { PeakData, PeakRecovery, RecoveryStatus, Tone } from "./types";

export const RECOVERY_HELP = "고점 대비 회복률은 과거 최고가 대비 현재 가격이 어느 정도 회복했는지 보여주는 참고 지표입니다.";

/** 최근 10년 최고가. 샘플 데이터에는 실제 분기 거래가 없어 가격 추이 곡선의 최고점을 씁니다. */
export function peakOf(c: Complex, size: SizeOption): PeakData | null {
  if (size.peak) return size.peak;
  if (!IS_SAMPLE) return null;
  const pts = priceHistory(c, size.price).filter((p) => Number.isFinite(p.price));
  if (!pts.length) return null;
  const top = pts.reduce((a, b) => (b.price > a.price ? b : a));
  const q = 2026 * 4 + 2 + Math.round(top.t * 4); // 마지막 점 = 2026년 3분기 (PriceChart 와 같음)
  return { price: top.price, quarter: `${Math.floor(q / 4)}-${(q % 4) + 1}`, isSample: true };
}

const STAGES: { min: number; stage: RecoveryStatus; tone: Tone }[] = [
  { min: 1, stage: "전고점 돌파", tone: "good" },
  { min: 0.95, stage: "고점 근접", tone: "good" },
  { min: 0.8, stage: "회복 중", tone: "normal" },
  { min: 0, stage: "크게 하락", tone: "warn" },
];

/**
 * 고점 대비 하락률 = (현재 기준가 - 10년 최고가) / 10년 최고가
 * 고점 대비 회복률 = 현재 기준가 / 10년 최고가
 * current 는 비교 칸의 기준가(호가를 넣었으면 호가)입니다.
 */
export function peakRecovery(c: Complex, size: SizeOption, current: number): PeakRecovery {
  const peak = peakOf(c, size);
  if (!peak || !(current > 0)) return { status: "missing" };
  const top = peak.price;
  // 기준가가 기록된 최고가보다 높으면 회복률이 100%를 넘고 "전고점 돌파"로 봅니다.
  const recovery = current / top;
  const band = STAGES.find((s) => recovery >= s.min)!;
  return {
    status: "ok",
    peak: top,
    peakWhen: quarterText(peak.quarter),
    current,
    drawdown: (current - top) / top,
    recovery,
    stage: band.stage,
    tone: band.tone,
    isSample: !!peak.isSample,
  };
}

/** "2021-3" → "2021년 3분기" */
export const quarterText = (q: string) => {
  const [y, n] = q.split("-");
  return y && n ? `${y}년 ${n}분기` : "–";
};
