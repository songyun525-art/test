// 집을 볼 때 쓰는 판단 지표의 데이터 타입. 가격 단위는 억 원, 비율은 0.72 = 72% 입니다.
// 1단계(전세·거래 신뢰도·고점 회복률)는 화면에 연결되어 있고, 2·3단계 타입은 데이터가 붙으면 바로 쓰도록 미리 정의해 둡니다.

/** 배지 색. good = 초록, normal = 회색, warn = 주황, none = 데이터 없음 */
export type Tone = "good" | "normal" | "warn" | "none";

/* ---------- 1단계: 원자료 (lib/data.ts 의 SizeOption 에 붙음) ---------- */

/** 평형별 최근 전세 (순수 전세, 월세 0). 기준가와 같은 3→6→12개월 창의 중위값 */
export type JeonseData = {
  price: number; // 최근 전세가 (억)
  y1: number; // 최근 1년 전세가 상승률 (㎡당), NaN = 1년 전 거래 없음
  count: number; // 산정에 쓴 전세 거래 건수
  isSample: boolean; // 전월세 API 연결 전 화면 확인용 예시 값인지
};

/** 평형별 최근 10년 최고가 (분기 중위가 중 최고) */
export type PeakData = {
  price: number; // 억
  quarter: string; // "2021-3" = 2021년 3분기
  isSample?: boolean;
};

/* ---------- 1단계: 계산 결과 (lib/metrics/*.ts) ---------- */

export type JeonseLevel = "높음" | "보통" | "낮음";

export type JeonseMetrics =
  | { status: "missing"; label: string } // "전세 데이터 부족"
  | {
      status: "ok";
      price: number; // 최근 전세가
      ratio: number; // 전세가율 = 전세가 / 기준가
      gap: number; // 매매-전세 갭 = 기준가 - 전세가 (억)
      y1: number; // 1년 전세 상승률
      level: JeonseLevel;
      tone: Tone;
      isSample: boolean;
    };

export type TrustLevel = "높음" | "보통" | "낮음";

export type TradeTrust = {
  level: TrustLevel | null; // null = 최근 12개월 거래 없음
  tone: Tone;
  months: number; // 기준가 산정 기간 (3/6/12개월, 0 = 없음)
  count: number; // 그 기간 거래 건수
  lastDeal: string; // 마지막 거래일 "2026-09-22" ("" = 모름)
  label: string; // "거래 신뢰도 높음"
  detail: string; // "최근 3개월 12건"
  caution: string; // "가격 해석 주의" 등, 없으면 ""
};

export type RecoveryStatus = "전고점 돌파" | "고점 근접" | "회복 중" | "크게 하락";

export type PeakRecovery =
  | { status: "missing" }
  | {
      status: "ok";
      peak: number; // 최근 10년 최고가
      peakWhen: string; // "2021년 3분기"
      current: number; // 현재 기준가 (호가를 넣으면 호가)
      drawdown: number; // 고점 대비 하락률 = (현재 - 최고가) / 최고가
      recovery: number; // 고점 대비 회복률 = 현재 / 최고가
      stage: RecoveryStatus;
      tone: Tone;
      isSample: boolean;
    };

/* ---------- 2단계: 입주물량 리스크 · 리스크 요약 ---------- */

/** 단지 주변 입주 예정 물량. 입주 예정 단지 데이터를 붙이면 채웁니다. */
export type SupplyData = {
  within3km1y: number; // 반경 3km, 1년 안 입주 예정 세대수
  within3km3y: number; // 반경 3km, 3년 안
  sgg3y: number; // 시군구 전체, 3년 안
  asOf: string;
};

export type SupplyRiskLevel = "낮음" | "보통" | "높음";

export type SupplyRisk =
  | { status: "missing"; label: string } // "입주물량 데이터 준비 중"
  | { status: "ok"; level: SupplyRiskLevel; tone: Tone; data: SupplyData; detail: string };

export type RiskKey =
  | "lowTrust" // 거래 신뢰도 낮음
  | "lowJeonse" // 전세가율 낮음
  | "highSupply" // 입주물량 리스크 높음
  | "overheated" // 고점 대비 회복률 과도함 (전고점 크게 돌파)
  | "weakHojae" // 호재 확실성 낮음
  | "old" // 연식 오래됨
  | "small"; // 세대수 적음

export type RiskItem = { key: RiskKey; text: string; severity: "주의" | "참고" };

/* ---------- 3단계: 자금 부담 · 호재 등급 · 점수 기준 ---------- */

export type FundingInput = {
  cash: number; // 보유 현금 (억)
  price: number; // 기준가 또는 직접 입력한 호가 (억)
  ltv: number; // 0.7 = 70%
  ratePct: number; // 대출 금리 (%)
  years: number; // 대출 기간
  costRate: number; // 취득세·중개수수료·기타 비용 비율 (0.03 = 3%)
};

export type FundingResult = {
  loan: number; // 예상 대출금 (억)
  cost: number; // 부대비용 (억)
  cashNeeded: number; // 필요 현금 = 매수가 - 대출 + 부대비용 (억)
  shortfall: number; // 부족 금액 (0 이상, 억)
  monthly: number; // 월 상환액 (만원, 원리금균등)
  monthlyPlus1: number; // 금리 +1%p 시 월 상환액 (만원)
};

/** 호재 확실성 등급. S 개통/완공, A 공사 중, B 착공 예정, C 계획 발표, D 검토/구상 */
export type HojaeGrade = "S" | "A" | "B" | "C" | "D";
export type HojaeType = "GTX" | "신규 노선" | "정비사업" | "일자리" | "기타";

export type HojaeDetail = {
  id: string;
  title: string;
  type: HojaeType;
  grade: HojaeGrade;
  stage: string; // "개통", "공사 중" …
  expected: string; // 예상 시점 "2028년 이후"
  caution: string; // "개통 시점 변동 가능"
};

/** 점수 기준 토글 */
export type ScoreProfileKey = "legacy" | "basic" | "living" | "invest";

/** 점수 항목. 기존 5개 + 새 지표. 아직 데이터가 없는 항목은 계산 함수가 중간값(50)을 돌려줍니다. */
export type MetricKey =
  | "location" // 입지
  | "growth" // 상승률
  | "households" // 세대수
  | "age" // 연식
  | "hojae" // 호재
  | "stability" // 가격 안정성 (거래 신뢰도·변동성)
  | "momentum" // 상승/회복 흐름
  | "demand" // 수요/전세
  | "product" // 단지 상품성 (세대수·연식·용적률)
  | "living" // 학군/생활편의
  | "recoveryRoom" // 가격 회복 여력
  | "jeonse" // 전세가율
  | "volume" // 거래량
  | "supply"; // 입주물량 리스크 (적을수록 높은 점수)

export type ScoreProfile = {
  key: ScoreProfileKey;
  label: string;
  weights: Partial<Record<MetricKey, number>>;
};
