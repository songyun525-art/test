"use client";

import { useEffect, useRef, useState } from "react";
import Hero from "./Hero";
import Compare, { slotPrice, type Slot } from "./Compare";
import MapPanel from "./MapPanel";
import DetailTable from "./DetailTable";
import ScorePanel from "./ScorePanel";
import { MetricsTable, PriceChart } from "./PriceChart";
import { HojaePanel, Recommendations } from "./Bottom";
import { complexes, type Complex, IS_SAMPLE, DATA_AS_OF } from "@/lib/data";
import { DEFAULT_WEIGHTS, recommend, type Weights } from "@/lib/score";

const byId = (id: string) => complexes.find((c) => c.id === id)!;
const size84 = (c: Complex) => c.sizes.find((z) => z.area >= 76 && z.area < 95);

// 처음 보여 줄 비교 단지: 샘플이면 고정, 실제 데이터면 서로 다른 시에서 최근 3개월 84㎡ 거래가 가장 많은 단지 3곳
function initialSlots(): Slot[] {
  if (IS_SAMPLE) return ["dongtan-lotte", "gwanggyo-hoban", "suwon-hillstate"].map((id) => ({ complex: byId(id), area: 84 }));
  const picked: Slot[] = [];
  const ranked = complexes.filter((c) => size84(c)).sort((a, b) => size84(b)!.trades - size84(a)!.trades);
  for (const c of ranked) {
    if (picked.some((s) => s.complex.city === c.city)) continue;
    picked.push({ complex: c, area: size84(c)!.area });
    if (picked.length === 3) break;
  }
  return picked;
}
const INITIAL = initialSlots();

export default function Dashboard() {
  const [slots, setSlots] = useState<Slot[]>(INITIAL);
  const [liked, setLiked] = useState<Set<string>>(new Set(INITIAL.slice(0, 1).map((s) => s.complex.id)));
  const [region, setRegion] = useState("경기도 전체");
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [notice, setNotice] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // 다른 화면에서 "비교하기"로 넘어온 단지 (?compare=id:면적)를 첫 번째 칸에 넣습니다.
  useEffect(() => {
    const [id, area] = (new URLSearchParams(window.location.search).get("compare") ?? "").split(":");
    const c = complexes.find((x) => x.id === id);
    if (!c) return;
    const a = c.sizes.some((z) => z.area === Number(area)) ? Number(area) : c.sizes[0].area;
    setSlots((prev) => [{ complex: c, area: a }, ...prev.filter((s) => s.complex.id !== c.id)].slice(0, 3));
  }, []);

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
    <>
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
              <DetailTable slots={slots} />
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
          {IS_SAMPLE
            ? "지금 보이는 숫자는 모두 화면 확인용 샘플입니다. "
            : `국토교통부 실거래가(${DATA_AS_OF} 기준)와 카카오 지도 정보로 계산했습니다. 강남역 이동 시간은 거리로 어림한 값입니다. `}
          기준가는 최근 3개월 실거래 중위가(거래가 없으면 6·12개월)이며, 호가를 직접 입력하면 그 값으로 추천을 다시 계산합니다.
        </footer>
    </>
  );
}
