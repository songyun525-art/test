import { complexes, hojaeList, IS_SAMPLE, type Complex, type Hojae } from "./data";

export type ScoreKey = "location" | "growth" | "households" | "age" | "hojae";

export const SCORE_ITEMS: { key: ScoreKey; label: string; help: string }[] = [
  { key: "location", label: "입지", help: "가장 가까운 지하철역 거리와 강남역까지 대중교통 시간" },
  { key: "growth", label: "상승률", help: "1·3·5·10년 상승률 (가중 20·30·30·20%)을 비교 단지 안에서 백분위로" },
  { key: "households", label: "세대수", help: "로그 스케일, 3,000세대 이상이면 만점" },
  { key: "age", label: "연식", help: "신축일수록 높고, 30년 이상은 재건축 가능성으로 가점" },
  { key: "hojae", label: "호재", help: "반경 3km 안의 GTX·신규 노선·정비사업" },
];

export type Weights = Record<ScoreKey, number>;
export const DEFAULT_WEIGHTS: Weights = { location: 30, growth: 25, households: 15, age: 15, hojae: 15 };

const CURRENT_YEAR = 2026;
const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function nearbyHojae(c: Complex, radiusKm = 3): Hojae[] {
  return hojaeList.filter((h) => distanceKm(c.lat, c.lng, h.lat, h.lng) <= radiusKm);
}

export function complexesNear(h: Hojae, radiusKm = 3): Complex[] {
  return complexes.filter((c) => distanceKm(c.lat, c.lng, h.lat, h.lng) <= radiusKm);
}

function percentile(values: number[], v: number) {
  const below = values.filter((x) => x < v).length;
  const equal = values.filter((x) => x === v).length;
  return ((below + equal / 2) / values.length) * 100;
}

const fin = (v: number) => (Number.isFinite(v) ? v : 0);
const growthIndex = (c: Complex) =>
  fin(c.growth.y1) * 0.2 + fin(c.growth.y3) * 0.3 + fin(c.growth.y5) * 0.3 + (fin(c.growth.y10) / 2) * 0.2;
const allGrowth = complexes.map(growthIndex);

const HOJAE_POINTS: Record<Hojae["category"], number> = { GTX: 25, "신규 노선": 15, "정비·개발": 10, 일자리: 10 };
const STATUS_FACTOR: Record<Hojae["status"], number> = { 개통: 1, "공사 중": 0.9, "진행 중": 0.7, 계획: 0.5 };

export function subScores(c: Complex): Record<ScoreKey, number> {
  const station = 100 - Math.min(c.stationMeters, 1500) / 15;
  const commute = 100 - Math.max(0, c.gangnamMinutes - 15) * 1.4;
  const age = CURRENT_YEAR - c.year;
  const hojae = nearbyHojae(c).reduce((s, h) => s + HOJAE_POINTS[h.category] * STATUS_FACTOR[h.status], 50);
  return {
    location: Math.round(clamp(station * 0.5 + commute * 0.5)),
    growth: Math.round(clamp(30 + percentile(allGrowth, growthIndex(c)) * 0.7)),
    // 세대수 정보가 없는 단지는 중간값(50)으로 둡니다.
    households: c.households ? Math.round(clamp((100 * Math.log10(c.households / 50)) / Math.log10(3000 / 50))) : 50,
    age: Math.round(clamp(100 - age * 3.5 + (age >= 30 ? 15 : 0))),
    hojae: Math.round(clamp(hojae)),
  };
}

const subCache = new Map<string, Record<ScoreKey, number>>();
function cachedSub(c: Complex) {
  let s = subCache.get(c.id);
  if (!s) subCache.set(c.id, (s = subScores(c)));
  return s;
}

export function totalScore(c: Complex, w: Weights = DEFAULT_WEIGHTS) {
  const s = cachedSub(c);
  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  return Math.round(SCORE_ITEMS.reduce((acc, { key }) => acc + s[key] * w[key], 0) / sum);
}

