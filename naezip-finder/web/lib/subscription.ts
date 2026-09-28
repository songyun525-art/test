// 청약(분양) 정보. scripts/fetch-subscriptions.mjs 가 청약홈 분양정보 API(한국부동산원)에서 받은
// 경기도 공고를 lib/subscriptions.json 으로 저장하고, 화면은 그 파일을 읽습니다.
import raw from "./subscriptions.json";
import { complexes } from "./data";
import { bucketOf, distanceKm } from "./score";

export type SubType = "민영" | "공공분양" | "신혼희망타운";

export type Subscription = {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  type: SubType;
  households: number;
  sizes: { area: number; price: number }[]; // 주택형별 최고 분양가 (억)
  announce: string; // 모집공고일
  applyStart: string; // 청약 접수 시작 (특별공급 포함)
  applyEnd: string;
  winners: string; // 당첨자 발표
  moveIn: string | null; // 입주 예정
  regulated: boolean; // 투기과열·조정대상
  priceCap: boolean; // 분양가상한제
  url: string;
  lat: number | null;
  lng: number | null;
  competition: number | null; // 대표 평형 1순위 경쟁률
  cutline: number | null; // 대표 평형 해당지역 최저 당첨 가점
};

export const DATA_FETCHED_AT: string = raw.fetchedAt;
export const subscriptions = raw.items as Subscription[];

export type SubStatus = "접수 중" | "접수 예정" | "발표 대기" | "발표 완료";

export function statusOf(s: Subscription, today: string): SubStatus {
  if (today < s.applyStart) return "접수 예정";
  if (today <= s.applyEnd) return "접수 중";
  if (today < s.winners) return "발표 대기";
  return "발표 완료";
}

export function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
}

// 가까운 기존 단지(5km 안)의 같은 평형 실거래 평균과 분양가 비교
export function marketCompare(s: Subscription, area: number) {
  if (s.lat === null || s.lng === null) return null;
  const bucket = bucketOf(area);
  const near = complexes
    .map((c) => ({ c, d: distanceKm(s.lat!, s.lng!, c.lat, c.lng), size: c.sizes.find((z) => bucketOf(z.area) === bucket) }))
    .filter((x) => x.size && x.d <= 5)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  if (!near.length) return null;
  const avg = near.reduce((t, x) => t + x.size!.price, 0) / near.length;
  return { avg, names: near.map((x) => x.c.name) };
}

// 청약 가점 (84점 만점): 무주택기간 32 + 부양가족 35 + 청약통장 가입기간 17
export type GajeomInput = { homelessYears: number; dependents: number; accountYears: number };

export function gajeom({ homelessYears, dependents, accountYears }: GajeomInput) {
  const homeless = homelessYears < 1 ? 2 : Math.min(32, 2 + Math.floor(homelessYears) * 2);
  const family = Math.min(35, 5 + Math.floor(dependents) * 5);
  const account = accountYears < 0.5 ? 1 : accountYears < 1 ? 2 : Math.min(17, 2 + Math.floor(accountYears));
  return { homeless, family, account, total: homeless + family + account };
}
