// 샘플 데이터입니다. 실제 수집(국토부 실거래가·단지 정보, 카카오 로컬) 결과가 나오면
// 같은 모양의 JSON으로 교체합니다. 가격 단위는 억 원입니다.

export type SizeOption = {
  area: number; // 전용면적 버킷 (㎡)
  pyeong: number;
  price: number; // 기준가 = 최근 3개월 실거래 평균 (억)
  trades: number; // 최근 3개월 거래 건수
};

export type Complex = {
  id: string;
  name: string;
  city: string; // 시
  district: string; // 구·동
  year: number; // 사용승인 연도
  households: number;
  lat: number;
  lng: number;
  stationMeters: number; // 가장 가까운 지하철역까지 거리
  gangnamMinutes: number; // 강남역까지 대중교통 시간
  growth: { y1: number; y3: number; y5: number; y10: number }; // 84㎡ 기준 상승률 (0.12 = 12%)
  sizes: SizeOption[];
  art: number; // 일러스트 모양 번호
};

export type Hojae = {
  id: string;
  category: "GTX" | "신규 노선" | "정비사업";
  badge: string;
  title: string;
  status: string;
  detail: string;
  lat: number;
  lng: number;
};

export const DATA_AS_OF = "2026.09";

export const complexes: Complex[] = [
  {
    id: "dongtan-lotte",
    name: "동탄역 롯데캐슬",
    city: "화성시",
    district: "오산동",
    year: 2021,
    households: 1940,
    lat: 37.2006,
    lng: 127.0968,
    stationMeters: 150,
    gangnamMinutes: 28,
    growth: { y1: 0.12, y3: 0.35, y5: 0.68, y10: 1.2 },
    sizes: [
      { area: 84, pyeong: 34, price: 8.9, trades: 11 },
      { area: 102, pyeong: 40, price: 11.2, trades: 3 },
    ],
    art: 0,
  },
  {
    id: "gwanggyo-hoban",
    name: "광교 호반써밋",
    city: "수원시",
    district: "영통구",
    year: 2019,
    households: 1214,
    lat: 37.2905,
    lng: 127.0512,
    stationMeters: 450,
    gangnamMinutes: 38,
    growth: { y1: 0.08, y3: 0.28, y5: 0.62, y10: 0.95 },
    sizes: [
      { area: 84, pyeong: 34, price: 10.5, trades: 7 },
      { area: 99, pyeong: 39, price: 12.4, trades: 2 },
    ],
    art: 1,
  },
  {
    id: "suwon-hillstate",
    name: "수원 힐스테이트",
    city: "수원시",
    district: "권선구",
    year: 2018,
    households: 2586,
    lat: 37.2585,
    lng: 126.9725,
    stationMeters: 700,
    gangnamMinutes: 55,
    growth: { y1: 0.06, y3: 0.22, y5: 0.48, y10: 0.78 },
    sizes: [
      { area: 59, pyeong: 25, price: 5.4, trades: 14 },
      { area: 84, pyeong: 34, price: 6.8, trades: 18 },
    ],
    art: 2,
  },
  {
    id: "dongtan-parkrio",
    name: "동탄 파크리오",
    city: "화성시",
    district: "동탄신도시",
    year: 2016,
    households: 1520,
    lat: 37.2048,
    lng: 127.0742,
    stationMeters: 900,
    gangnamMinutes: 42,
    growth: { y1: 0.07, y3: 0.2, y5: 0.51, y10: 0.88 },
    sizes: [
      { area: 59, pyeong: 25, price: 6.9, trades: 9 },
      { area: 84, pyeong: 34, price: 8.8, trades: 12 },
    ],
    art: 3,
  },
  {
    id: "gwanggyo-jungheung",
    name: "광교 중흥S클래스",
    city: "수원시",
    district: "영통구",
    year: 2019,
    households: 2231,
    lat: 37.2868,
    lng: 127.0575,
    stationMeters: 350,
    gangnamMinutes: 36,
    growth: { y1: 0.09, y3: 0.3, y5: 0.66, y10: 1.02 },
    sizes: [
      { area: 84, pyeong: 34, price: 9.1, trades: 10 },
      { area: 109, pyeong: 43, price: 13.1, trades: 2 },
    ],
    art: 4,
  },
  {
    id: "hillstate-gwanggyo",
    name: "힐스테이트 광교중앙역",
    city: "수원시",
    district: "영통구",
    year: 2019,
    households: 1100,
    lat: 37.2895,
    lng: 127.0471,
    stationMeters: 200,
    gangnamMinutes: 34,
    growth: { y1: 0.1, y3: 0.27, y5: 0.6, y10: 0.99 },
    sizes: [
      { area: 59, pyeong: 25, price: 7.0, trades: 6 },
      { area: 84, pyeong: 34, price: 8.7, trades: 8 },
    ],
    art: 5,
  },
  {
    id: "yeongtong-ipark",
    name: "영통 아이파크캐슬",
    city: "수원시",
    district: "영통구",
    year: 2020,
    households: 3149,
    lat: 37.2552,
    lng: 127.0746,
    stationMeters: 800,
    gangnamMinutes: 48,
    growth: { y1: 0.08, y3: 0.24, y5: 0.55, y10: 0.9 },
    sizes: [
      { area: 59, pyeong: 25, price: 7.1, trades: 13 },
      { area: 84, pyeong: 34, price: 8.9, trades: 15 },
    ],
    art: 6,
  },
  {
    id: "pangyo-prugio",
    name: "판교 푸르지오그랑블",
    city: "성남시",
    district: "분당구",
    year: 2011,
    households: 948,
    lat: 37.3946,
    lng: 127.1112,
    stationMeters: 300,
    gangnamMinutes: 18,
    growth: { y1: 0.1, y3: 0.18, y5: 0.46, y10: 1.1 },
    sizes: [
      { area: 84, pyeong: 34, price: 19.5, trades: 3 },
      { area: 117, pyeong: 46, price: 24.0, trades: 1 },
    ],
    art: 7,
  },
  {
    id: "bundang-parkview",
    name: "분당 파크뷰",
    city: "성남시",
    district: "분당구",
    year: 2004,
    households: 1829,
    lat: 37.3796,
    lng: 127.1148,
    stationMeters: 250,
    gangnamMinutes: 25,
    growth: { y1: 0.11, y3: 0.15, y5: 0.4, y10: 0.95 },
    sizes: [
      { area: 84, pyeong: 34, price: 16.2, trades: 5 },
      { area: 118, pyeong: 47, price: 21.0, trades: 2 },
    ],
    art: 1,
  },
  {
    id: "pyeongchon-thesharp",
    name: "평촌 더샵센트럴시티",
    city: "안양시",
    district: "동안구",
    year: 2016,
    households: 1459,
    lat: 37.3901,
    lng: 126.9605,
    stationMeters: 400,
    gangnamMinutes: 40,
    growth: { y1: 0.07, y3: 0.19, y5: 0.43, y10: 0.82 },
    sizes: [
      { area: 59, pyeong: 25, price: 8.6, trades: 7 },
      { area: 84, pyeong: 34, price: 10.8, trades: 9 },
    ],
    art: 2,
  },
  {
    id: "ilsan-kintex",
    name: "킨텍스 꿈에그린",
    city: "고양시",
    district: "일산서구",
    year: 2019,
    households: 1100,
    lat: 37.6682,
    lng: 126.7468,
    stationMeters: 600,
    gangnamMinutes: 62,
    growth: { y1: 0.05, y3: 0.12, y5: 0.35, y10: 0.6 },
    sizes: [
      { area: 84, pyeong: 34, price: 9.0, trades: 6 },
      { area: 99, pyeong: 39, price: 10.4, trades: 2 },
    ],
    art: 4,
  },
  {
    id: "misa-xi",
    name: "미사강변 센트럴자이",
    city: "하남시",
    district: "망월동",
    year: 2016,
    households: 1102,
    lat: 37.5615,
    lng: 127.1905,
    stationMeters: 650,
    gangnamMinutes: 45,
    growth: { y1: 0.09, y3: 0.21, y5: 0.5, y10: 0.92 },
    sizes: [
      { area: 84, pyeong: 34, price: 11.9, trades: 5 },
      { area: 97, pyeong: 38, price: 13.5, trades: 2 },
    ],
    art: 3,
  },
  {
    id: "gwacheon-raemian",
    name: "과천 래미안슈르",
    city: "과천시",
    district: "원문동",
    year: 2008,
    households: 2899,
    lat: 37.4292,
    lng: 126.9911,
    stationMeters: 350,
    gangnamMinutes: 30,
    growth: { y1: 0.13, y3: 0.25, y5: 0.58, y10: 1.3 },
    sizes: [
      { area: 59, pyeong: 25, price: 13.9, trades: 4 },
      { area: 84, pyeong: 34, price: 17.8, trades: 6 },
    ],
    art: 6,
  },
];

