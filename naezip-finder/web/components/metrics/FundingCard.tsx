"use client";

import { useEffect, useState } from "react";
import { fundingPlan, FUNDING_DEFAULTS, FUNDING_NOTICE } from "@/lib/metrics/funding";
import type { FundingInput } from "@/lib/metrics/types";
import { formatEok } from "@/lib/score";
import { SLOT_COLORS, slotPrice, type Slot } from "../Compare";

const manwon = (v: number) => `${Math.round(v).toLocaleString()}만 원`;

/** 입력칸 하나 (숫자, 단위 표시) */
function Field({ label, unit, value, step, onChange }: { label: string; unit: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="fund-field">
      <span>{label}</span>
      <span className="fund-input">
        <input type="number" inputMode="decimal" step={step} min={0} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(parseFloat(e.target.value))} />
        <em>{unit}</em>
      </span>
    </label>
  );
}

/** 비교 결과 아래 자금 부담 계산기. 단지별 "이 단지로 계산"을 누르면 그 단지 기준가(또는 입력한 호가)가 들어갑니다. */
export default function FundingCard({ slots }: { slots: Slot[] }) {
  const [x, setX] = useState<FundingInput>(() => ({ ...FUNDING_DEFAULTS, price: slots[0] ? slotPrice(slots[0]) : 5 }));
  const [picked, setPicked] = useState<string | null>(slots[0]?.complex.id ?? null);
  const set = (patch: Partial<FundingInput>) => setX({ ...x, ...patch });
  // 고른 단지의 평형·호가가 바뀌거나 비교함이 바뀌면 매수가를 따라 맞춥니다 (직접 입력한 매수가는 그대로).
  const target = picked === null ? null : (slots.find((s) => s.complex.id === picked) ?? slots[0] ?? null);
  const targetPrice = target ? slotPrice(target) : null;
  useEffect(() => {
    if (!target || targetPrice === null) return;
    if (target.complex.id !== picked) setPicked(target.complex.id);
    setX((prev) => (prev.price === targetPrice ? prev : { ...prev, price: targetPrice }));
  }, [target, targetPrice, picked]);
  const ok = [x.cash, x.price, x.ltv, x.ratePct, x.years, x.costRate].every(Number.isFinite) && x.price > 0 && x.years > 0;
  const r = ok ? fundingPlan(x) : null;

  return (
    <section className="panel wide fund-panel">
      <div className="panel-head">
        <h2>자금 부담 계산</h2>
        <span className="muted">원리금균등상환 기준 단순 추정</span>
        <div className="fund-picks right">
          {slots.map((s, i) => (
            <button
              key={s.complex.id}
              className={picked === s.complex.id ? "chip-btn on" : "chip-btn"}
              onClick={() => {
                set({ price: slotPrice(s) });
                setPicked(s.complex.id);
              }}
            >
              <i className="dot" style={{ background: SLOT_COLORS[i] }} />
              {s.complex.name.length > 10 ? `${s.complex.name.slice(0, 10)}…` : s.complex.name} 이 단지로 계산
            </button>
          ))}
        </div>
      </div>
      <div className="fund-body">
        <div className="fund-inputs">
          <Field label="보유 현금" unit="억" step={0.1} value={x.cash} onChange={(v) => set({ cash: v })} />
          <Field label="매수가 (기준가·호가)" unit="억" step={0.1} value={x.price} onChange={(v) => { set({ price: v }); setPicked(null); }} />
          <Field label="대출 비율 LTV" unit="%" step={5} value={Math.round(x.ltv * 100)} onChange={(v) => set({ ltv: v / 100 })} />
          <Field label="대출 금리" unit="%" step={0.1} value={x.ratePct} onChange={(v) => set({ ratePct: v })} />
          <Field label="대출 기간" unit="년" step={5} value={x.years} onChange={(v) => set({ years: v })} />
          <Field label="취득세·중개수수료·기타" unit="%" step={0.5} value={Math.round(x.costRate * 1000) / 10} onChange={(v) => set({ costRate: v / 100 })} />
        </div>
        {r ? (
          <div className="fund-result">
            <div><span>매수가</span><b>{formatEok(x.price)}</b></div>
            <div><span>필요 현금</span><b>{formatEok(r.cashNeeded)}</b><small>부대비용 {formatEok(r.cost)} 포함</small></div>
            <div><span>예상 대출</span><b>{formatEok(r.loan)}</b></div>
            <div className={r.shortfall > 0 ? "short" : "enough"}>
              <span>부족 금액</span>
              <b>{r.shortfall > 0 ? formatEok(r.shortfall) : "없음"}</b>
              {r.shortfall <= 0 && <small>여유 {formatEok(x.cash - r.cashNeeded)}</small>}
            </div>
            <div><span>월 상환액</span><b>{manwon(r.monthly)}</b></div>
            <div><span>금리 +1%p 시</span><b>{manwon(r.monthlyPlus1)}</b><small>+{manwon(r.monthlyPlus1 - r.monthly)}</small></div>
          </div>
        ) : (
          <p className="muted">숫자를 모두 입력해 주세요.</p>
        )}
      </div>
      <p className="tiny muted">
        {FUNDING_NOTICE} 실제 대출 한도(DSR·규제지역)는 <a href="/budget" className="link-btn">내 예산 구하기</a>에서 확인하세요.
      </p>
    </section>
  );
}
