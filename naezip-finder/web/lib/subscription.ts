// 청약(분양) 정보. 지금은 샘플이며, 실제로는 한국부동산원 청약홈 분양정보 API(공공데이터포털)로 채웁니다.
import { complexes } from "./data";
import { bucketOf, distanceKm } from "./score";

export type SubType = "민영" | "공공분양" | "신혼희망타운";

export type Subscription = {
  id: string;
  name: string;
  city: string;
  district: string;
  type: SubType;
  households: number;
  sizes: { area: number; price: number }[]; // 분양가 (억)
  announce: string; // 모집공고일
  applyStart: string; // 1순위 접수 시작
  applyEnd: string;
  winners: string; // 당첨자 발표
  lat: number;
  lng: number;
  cutline?: number; // 84㎡ 기준 최저 당첨 가점 (발표 후)
  competition?: number; // 1순위 평균 경쟁률 (발표 후)
};

export const TODAY = "2026-09-28";

export const subscriptions: Subscription[] = [
  { id: "s1", name: "동탄2 C-15블록 (샘플)", city: "화성시", district: "동탄2신도시", type: "민영", households: 842, sizes: [{ area: 59, price: 5.9 }, { area: 84, price: 7.6 }], announce: "2026-09-18", applyStart: "2026-09-28", applyEnd: "2026-09-30", winners: "2026-10-08", lat: 37.195, lng: 127.105 },
  { id: "s2", name: "광교 A17블록 (샘플)", city: "수원시", district: "영통구", type: "민영", households: 516, sizes: [{ area: 84, price: 9.4 }, { area: 101, price: 11.3 }], announce: "2026-09-11", applyStart: "2026-09-22", applyEnd: "2026-09-24", winners: "2026-10-01", lat: 37.292, lng: 127.058 },
  { id: "s3", name: "과천지식정보타운 S3 (샘플)", city: "과천시", district: "갈현동", type: "민영", households: 675, sizes: [{ area: 59, price: 8.7 }, { area: 84, price: 11.2 }], announce: "2026-10-02", applyStart: "2026-10-13", applyEnd: "2026-10-15", winners: "2026-10-22", lat: 37.418, lng: 126.99 },
  { id: "s4", name: "하남교산 A2 공공분양 (샘플)", city: "하남시", district: "교산동", type: "공공분양", households: 1115, sizes: [{ area: 59, price: 5.2 }, { area: 84, price: 6.9 }], announce: "2026-10-06", applyStart: "2026-10-20", applyEnd: "2026-10-22", winners: "2026-11-05", lat: 37.523, lng: 127.215 },
  { id: "s5", name: "남양주왕숙 B-3 신혼희망타운 (샘플)", city: "남양주시", district: "진접읍", type: "신혼희망타운", households: 630, sizes: [{ area: 55, price: 3.6 }], announce: "2026-10-16", applyStart: "2026-10-27", applyEnd: "2026-10-29", winners: "2026-11-12", lat: 37.615, lng: 127.18 },
  { id: "s6", name: "광명 철산 재건축 일반분양 (샘플)", city: "광명시", district: "철산동", type: "민영", households: 412, sizes: [{ area: 59, price: 9.1 }, { area: 84, price: 11.9 }], announce: "2026-08-21", applyStart: "2026-09-01", applyEnd: "2026-09-03", winners: "2026-09-10", lat: 37.472, lng: 126.873, cutline: 64, competition: 48.2 },
  { id: "s7", name: "용인 수지 풍덕천 (샘플)", city: "용인시", district: "수지구", type: "민영", households: 368, sizes: [{ area: 84, price: 8.8 }], announce: "2026-08-07", applyStart: "2026-08-18", applyEnd: "2026-08-20", winners: "2026-08-27", lat: 37.321, lng: 127.093, cutline: 49, competition: 11.6 },
  { id: "s8", name: "평택 고덕 A-49 (샘플)", city: "평택시", district: "고덕동", type: "민영", households: 954, sizes: [{ area: 59, price: 3.9 }, { area: 84, price: 4.9 }], announce: "2026-07-24", applyStart: "2026-08-04", applyEnd: "2026-08-06", winners: "2026-08-13", lat: 37.045, lng: 127.05, cutline: 23, competition: 2.1 },
];

export type SubStatus = "접수 중" | "접수 예정" | "발표 대기" | "발표 완료";

export function statusOf(s: Subscription, today = TODAY): SubStatus {
  if (today < s.applyStart) return "접수 예정";
  if (today <= s.applyEnd) return "접수 중";
  if (today < s.winners) return "발표 대기";
  return "발표 완료";
}

export function daysUntil(date: string, today = TODAY) {
  return Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
}

// 가까운 기존 단지(5km 안)의 같은 평형 실거래 평균과 분양가 비교
export function marketCompare(s: Subscription, area: number) {
  const bucket = bucketOf(area);
  const near = complexes
    .map((c) => ({ c, d: distanceKm(s.lat, s.lng, c.lat, c.lng), size: c.sizes.find((z) => bucketOf(z.area) === bucket) }))
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
