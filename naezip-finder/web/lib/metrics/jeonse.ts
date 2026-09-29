// 1단계 · 전세가율 / 매매-전세 갭
import type { SizeOption } from "../data";
import type { JeonseLevel, JeonseMetrics, Tone } from "./types";

/** 전세가율 구간: 70% 이상 높음(실수요 탄탄), 50~70% 보통, 50% 미만 낮음 */
export const JEONSE_LEVELS: { min: number; level: JeonseLevel; tone: Tone }[] = [
  { min: 0.7, level: "높음", tone: "good" },
  { min: 0.5, level: "보통", tone: "normal" },
  { min: 0, level: "낮음", tone: "warn" },
];

/**
 * 전세가율 = 최근 전세가 / 기준가, 갭 = 기준가 - 최근 전세가.
 * basePrice 는 비교 칸의 기준가(호가를 직접 넣었으면 그 값)입니다.
 */
export function jeonseMetrics(size: SizeOption, basePrice: number): JeonseMetrics {
  const j = size.jeonse;
  if (!j || !(basePrice > 0)) return { status: "missing", label: "전세 데이터 부족" };
  const ratio = j.price / basePrice;
  const band = JEONSE_LEVELS.find((b) => ratio >= b.min)!;
  return { status: "ok", price: j.price, ratio, gap: basePrice - j.price, y1: j.y1, level: band.level, tone: band.tone, isSample: j.isSample };
}

/** "72%" */
export const ratioText = (v: number) => `${Math.round(v * 100)}%`;
