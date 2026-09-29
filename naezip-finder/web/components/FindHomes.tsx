"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SketchMap, { type MapPin } from "./SketchMap";
import BuildingArt from "./BuildingArt";
import { complexes, regions, householdsText } from "@/lib/data";
import { bucketOf, formatEok, pct, totalScore, type Bucket, chgClass, orLow } from "@/lib/score";
import { AddToCompare } from "./CompareTray";
import { useRegion } from "@/lib/region";

type Sort = "종합점수" | "가격 낮은 순" | "1년 상승률";

export default function FindHomes({ initialBudget }: { initialBudget: number }) {
  const [budget, setBudget] = useState(initialBudget);
  const [size, setSize] = useState<"전체" | Bucket>("84");
  const [region, setRegion] = useRegion();
  const [sort, setSort] = useState<Sort>("종합점수");
  const [shown, setShown] = useState(30);

  const items = useMemo(() => complexes
    .filter((c) => region === "경기도 전체" || c.city === region)
    .flatMap((c) => c.sizes.map((s) => ({ c, s, bucket: bucketOf(s.area), score: totalScore(c) })))
    .filter((x) => x.s.price <= budget && (size === "전체" || x.bucket === size))
    .sort((a, b) =>
      sort === "종합점수" ? b.score - a.score : sort === "가격 낮은 순" ? a.s.price - b.s.price : orLow(b.c.growth.y1) - orLow(a.c.growth.y1),
    ), [budget, size, region, sort]);

  // 약도에는 위쪽 150곳만 찍습니다. 전체는 "크게 보기" 지도에서 봅니다.
  const pins: MapPin[] = items.slice(0, 150).map((x, i) => ({
    id: `${x.c.id}-${x.s.area}`,
    lat: x.c.lat,
    lng: x.c.lng,
    color: i < 3 ? "#ef5a4f" : "#4b5563",
    small: i >= 3,
    label: i < 3 ? `${i + 1}. ${x.c.name}` : undefined,
    sub: i < 3 ? `${x.s.area}㎡ ${formatEok(x.s.price)}` : undefined,
  }));

  return (
    <div className="grid find-grid">
      <section className="panel wide filters">
        <label className="field inline">
          <span className="field-label">내 예산</span>
          <span className="field-input">
            <input type="number" min={1} step={0.5} value={budget} onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))} aria-label="내 예산 (억)" />
            <span className="unit">억</span>
          </span>
        </label>
        <div className="segment" role="radiogroup" aria-label="평형">
          {(["전체", "59", "84"] as const).map((b) => (
            <button key={b} role="radio" aria-checked={size === b} className={size === b ? "seg on" : "seg"} onClick={() => setSize(b)}>
              {b === "전체" ? "전체 평형" : `${b}㎡`}
            </button>
          ))}
        </div>
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="지역">
          {regions.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬">
          {(["종합점수", "가격 낮은 순", "1년 상승률"] as Sort[]).map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="muted tiny">58·52·53㎡처럼 애매한 평수는 59㎡로 묶었어요. <Link href="/budget" className="link-btn">예산 다시 계산하기</Link></span>
      </section>

      <section className="panel find-list">
        <div className="panel-head">
          <h2>{formatEok(budget)}으로 살 수 있는 집</h2>
          <span className="muted">{items.length.toLocaleString()}곳 · 최근 3개월 실거래 기준</span>
        </div>
        {items.length === 0 ? (
          <p className="empty muted">조건에 맞는 단지가 없어요. 예산이나 평형을 바꿔 보세요.</p>
        ) : (
          <ol className="home-list">
            {items.slice(0, shown).map((x, i) => (
              <li key={`${x.c.id}-${x.s.area}`}>
                <span className={i < 3 ? "rank top" : "rank"}>{i + 1}</span>
                <BuildingArt seed={x.c.art} className="home-art" />
                <div className="home-main">
                  <b>{x.c.name}</b>
                  <span className="tiny muted">{x.c.city} {x.c.district} · {x.c.year}년{x.c.households ? ` · ${householdsText(x.c)}` : ""}</span>
                  <span className="tiny">전용 {x.s.area}㎡ ({x.s.pyeong}평) · 종합 {x.score}점 · 1년 <span className={chgClass(x.c.growth.y1)}>{pct(x.c.growth.y1)}</span></span>
                </div>
                <div className="home-price">
                  <b>{formatEok(x.s.price)}</b>
                  <span className="tiny muted">{budget - x.s.price < 0.05 ? "예산과 거의 같음" : `예산보다 ${formatEok(budget - x.s.price)} 여유`}</span>
                  <AddToCompare id={x.c.id} area={x.s.area} />
                </div>
              </li>
            ))}
          </ol>
        )}
        {items.length > shown && (
          <button className="chip-btn more-btn" onClick={() => setShown(shown + 30)}>
            {Math.min(30, items.length - shown)}곳 더 보기 ({shown}/{items.length})
          </button>
        )}
      </section>

      <section className="panel map-panel">
        <div className="panel-head"><h2>지도</h2><span className="muted">빨간 핀이 상위 3곳</span><Link href="/map" className="link-btn right">크게 보기 ↗</Link></div>
        <SketchMap pins={pins} fit={items.slice(0, 5).map((x) => x.c)} label="예산에 맞는 단지 지도" />
      </section>
    </div>
  );
}
