// 내 예산 구하기. 대출 규정은 2025년 10월(10·15 대책)까지 발표된 수도권 기준을 단순화한 것입니다.
// 실제 한도는 은행·정책 변경에 따라 달라지니 결과는 참고용입니다.

export type Band = "15억 이하" | "15~25억" | "25억 초과";
export const BANDS: Band[] = ["15억 이하", "15~25억", "25억 초과"];

export type BudgetInput = {
  cash: number; // 보유현금 (억)
  income: number; // 부부합산 연소득 (만원)
  newborn: boolean; // 2년 내 출산 (신생아)
  newlywed: boolean; // 신혼부부 (혼인 7년 이내)
  firstHome: boolean; // 생애최초 주택 구입
  rate: number; // 예상 대출금리 (%)
  regulated: boolean; // 규제지역 여부
  band: Band; // 관심 매물 가격대
  existingMonthly: number; // 기존 대출 월 상환액 (만원)
  years: number; // 대출 기간
};

export const RULES = {
  dsr: 0.4,
  stressRate: 3.0, // 수도권·규제지역 주담대 스트레스 금리 하한 (%p)
  ltv: { regulated: 0.4, free: 0.7, firstHome: 0.7 },
  capRegulated: { "15억 이하": 6, "15~25억": 4, "25억 초과": 2 } as Record<Band, number>,
  capFree: 6, // 수도권 주담대 최대 6억
};

const BAND_RANGE: Record<Band, [number, number]> = {
  "15억 이하": [1, 15],
  "15~25억": [15.01, 25],
  "25억 초과": [25.01, 80],
};

// 취득세·중개보수 등 부대비용 대략치
export function extraCost(price: number) {
  const rate = price <= 6 ? 0.015 : price <= 9 ? 0.025 : 0.038;
  return price * rate;
}

// 원리금균등상환 월 납입액(만원) → 대출 원금(억)
export function principalFromMonthly(monthlyManwon: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12;
  const n = years * 12;
  const p = r === 0 ? monthlyManwon * n : (monthlyManwon * (1 - Math.pow(1 + r, -n))) / r;
  return Math.max(0, p / 10000);
}

export function monthlyPayment(principalEok: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12;
  const n = years * 12;
  const p = principalEok * 10000;
  return r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
}

export type Limit = "LTV" | "대출 한도" | "DSR" ;

export type LoanPlan = {
  name: string;
  price: number; // 살 수 있는 최대 집값 (억)
  loan: number;
  cash: number;
  cost: number;
  monthly: number; // 월 상환액 (만원)
  limitedBy: Limit;
  note: string;
};

function solve(
  lo: number,
  hi: number,
  cash: number,
  loanAt: (price: number) => { loan: number; limitedBy: Limit },
): number | null {
  const ok = (p: number) => cash + loanAt(p).loan >= p + extraCost(p);
  if (!ok(lo)) return null;
  let a = lo;
  let b = hi;
  for (let i = 0; i < 50; i++) {
    const m = (a + b) / 2;
    if (ok(m)) a = m;
    else b = m;
  }
  return Math.floor(a * 10) / 10;
}

export function bankPlan(input: BudgetInput, band: Band = input.band): LoanPlan | null {
  const ltv = input.firstHome ? RULES.ltv.firstHome : input.regulated ? RULES.ltv.regulated : RULES.ltv.free;
  const cap = input.regulated ? RULES.capRegulated[band] : RULES.capFree;
  const dsrMonthly = (input.income * RULES.dsr) / 12 - input.existingMonthly;
  const dsrMax = principalFromMonthly(dsrMonthly, input.rate + RULES.stressRate, input.years);
  const loanAt = (price: number) => {
    const opts: [number, Limit][] = [
      [ltv * price, "LTV"],
      [cap, "대출 한도"],
      [dsrMax, "DSR"],
    ];
    const [loan, limitedBy] = opts.reduce((m, o) => (o[0] < m[0] ? o : m));
    return { loan, limitedBy };
  };
  const [lo, hi] = BAND_RANGE[band];
  const price = solve(lo, hi, input.cash, loanAt);
  if (price === null) return null;
  const { loan, limitedBy } = loanAt(price);
  const need = Math.max(0, price + extraCost(price) - input.cash);
  const used = Math.min(loan, need);
  return {
    name: "은행 주택담보대출",
    price,
    loan: used,
    cash: input.cash,
    cost: extraCost(price),
    monthly: monthlyPayment(used, input.rate, input.years),
    limitedBy,
    note: `LTV ${Math.round(ltv * 100)}% · 한도 ${cap}억 · DSR 40% (스트레스 금리 +${RULES.stressRate}%p)`,
  };
}

// 정책대출 (디딤돌·신생아 특례). 조건이 자주 바뀌어 대략적인 가능 여부만 봅니다.
export function policyPlan(input: BudgetInput): LoanPlan | null {
  let name = "";
  let maxPrice = 0;
  let limit = 0;
  let rate = 0;
  if (input.newborn && input.income <= 20000) {
    name = "신생아 특례 디딤돌";
    maxPrice = 9;
    limit = 4;
    rate = 3.0;
  } else if ((input.firstHome && input.income <= 7000) || (input.newlywed && input.income <= 8500) || input.income <= 6000) {
    name = input.newlywed ? "디딤돌 (신혼부부)" : input.firstHome ? "디딤돌 (생애최초)" : "디딤돌";
    maxPrice = input.newlywed ? 6 : 5;
    limit = input.newlywed ? 3.2 : input.firstHome ? 2.4 : 2;
    rate = 3.2;
  } else return null;
  if (input.band !== "15억 이하") return null;
  const loanAt = (price: number) => {
    const byLtv = price * 0.7;
    return byLtv < limit ? { loan: byLtv, limitedBy: "LTV" as Limit } : { loan: limit, limitedBy: "대출 한도" as Limit };
  };
  const price = solve(1, maxPrice, input.cash, loanAt);
  if (price === null) return null;
  const { loan, limitedBy } = loanAt(price);
  const used = Math.min(loan, Math.max(0, price + extraCost(price) - input.cash));
  return {
    name,
    price,
    loan: used,
    cash: input.cash,
    cost: extraCost(price),
    monthly: monthlyPayment(used, rate, input.years),
    limitedBy,
    note: `집값 ${maxPrice}억 이하 · 한도 약 ${limit}억 · 금리 약 ${rate}% (소득·자산 요건 확인 필요)`,
  };
}
