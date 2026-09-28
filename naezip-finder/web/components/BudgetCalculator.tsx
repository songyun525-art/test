"use client";

import Link from "next/link";
import { useState } from "react";
import { BANDS, RULES, bankPlan, policyPlan, type Band, type BudgetInput, type LoanPlan } from "@/lib/budget";
import { formatEok } from "@/lib/score";

const DEFAULT: BudgetInput = {
  cash: 3,
  income: 9000,
  newborn: false,
  newlywed: false,
  firstHome: true,
  rate: 4.0,
  regulated: false,
  band: "15억 이하",
  existingMonthly: 0,
  years: 30,
};

function Num({ label, unit, value, step, onChange, hint }: { label: string; unit: string; value: number; step: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input type="number" inputMode="decimal" min={0} step={step} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value)))} />
        <span className="unit">{unit}</span>
      </span>
      {hint && <span className="tiny muted">{hint}</span>}
    </label>
  );
}

function Segment<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segment" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? "seg on" : "seg"} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, best }: { plan: LoanPlan; best: boolean }) {
  const cashShare = Math.min(100, ((plan.price + plan.cost - plan.loan) / (plan.price + plan.cost)) * 100);
  return (
    <div className={best ? "plan best" : "plan"}>
      <div className="plan-head">
        <b>{plan.name}</b>
        {best && <span className="badge red">추천</span>}
      </div>
      <div className="plan-price">
        최대 <strong>{formatEok(plan.price)}</strong> 집까지
      </div>
      <div className="stackbar" aria-hidden>
        <span style={{ width: `${cashShare}%`, background: "#2e9e5b" }} />
        <span style={{ width: `${100 - cashShare}%`, background: "#3e7bfa" }} />
      </div>
      <dl className="plan-rows">
        <div><dt><i style={{ background: "#2e9e5b" }} />내 현금</dt><dd>{formatEok(plan.cash)}</dd></div>
        <div><dt><i style={{ background: "#3e7bfa" }} />대출</dt><dd>{formatEok(plan.loan)}</dd></div>
        <div><dt>취득세·중개보수 (약)</dt><dd>{formatEok(plan.cost)}</dd></div>
        <div><dt>월 상환액 (원리금균등)</dt><dd>{Math.round(plan.monthly).toLocaleString()}만원</dd></div>
        <div><dt>가장 먼저 걸리는 규제</dt><dd>{plan.limitedBy}</dd></div>
      </dl>
      <p className="tiny muted">{plan.note}</p>
    </div>
  );
}

export default function BudgetCalculator() {
  const [f, setF] = useState<BudgetInput>(DEFAULT);
  const set = <K extends keyof BudgetInput>(k: K, v: BudgetInput[K]) => setF({ ...f, [k]: v });

  const bank = bankPlan(f);
  const policy = policyPlan(f);
  const plans = [bank, policy].filter(Boolean) as LoanPlan[];
  const best = plans.reduce<LoanPlan | null>((m, p) => (!m || p.price > m.price ? p : m), null);
  const otherBands = BANDS.filter((b) => b !== f.band)
    .map((b) => ({ band: b, plan: bankPlan(f, b) }))
    .filter((x) => x.plan);

  return (
    <div className="grid budget-grid">
      <section className="panel">
        <div className="panel-head"><h2>내 정보 입력</h2><span className="muted">숫자를 바꾸면 바로 다시 계산돼요.</span></div>
        <div className="form">
          <Num label="보유 현금" unit="억" step={0.1} value={f.cash} onChange={(v) => set("cash", v)} hint="집 사는 데 쓸 수 있는 돈 전부" />
          <Num label="부부합산 연소득" unit="만원" step={500} value={f.income} onChange={(v) => set("income", v)} hint="세전 기준" />
          <div className="field">
            <span className="field-label">가구 상황</span>
            <div className="checks">
              <label className="check"><input type="checkbox" checked={f.newborn} onChange={(e) => set("newborn", e.target.checked)} /> 신생아 (2년 내 출산)</label>
              <label className="check"><input type="checkbox" checked={f.newlywed} onChange={(e) => set("newlywed", e.target.checked)} /> 신혼부부 (혼인 7년 이내)</label>
            </div>
          </div>
          <Segment label="생애최초 주택 구입" options={["예", "아니요"]} value={f.firstHome ? "예" : "아니요"} onChange={(v) => set("firstHome", v === "예")} />
          <Num label="예상 대출금리" unit="%" step={0.1} value={f.rate} onChange={(v) => set("rate", v)} />
          <Segment label="지역" options={["비규제지역", "규제지역"]} value={f.regulated ? "규제지역" : "비규제지역"} onChange={(v) => set("regulated", v === "규제지역")} />
          <Segment<Band> label="관심 매물 가격대" options={BANDS} value={f.band} onChange={(v) => set("band", v)} />
          <Num label="기존 대출 월 상환액" unit="만원" step={10} value={f.existingMonthly} onChange={(v) => set("existingMonthly", v)} hint="신용대출·자동차 할부 등" />
          <Segment label="대출 기간" options={["30년", "40년"]} value={`${f.years}년`} onChange={(v) => set("years", parseInt(v))} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>내 예산</h2><span className="muted">{f.band} · {f.regulated ? "규제지역" : "비규제지역"}</span></div>
        {best ? (
          <>
            <div className="budget-hero">
              <span className="muted">살 수 있는 집값</span>
              <strong>{formatEok(best.price)}</strong>
              <span className="muted">까지</span>
            </div>
            <div className="plans">
              {plans.map((p) => <PlanCard key={p.name} plan={p} best={plans.length > 1 && p === best} />)}
            </div>
            <Link className="cta" href={`/find?budget=${best.price}`}>이 예산으로 집 찾기</Link>
          </>
        ) : (
          <p className="empty muted">
            이 가격대({f.band})의 집은 지금 조건으로는 어려워요.
            {otherBands.length > 0 && ` ${otherBands.map((o) => `${o.band}라면 최대 ${formatEok(o.plan!.price)}`).join(", ")}까지 가능해요.`}
          </p>
        )}
        <details className="rules">
          <summary>계산 기준 보기</summary>
          <ul>
            <li>DSR {RULES.dsr * 100}%: 연소득의 40% 안에서 모든 대출 원리금을 갚을 수 있어야 해요. 한도는 금리에 스트레스 금리 {RULES.stressRate}%p를 더해 계산해요.</li>
            <li>LTV: 규제지역 {RULES.ltv.regulated * 100}%, 비규제지역 {RULES.ltv.free * 100}%, 생애최초 {RULES.ltv.firstHome * 100}%.</li>
            <li>주담대 최대 한도: 규제지역은 집값 15억 이하 6억, 15~25억 4억, 25억 초과 2억. 비규제 수도권은 6억.</li>
            <li>정책대출(디딤돌·신생아 특례)은 소득·집값·자산 요건이 있어 가능성만 보여 드려요.</li>
            <li>2025년 10월까지 발표된 수도권 규정을 단순화했어요. 실제 한도는 은행 상담으로 확인하세요.</li>
          </ul>
        </details>
      </section>
    </div>
  );
}
