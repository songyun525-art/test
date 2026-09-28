"use client";

import { useRef, useState } from "react";
import Sidebar from "./Sidebar";
import Hero from "./Hero";
import Compare, { slotPrice, type Slot } from "./Compare";
import MapPanel from "./MapPanel";
import ScorePanel from "./ScorePanel";
import { MetricsTable, PriceChart } from "./PriceChart";
import { HojaePanel, Recommendations } from "./Bottom";
import { complexes, type Complex } from "@/lib/data";
import { DEFAULT_WEIGHTS, recommend, type Weights } from "@/lib/score";

const byId = (id: string) => complexes.find((c) => c.id === id)!;
const INITIAL: Slot[] = [
  { complex: byId("dongtan-lotte"), area: 84 },
  { complex: byId("gwanggyo-hoban"), area: 84 },
  { complex: byId("suwon-hillstate"), area: 84 },
];

export default function Dashboard() {
  const [slots, setSlots] = useState<Slot[]>(INITIAL);
  const [liked, setLiked] = useState<Set<string>>(new Set(["dongtan-lotte"]));
  const [region, setRegion] = useState("경기도 전체");
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [notice, setNotice] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const base = slots[0];
  const recs = base ? recommend(slotPrice(base), slots.map((s) => s.complex.id), region, weights) : [];

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  };
  const add = (c: Complex, area?: number) => {
    if (slots.some((s) => s.complex.id === c.id)) return flash(`${c.name}은(는) 이미 비교 중이에요.`);
    if (slots.length >= 3) return flash("최대 3개까지 비교할 수 있어요. 하나를 빼고 다시 추가해 주세요.");
    const a = area ?? (c.sizes.find((z) => z.area === 84) ?? c.sizes[0]).area;
    setSlots([...slots, { complex: c, area: a }]);
  };
  const update = (i: number, patch: Partial<Slot>) => setSlots(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const toggleLike = (id: string) => {
    const next = new Set(liked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLiked(next);
  };
  const focusSearch = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    searchRef.current?.focus();
  };

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Hero region={region} onRegion={setRegion} onPick={(c) => add(c)} inputRef={searchRef} />
        {notice && <div className="toast" role="status">{notice}</div>}
        <div className="grid">
          <Compare
            slots={slots}
            liked={liked}
            onToggleLike={toggleLike}
            onSize={(i, area) => update(i, { area, customPrice: undefined })}
            onPrice={(i, v) => update(i, { customPrice: v })}
            onRemove={(i) => setSlots(slots.filter((_, j) => j !== i))}
            onAdd={focusSearch}
          />
          <MapPanel slots={slots} recs={recs} region={region} onRegion={setRegion} />
          {slots.length > 0 ? (
            <>
              <ScorePanel slots={slots} weights={weights} onWeights={setWeights} />
              <div className="stack">
                <PriceChart slots={slots} />
                <MetricsTable slots={slots} />
              </div>
            </>
          ) : (
            <section className="panel wide empty">비교할 단지를 위 검색창에서 골라 주세요.</section>
          )}
          <Recommendations
            base={base && { name: base.complex.name, price: slotPrice(base) }}
            recs={recs}
            weights={weights}
            liked={liked}
            onToggleLike={toggleLike}
            onAdd={add}
          />
          <HojaePanel />
        </div>
        <footer className="foot muted tiny">
          지금 보이는 숫자는 모두 화면 확인용 샘플입니다. 실거래 기준가는 국토교통부 실거래가 최근 3개월 평균이며, 호가를 직접 입력하면 그 값으로 추천을 다시 계산합니다.
        </footer>
      </main>
    </div>
  );
}
