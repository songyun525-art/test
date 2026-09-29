// 3단계 · 자금 부담 계산 (원리금균등상환 기준 단순 추정)
import { monthlyPayment } from "../budget";
import type { FundingInput, FundingResult } from "./types";

export const FUNDING_NOTICE = "자금 부담 계산은 단순 추정이며, 실제 대출 가능 여부와 세금은 금융기관 및 전문가 확인이 필요합니다.";

export const FUNDING_DEFAULTS: Omit<FundingInput, "price"> = { cash: 3, ltv: 0.7, ratePct: 4, years: 30, costRate: 0.03 };

export function fundingPlan(x: FundingInput): FundingResult {
  const loan = Math.max(0, x.price * x.ltv);
  const cost = x.price * x.costRate;
  const cashNeeded = x.price - loan + cost;
  return {
    loan,
    cost,
    cashNeeded,
    shortfall: Math.max(0, cashNeeded - x.cash),
    monthly: monthlyPayment(loan, x.ratePct, x.years),
    monthlyPlus1: monthlyPayment(loan, x.ratePct + 1, x.years),
  };
}