// 호재는 정형 데이터가 없어 직접 정리한 표로 시작합니다 (샘플, 일정은 확인 필요).
export const hojaeList: Hojae[] = [
  {
    id: "gtx-a-dongtan",
    category: "GTX",
    badge: "GTX-A",
    title: "GTX-A 동탄역 개통",
    status: "개통",
    detail: "수서~동탄 20분대, 삼성역 연결 예정",
    lat: 37.2003,
    lng: 127.0957,
  },
  {
    id: "gtx-c-suwon",
    category: "GTX",
    badge: "GTX-C",
    title: "GTX-C 수원역",
    status: "공사 중",
    detail: "수원~양주, 개통 목표 2028년",
    lat: 37.2663,
    lng: 127.0001,
  },
  {
    id: "sinbundang-homaesil",
    category: "신규 노선",
    badge: "신분당선",
    title: "신분당선 광교~호매실 연장",
    status: "계획",
    detail: "광교중앙~수원월드컵경기장~호매실",
    lat: 37.2866,
    lng: 127.045,
  },
  {
    id: "indeogwon-dongtan",
    category: "신규 노선",
    badge: "인덕원선",
    title: "인덕원~동탄선",
    status: "공사 중",
    detail: "평촌·광교·영통·동탄 연결",
    lat: 37.253,
    lng: 127.071,
  },
  {
    id: "dongtan-tram",
    category: "신규 노선",
    badge: "트램",
    title: "동탄 도시철도(트램)",
    status: "계획",
    detail: "동탄역 중심 순환 노선",
    lat: 37.205,
    lng: 127.078,
  },
  {
    id: "bundang-rebuild",
    category: "정비사업",
    badge: "재건축",
    title: "분당 1기 신도시 재건축",
    status: "진행",
    detail: "선도지구 지정, 정비계획 수립 중",
    lat: 37.3786,
    lng: 127.1182,
  },
  {
    id: "pyeongchon-rebuild",
    category: "정비사업",
    badge: "재건축",
    title: "평촌 1기 신도시 재건축",
    status: "진행",
    detail: "선도지구 지정, 정비계획 수립 중",
    lat: 37.3906,
    lng: 126.958,
  },
];

export const regions = ["경기도 전체", ...Array.from(new Set(complexes.map((c) => c.city)))];
