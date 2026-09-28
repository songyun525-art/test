// 단지 숫자는 샘플입니다. 실제 수집(국토부 실거래가·단지 정보, 카카오 로컬) 결과가 나오면
// 같은 모양의 JSON으로 교체합니다. 가격 단위는 억 원입니다.

export type SizeOption = {
  area: number; // 전용면적 (㎡). 화면에서는 59/84/기타 버킷으로 묶습니다.
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
  far: number; // 용적률 (%)
  lat: number;
  lng: number;
  stationMeters: number; // 가장 가까운 지하철역까지 거리
  schoolMeters: number; // 가장 가까운 초등학교까지 거리
  gangnamMinutes: number; // 강남역까지 대중교통 시간
  growth: { y1: number; y3: number; y5: number; y10: number }; // 상승률 (0.12 = 12%)
  sizes: SizeOption[];
  art: number; // 일러스트 모양 번호
};

export type HojaeCategory = "GTX" | "신규 노선" | "정비·개발" | "일자리";

export type Hojae = {
  id: string;
  category: HojaeCategory;
  badge: string;
  title: string;
  status: "개통" | "공사 중" | "계획" | "진행 중";
  detail: string;
  lat: number;
  lng: number;
};

export const DATA_AS_OF = "2026.09";

type Row = [
  id: string, name: string, city: string, district: string, year: number, households: number, far: number,
  lat: number, lng: number, stationMeters: number, schoolMeters: number, gangnamMinutes: number,
  growth: [number, number, number, number], sizes: [number, number, number, number][], art: number,
];

