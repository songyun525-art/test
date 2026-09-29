"use client";

import { useState } from "react";
import Icon from "./Icon";
import BuildingArt from "./BuildingArt";
import type { Complex } from "@/lib/data";
import { formatEok } from "@/lib/score";
import { householdsText } from "@/lib/data";
import { ComplexName } from "./ComplexDetail";

export const SLOT_COLORS = ["#e5484d", "#3e7bfa", "#2e9e5b"];

export type Slot = { complex: Complex; area: number; customPrice?: number };

export const slotSize = (s: Slot) => s.complex.sizes.find((z) => z.area === s.area) ?? s.complex.sizes[0];
export const slotPrice = (s: Slot) => s.customPrice ?? slotSize(s).price;

function PriceInput({ slot, onPrice }: { slot: Slot; onPrice: (v?: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  if (!editing)
    return (
      <div className="price-actions">
        <button className="chip-btn" onClick={() => { setValue(String(slotPrice(slot))); setEditing(true); }}>
          <Icon name="pencil" size={14} /> 호가 직접 입력
        </button>
        {slot.customPrice !== undefined && (
          <button className="link-btn" onClick={() => onPrice(undefined)}>실거래로 되돌리기</button>
        )}
      </div>
    );
  return (
    <form
      className="price-edit"
      onSubmit={(e) => {
        e.preventDefault();
        const v = parseFloat(value);
        onPrice(Number.isFinite(v) && v > 0 ? v : undefined);
        setEditing(false);
      }}
    >
      <input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-label="호가 (억)" />
      <span>억</span>
      <button type="submit" className="chip-btn primary">적용</button>
    </form>
  );
}

export default function Compare({
  slots,
  liked,
  onToggleLike,
  onSize,
  onPrice,
  onRemove,
  onAdd,
}: {
  slots: Slot[];
  liked: Set<string>;
  onToggleLike: (id: string) => void;
  onSize: (i: number, area: number) => void;
  onPrice: (i: number, v?: number) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
}) {
  return (
    <section className="panel compare">
      <div className="panel-head">
        <h2>단지 비교</h2>
        <span className="muted">3개 단지를 선택하여 비교해 보세요.</span>
      </div>
      <div className="compare-grid">
        {slots.map((s, i) => {
          const size = slotSize(s);
          const isLiked = liked.has(s.complex.id);
          return (
            <article key={s.complex.id} className="complex-card">
              <div className="card-title">
                <span className="num" style={{ background: SLOT_COLORS[i] }}>{i + 1}</span>
                <h3><ComplexName c={s.complex} area={s.area} /></h3>
                <button
                  className={isLiked ? "heart on" : "heart"}
                  onClick={() => onToggleLike(s.complex.id)}
                  aria-label={isLiked ? "관심 단지 해제" : "관심 단지 추가"}
                >
                  <Icon name="heart" size={16} fill={isLiked} />
                </button>
                <button className="remove" onClick={() => onRemove(i)} aria-label="비교에서 빼기">
                  <Icon name="x" size={15} />
                </button>
              </div>
              <p className="meta">
                {s.complex.city} {s.complex.district} | {s.complex.year}년{s.complex.households ? ` | ${householdsText(s.complex)}` : ""}
              </p>
              <BuildingArt seed={s.complex.art} className="card-art" />
              <select className="size-select" value={s.area} onChange={(e) => onSize(i, Number(e.target.value))} aria-label="평형">
                {s.complex.sizes.map((z) => (
                  <option key={z.area} value={z.area}>
                    전용 {z.area}㎡ ({z.pyeong}평)
                  </option>
                ))}
              </select>
              <span className={s.customPrice !== undefined ? "badge blue" : "badge red"}>
                {s.customPrice !== undefined ? "호가 입력" : "실거래 기준"}
              </span>
              <div className="price">{formatEok(slotPrice(s))}</div>
              <p className="tiny muted">
                {s.customPrice !== undefined
                  ? `실거래 3개월 평균 ${formatEok(size.price)}`
                  : `최근 3개월 평균 · ${size.trades}건${size.trades < 3 ? " (낮은 표본)" : ""}`}
              </p>
              <PriceInput key={`${s.area}-${s.customPrice}`} slot={s} onPrice={(v) => onPrice(i, v)} />
            </article>
          );
        })}
        {(
          <button className="add-card" onClick={onAdd} disabled={slots.length >= 3} title={slots.length >= 3 ? "단지를 하나 빼면 추가할 수 있어요" : undefined}>
            <span className="add-circle"><Icon name="plus" /></span>
            비교할 단지 추가
            <span className="tiny muted">(최대 3개)</span>
          </button>
        )}
      </div>
    </section>
  );
}