// 경기도 단지 전체 안에서 상위 몇 %인지
const totalsCache = new Map<string, number[]>();
export function topPercent(c: Complex, w: Weights = DEFAULT_WEIGHTS) {
  const key = JSON.stringify(w);
  let totals = totalsCache.get(key);
  if (!totals) {
    if (totalsCache.size > 20) totalsCache.clear();
    totalsCache.set(key, (totals = complexes.map((x) => totalScore(x, w))));
  }
  const mine = totalScore(c, w);
  const better = totals.filter((t) => t > mine).length;
  return Math.max(1, Math.round(((better + 1) / totals.length) * 100));
}

// 연 단위 가격 추이 (분기별 점). 상승률 기준점 사이를 로그 보간하고 약간의 흔들림을 넣습니다.
export function priceHistory(c: Complex, price: number) {
  // 과거 거래가 없어 상승률을 모르는 시점은 건너뜁니다.
  const anchors = ([
    [-10, price / (1 + c.growth.y10)],
    [-5, price / (1 + c.growth.y5)],
    [-3, price / (1 + c.growth.y3)],
    [-1, price / (1 + c.growth.y1)],
    [0, price],
  ] as [number, number][]).filter(([, p]) => Number.isFinite(p));
  if (anchors.length === 1) anchors.unshift([-10, price]);
  const points: { t: number; price: number }[] = [];
  for (let q = -40; q <= 0; q++) {
    const t = q / 4;
    if (t < anchors[0][0]) {
      points.push({ t, price: NaN }); // 첫 기록보다 앞선 구간은 비워 둡니다
      continue;
    }
    let i = 0;
    while (i < anchors.length - 2 && t > anchors[i + 1][0]) i++;
    const [t0, p0] = anchors[i];
    const [t1, p1] = anchors[i + 1];
    const f = (t - t0) / (t1 - t0);
    const base = Math.exp(Math.log(p0) + (Math.log(p1) - Math.log(p0)) * f);
    // 샘플에서만 분기별 흔들림을 넣습니다. 실제 데이터는 기준점 사이를 매끄럽게 잇습니다.
    const wiggle = q === 0 || !IS_SAMPLE ? 0 : Math.sin(q * 1.7 + c.art) * 0.025 + Math.sin(q * 0.6 + c.lat) * 0.02;
    points.push({ t, price: base * (1 + wiggle) });
  }
  return points;
}

export type Recommendation = { complex: Complex; area: number; pyeong: number; price: number; diff: number };

export function recommend(basePrice: number, excludeIds: string[], region: string, w: Weights) {
  const out: Recommendation[] = [];
  for (const c of complexes) {
    if (excludeIds.includes(c.id)) continue;
    if (region !== "경기도 전체" && c.city !== region) continue;
    for (const s of c.sizes) {
      const diff = (s.price - basePrice) / basePrice;
      if (Math.abs(diff) <= 0.05) out.push({ complex: c, area: s.area, pyeong: s.pyeong, price: s.price, diff });
    }
  }
  return out.sort((a, b) => totalScore(b.complex, w) - totalScore(a.complex, w));
}

export const formatEok = (v: number) => (Number.isFinite(v) ? `${v.toFixed(1)}억` : "–");
export const pct = (v: number) => (Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${Math.round(v * 100)}%` : "–");
/** 상승·하락 색 (값이 없으면 색 없음) */
export const chgClass = (v: number) => (!Number.isFinite(v) ? "chg" : v >= 0 ? "chg up" : "chg down");
/** 정렬용: 값이 없으면 맨 뒤로 */
export const orLow = (v: number) => (Number.isFinite(v) ? v : -Infinity);

// 전용면적 버킷: 58·52·53㎡처럼 애매한 평수는 59로, 76~94㎡는 84로 봅니다.
export type Bucket = "59" | "84" | "기타";
export function bucketOf(area: number): Bucket {
  if (area >= 45 && area < 70) return "59";
  if (area >= 70 && area < 95) return "84";
  return "기타";
}

export const sizeLabel = (area: number, pyeong: number) => `전용 ${area}㎡ (${pyeong}평)`;