const ROWS: Row[] = [
  ["dongtan-lotte", "동탄역 롯데캐슬", "화성시", "오산동", 2021, 1940, 299, 37.2006, 127.0968, 150, 400, 28, [0.12, 0.35, 0.68, 1.2], [[84, 34, 8.9, 11], [102, 40, 11.2, 3]], 0],
  ["gwanggyo-hoban", "광교 호반써밋", "수원시", "영통구", 2019, 1214, 240, 37.2905, 127.0512, 450, 350, 38, [0.08, 0.28, 0.62, 0.95], [[59, 25, 8.4, 4], [84, 34, 10.5, 7], [99, 39, 12.4, 2]], 1],
  ["suwon-hillstate", "수원 힐스테이트", "수원시", "권선구", 2018, 2586, 249, 37.2585, 126.9725, 700, 250, 55, [0.06, 0.22, 0.48, 0.78], [[59, 25, 5.4, 14], [84, 34, 6.8, 18]], 2],
  ["dongtan-parkrio", "동탄 파크리오", "화성시", "동탄신도시", 2016, 1520, 210, 37.2048, 127.0742, 900, 300, 42, [0.07, 0.2, 0.51, 0.88], [[59, 25, 6.9, 9], [84, 34, 8.8, 12]], 3],
  ["gwanggyo-jungheung", "광교 중흥S클래스", "수원시", "영통구", 2019, 2231, 460, 37.2868, 127.0575, 350, 500, 36, [0.09, 0.3, 0.66, 1.02], [[84, 34, 9.1, 10], [109, 43, 13.1, 2]], 4],
  ["hillstate-gwanggyo", "힐스테이트 광교중앙역", "수원시", "영통구", 2019, 1100, 220, 37.2895, 127.0471, 200, 450, 34, [0.1, 0.27, 0.6, 0.99], [[59, 25, 7.0, 6], [84, 34, 8.7, 8]], 5],
  ["yeongtong-ipark", "영통 아이파크캐슬", "수원시", "영통구", 2020, 3149, 280, 37.2552, 127.0746, 800, 200, 48, [0.08, 0.24, 0.55, 0.9], [[59, 25, 7.1, 13], [84, 34, 8.9, 15]], 6],
  ["yeongtong-byeokjeok", "영통 벽적골", "수원시", "영통구", 1997, 2154, 180, 37.2506, 127.0707, 650, 300, 52, [-0.03, -0.08, 0.3, 0.55], [[59, 25, 4.5, 12], [84, 34, 5.9, 9]], 7],
  ["pangyo-prugio", "판교 푸르지오그랑블", "성남시", "분당구", 2011, 948, 209, 37.3946, 127.1112, 300, 400, 18, [0.1, 0.18, 0.46, 1.1], [[84, 34, 19.5, 3], [117, 46, 24.0, 1]], 7],
  ["bundang-parkview", "분당 파크뷰", "성남시", "분당구", 2004, 1829, 330, 37.3796, 127.1148, 250, 300, 25, [0.11, 0.15, 0.4, 0.95], [[84, 34, 16.2, 5], [118, 47, 21.0, 2]], 1],
  ["pyeongchon-thesharp", "평촌 더샵센트럴시티", "안양시", "동안구", 2016, 1459, 280, 37.3901, 126.9605, 400, 300, 40, [-0.01, 0.19, 0.43, 0.82], [[59, 25, 8.6, 7], [84, 34, 10.8, 9]], 2],
  ["sanbon-raemian", "산본 래미안하이어스", "군포시", "산본동", 2010, 2644, 250, 37.3603, 126.9311, 500, 250, 50, [-0.02, 0.05, 0.36, 0.7], [[53, 23, 5.6, 8], [84, 34, 7.9, 10]], 4],
  ["ilsan-kintex", "킨텍스 꿈에그린", "고양시", "일산서구", 2019, 1100, 790, 37.6682, 126.7468, 600, 700, 62, [-0.03, 0.12, 0.35, 0.6], [[84, 34, 9.0, 6], [99, 39, 10.4, 2]], 4],
  ["gimpo-metroxi", "한강메트로자이", "김포시", "걸포동", 2020, 4229, 230, 37.6334, 126.7053, 300, 400, 70, [-0.04, -0.06, 0.28, 0.45], [[59, 25, 4.3, 16], [84, 34, 5.4, 21]], 3],
  ["bucheon-jungdong", "중동 센트럴파크푸르지오", "부천시", "중동", 2016, 999, 720, 37.5035, 126.7651, 350, 450, 55, [0.01, 0.08, 0.38, 0.72], [[59, 25, 6.6, 6], [84, 34, 8.4, 8]], 5],
  ["gwangmyeong-xi", "철산 자이더헤리티지", "광명시", "철산동", 2025, 3804, 297, 37.4758, 126.8688, 300, 350, 38, [0.15, 0.3, 0.55, 0.9], [[59, 25, 10.5, 9], [84, 34, 13.0, 11]], 0],
  ["misa-xi", "미사강변 센트럴자이", "하남시", "망월동", 2016, 1102, 210, 37.5615, 127.1905, 650, 300, 45, [0.09, 0.21, 0.5, 0.92], [[59, 25, 9.4, 5], [84, 34, 11.9, 5]], 3],
  ["guri-inchang", "구리 e편한세상인창어반포레", "구리시", "인창동", 2020, 1115, 250, 37.6059, 127.1406, 450, 300, 42, [0.03, 0.1, 0.42, 0.75], [[59, 25, 6.4, 7], [84, 34, 8.2, 9]], 6],
  ["dasan-xi", "다산 자연앤e편한세상", "남양주시", "다산동", 2018, 1615, 200, 37.6157, 127.1581, 900, 250, 50, [-0.01, 0.04, 0.4, 0.7], [[59, 25, 6.7, 8], [84, 34, 8.3, 10]], 2],
  ["seongbok-lotte", "성복역 롯데캐슬골드타운", "용인시", "수지구", 2019, 2356, 240, 37.3135, 127.0795, 200, 400, 40, [0.04, -0.02, 0.35, 0.7], [[59, 25, 8.1, 9], [84, 34, 10.2, 12]], 5],
  ["gwacheon-raemian", "과천 래미안슈르", "과천시", "원문동", 2008, 2899, 220, 37.4292, 126.9911, 350, 300, 30, [0.13, 0.25, 0.58, 1.3], [[59, 25, 13.9, 4], [84, 34, 17.8, 6]], 6],
];

export const complexes: Complex[] = ROWS.map(
  ([id, name, city, district, year, households, far, lat, lng, stationMeters, schoolMeters, gangnamMinutes, g, sizes, art]) => ({
    id, name, city, district, year, households, far, lat, lng, stationMeters, schoolMeters, gangnamMinutes,
    growth: { y1: g[0], y3: g[1], y5: g[2], y10: g[3] },
    sizes: sizes.map(([area, pyeong, price, trades]) => ({ area, pyeong, price, trades })),
    art,
  }),
);

