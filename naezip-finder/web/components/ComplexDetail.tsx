"use client";

import { useEffect, useState } from "react";
import { complexes, householdsText, type Complex } from "@/lib/data";
import { totalScore } from "@/lib/score";
import { ROWS } from "./DetailTable";
import { PriceChart } from "./PriceChart";
import { AddToCompare } from "./CompareTray";
import type { Slot } from "./Compare";

const EVENT = "naezip-detail";

/** 단지 상세 패널을 엽니다 (사이트 어디서든). */
export function openDetail(id: string, area?: number) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id, area } }));
}

/** 누르면 상세 패널이 열리는 단지 이름 */
export function ComplexName({ c, area, className = "" }: { c: Complex; area?: number; className?: string }) {
  return (
    <button
      type="button"
      className={`cx-name ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        openDetail(c.id, area);
      }}
      title="상세 정보 보기"
    >
      {c.name}
    </button>
  );
}

/** 화면 오른쪽 위에 뜨는 단지 상세 정보 */
export default function DetailPanel() {
  const [slot, setSlot] = useState<Slot | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const { id, area } = (e as CustomEvent<{ id: string; area?: number }>).detail;
      const c = complexes.find((x) => x.id === id);
      if (!c) return;
      const size = c.sizes.find((z) => z.area === area) ?? c.sizes.find((z) => z.area >= 80 && z.area < 90) ?? c.sizes[0];
      setSlot({ complex: c, area: size.area });
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSlot(null);
    window.addEventListener(EVENT, on);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener("keydown", esc);
    };
  }, []);

  if (!slot) return null;
  const c = slot.complex;
  return (
    <aside className="cx-panel" role="dialog" aria-label={`${c.name} 상세 정보`}>
      <div className="cx-head">
        <div>
          <h2>{c.name}</h2>
          <p className="tiny muted">
            {c.city} {c.district} · {c.year}년{c.households ? ` · ${householdsText(c)}` : ""} · 종합 {totalScore(c)}점
          </p>
        </div>
        <button type="button" className="cx-close" onClick={() => setSlot(null)} aria-label="닫기">×</button>
      </div>
      {c.sizes.length > 1 && (
        <div className="cx-sizes" role="radiogroup" aria-label="평형">
          {c.sizes.map((z) => (
            <button
              key={z.area}
              type="button"
              role="radio"
              aria-checked={z.area === slot.area}
              className={z.area === slot.area ? "pill on" : "pill"}
              onClick={() => setSlot({ complex: c, area: z.area })}
            >
              {z.area}㎡
            </button>
          ))}
        </div>
      )}
      <table className="detail cx-table">
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.cell(slot)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cx-chart">
        <PriceChart slots={[slot]} />
      </div>
      <AddToCompare id={c.id} area={slot.area} className="cta" label="비교함에 담기" />
    </aside>
  );
}
