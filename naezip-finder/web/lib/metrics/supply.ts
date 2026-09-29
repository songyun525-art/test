// 2단계 · 입주물량 리스크. 입주 예정 단지는 scripts/fetch-supply.py 가 청약홈 분양정보에서 모은 lib/supply.json 을 씁니다.
import raw from "../supply.json";
import type { Complex } from "../data";
import { distanceKm } from "../score";
import type { SupplyData, SupplyRisk, SupplyRiskLevel, Tone } from "./types";

type Item = { name: string; city: string; households: number; moveIn: string; lat: number | null; lng: number | null };
const SUPPLY = raw as { asOf: string; source: string; items: Item[] };

export const SUPPLY_SOURCE = "청약홈 분양정보의 일반분양 공급 세대수 기준이라 조합원·임대 물량은 빠져 실제보다 적을 수 있습니다.";

/** 임시 기준: 반경 3km 3년 입주 예정 1,000세대 미만 낮음, 1,000~4,999 보통, 5,000 이상 높음 */
export const SUPPLY_LEVELS: { min: number; level: SupplyRiskLevel; tone: Tone }[] = [
  { min: 5000, level: "높음", tone: "warn" },
  { min: 1000, level: "보통", tone: "normal" },
  { min: 0, level: "낮음", tone: "good" },
];

const RADIUS_KM = 3;
// asOf 기준 1년 뒤 달 ("2027-09")
const oneYear = (() => {
  const [y, m] = SUPPLY.asOf.split("-");
  return `${Number(y) + 1}-${m}`;
})();
const byCity = new Map<string, number>();
for (const it of SUPPLY.items) byCity.set(it.city, (byCity.get(it.city) ?? 0) + it.households);

const cache = new Map<string, SupplyData | null>();

/** 단지 주변 입주 예정 물량 (데이터가 없으면 null → "입주물량 데이터 준비 중") */
export function supplyOf(c: Complex): SupplyData | null {
  if (!SUPPLY.items.length || !c.lat) return null;
  let d = cache.get(c.id);
  if (d !== undefined) return d;
  const nearby = SUPPLY.items
    .filter((it) => it.lat != null && it.lng != null)
    .map((it) => ({ name: it.name, households: it.households, moveIn: it.moveIn, km: distanceKm(c.lat, c.lng, it.lat!, it.lng!) }))
    .filter((it) => it.km <= RADIUS_KM)
    .sort((a, b) => b.households - a.households);
  d = {
    within3km1y: nearby.filter((it) => it.moveIn < oneYear).reduce((s, it) => s + it.households, 0),
    within3km3y: nearby.reduce((s, it) => s + it.households, 0),
    sgg3y: byCity.get(c.city) ?? 0,
    asOf: SUPPLY.asOf,
    nearby,
  };
  cache.set(c.id, d);
  return d;
}

export function supplyRisk(data: SupplyData | null): SupplyRisk {
  if (!data) return { status: "missing", label: "입주물량 데이터 준비 중" };
  const band = SUPPLY_LEVELS.find((b) => data.within3km3y >= b.min)!;
  return { status: "ok", level: band.level, tone: band.tone, data, detail: `반경 3km 내 3년간 ${data.within3km3y.toLocaleString()}세대 입주 예정` };
}