// 경기도 주요 호재. 공개된 계획을 정리한 것이며 일정은 바뀔 수 있습니다.
export const hojaeList: Hojae[] = [
  { id: "gtx-a-dongtan", category: "GTX", badge: "GTX-A", title: "GTX-A 동탄역", status: "개통", detail: "수서~동탄 운행 중, 삼성역 연결 후 서울 도심 직결", lat: 37.2003, lng: 127.0957 },
  { id: "gtx-a-guseong", category: "GTX", badge: "GTX-A", title: "GTX-A 구성역 (용인)", status: "개통", detail: "수서까지 10분대", lat: 37.299, lng: 127.1057 },
  { id: "gtx-a-seongnam", category: "GTX", badge: "GTX-A", title: "GTX-A 성남역 (분당)", status: "개통", detail: "판교·분당에서 수서 한 정거장", lat: 37.3945, lng: 127.1215 },
  { id: "gtx-a-kintex", category: "GTX", badge: "GTX-A", title: "GTX-A 킨텍스역 (일산)", status: "개통", detail: "운정~서울역 구간 운행 중", lat: 37.6653, lng: 126.7474 },
  { id: "gtx-c-suwon", category: "GTX", badge: "GTX-C", title: "GTX-C 수원·인덕원·과천", status: "공사 중", detail: "수원~양주, 삼성역 경유. 개통 목표 2028년 이후", lat: 37.2663, lng: 127.0001 },
  { id: "gtx-c-indeogwon", category: "GTX", badge: "GTX-C", title: "GTX-C 인덕원역", status: "공사 중", detail: "평촌·안양 수혜", lat: 37.4016, lng: 126.9767 },
  { id: "gtx-b-bucheon", category: "GTX", badge: "GTX-B", title: "GTX-B 부천종합운동장역", status: "공사 중", detail: "송도~마석, 여의도·서울역 연결. 개통 목표 2030년대 초", lat: 37.505, lng: 126.797 },
  { id: "sinansan", category: "신규 노선", badge: "신안산선", title: "신안산선 광명역", status: "공사 중", detail: "안산·시흥~광명~여의도", lat: 37.4166, lng: 126.8848 },
  { id: "wolpan", category: "신규 노선", badge: "월판선", title: "월곶~판교선", status: "공사 중", detail: "시흥·안양·의왕~판교 동서 연결", lat: 37.3947, lng: 127.1112 },
  { id: "indeogwon-dongtan", category: "신규 노선", badge: "인동선", title: "인덕원~동탄선", status: "공사 중", detail: "평촌·광교·영통·동탄 남북 연결", lat: 37.253, lng: 127.071 },
  { id: "sinbundang-homaesil", category: "신규 노선", badge: "신분당선", title: "신분당선 광교~호매실 연장", status: "계획", detail: "수원 서부에서 강남 직결", lat: 37.27, lng: 126.955 },
  { id: "line8-byeollae", category: "신규 노선", badge: "8호선", title: "8호선 별내선 (구리·다산)", status: "개통", detail: "암사~구리~다산~별내, 잠실 직결", lat: 37.6035, lng: 127.1435 },
  { id: "dongtan-tram", category: "신규 노선", badge: "트램", title: "동탄 도시철도(트램)", status: "공사 중", detail: "동탄역 중심 순환 노선", lat: 37.205, lng: 127.078 },
  { id: "bundang-rebuild", category: "정비·개발", badge: "1기 신도시", title: "분당 재건축 선도지구", status: "진행 중", detail: "노후계획도시 특별법, 정비계획 수립 중", lat: 37.3786, lng: 127.1182 },
  { id: "ilsan-rebuild", category: "정비·개발", badge: "1기 신도시", title: "일산 재건축 선도지구", status: "진행 중", detail: "노후계획도시 특별법, 정비계획 수립 중", lat: 37.6597, lng: 126.7727 },
  { id: "pyeongchon-rebuild", category: "정비·개발", badge: "1기 신도시", title: "평촌·산본 재건축 선도지구", status: "진행 중", detail: "노후계획도시 특별법, 정비계획 수립 중", lat: 37.3906, lng: 126.958 },
  { id: "gyosan", category: "정비·개발", badge: "3기 신도시", title: "하남 교산 신도시", status: "진행 중", detail: "약 3만 가구, 3호선 연장 계획", lat: 37.523, lng: 127.215 },
  { id: "wangsuk", category: "정비·개발", badge: "3기 신도시", title: "남양주 왕숙 신도시", status: "진행 중", detail: "약 6만 가구, GTX-B·9호선 연장 계획", lat: 37.615, lng: 127.18 },
  { id: "changneung", category: "정비·개발", badge: "3기 신도시", title: "고양 창릉 신도시", status: "진행 중", detail: "약 3만 가구, 고양은평선 계획", lat: 37.64, lng: 126.87 },
  { id: "yongin-semicon", category: "일자리", badge: "반도체", title: "용인 반도체 국가산업단지", status: "진행 중", detail: "이동·남사읍 일대 대규모 반도체 클러스터", lat: 37.13, lng: 127.2 },
  { id: "pangyo-tv", category: "일자리", badge: "테크노밸리", title: "판교 제2·제3 테크노밸리", status: "진행 중", detail: "IT·바이오 기업 입주 확대", lat: 37.415, lng: 127.1 },
];

export const cities = Array.from(new Set(complexes.map((c) => c.city))).sort((a, b) => a.localeCompare(b, "ko"));
export const regions = ["경기도 전체", ...cities];
