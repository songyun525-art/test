"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createMapEngine, type LatLng, type MapEngine } from "@/lib/mapEngine";
import { complexes, hojaeList, IS_SAMPLE, regions, type Complex, householdsText } from "@/lib/data";
import { bucketOf, formatEok, pct, totalScore, type Bucket, chgClass } from "@/lib/score";
import { AddToCompare, useCompareSlots } from "./CompareTray";
import { useRegion } from "@/lib/region";

// 가격대별 색 (말풍선 테두리·점)
const BANDS = [
  { max: 5, color: "#2e9e5b", label: "5억 이하" },
  { max: 10, color: "#3e7bfa", label: "5~10억" },
  { max: 15, color: "#e8890c", label: "10~15억" },
  { max: Infinity, color: "#e5484d", label: "15억 초과" },
];
const bandColor = (p: number) => BANDS.find((b) => p <= b.max)!.color;

// 시·군 중심 (지역 선택 시 이동)
const CITY_CENTER: Record<string, [number, number, number]> = {
  "경기도 전체": [37.42, 127.03, 10],
};

const escapeHtml = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

type Item = { c: Complex; area: number; pyeong: number; price: number };

function pickSize(c: Complex, size: "전체" | Bucket) {
  const inBucket = c.sizes.filter((s) => size === "전체" || bucketOf(s.area) === size);
  if (!inBucket.length) return null;
  return inBucket.find((s) => bucketOf(s.area) === "84") ?? inBucket[0];
}

export default function PriceMap() {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapEngine | null>(null);

  const [size, setSize] = useState<"전체" | Bucket>("84");
  const [maxPrice, setMaxPrice] = useState(30);
  const [region, setRegion] = useRegion();
  const [showHojae, setShowHojae] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [visible, setVisible] = useState(0);
  const [tick, setTick] = useState(0); // 지도 이동·확대 때 다시 그리기
  const [ready, setReady] = useState(false);
  const slots = useCompareSlots();

  // 비교함에 담은 단지: 필터와 상관없이 번호 핀으로 항상 보여 줍니다.
  const compared: Item[] = useMemo(
    () =>
      slots.flatMap((s) => {
        const c = complexes.find((x) => x.id === s.id);
        const z = c?.sizes.find((v) => v.area === s.area) ?? c?.sizes[0];
        return c && z ? [{ c, area: z.area, pyeong: z.pyeong, price: s.customPrice ?? z.price }] : [];
      }),
    [slots],
  );
  const fitCompared = () => {
    const m = map.current;
    if (!m || !compared.length) return;
    if (compared.length === 1) m.setView([compared[0].c.lat, compared[0].c.lng], 15);
    else m.fit(compared.map((x) => [x.c.lat, x.c.lng] as LatLng), 15, 70);
    setTick((t) => t + 1);
  };
  const firstFit = useRef(true);

  const items: Item[] = useMemo(
    () =>
      complexes
        .filter((c) => region === "경기도 전체" || c.city === region)
        .map((c) => {
          const s = pickSize(c, size);
          return s ? { c, area: s.area, pyeong: s.pyeong, price: s.price } : null;
        })
        .filter((x): x is Item => !!x && x.price <= maxPrice),
    [size, maxPrice, region],
  );

  // 지도 만들기 (브라우저에서만). 카카오 키가 있으면 카카오맵, 없으면 OpenStreetMap
  useEffect(() => {
    let cancelled = false;
    let engine: MapEngine | null = null;
    const [lat, lng, z] = CITY_CENTER["경기도 전체"];
    createMapEngine(box.current!, [lat, lng], z).then((e) => {
      if (cancelled) return e.destroy();
      engine = e;
      e.onMove(() => setTick((t) => t + 1));
      map.current = e;
      setReady(true);
    });
    return () => {
      cancelled = true;
      engine?.destroy();
      map.current = null;
    };
  }, []);

  // 처음 열 때와 지역을 바꿀 때 그 지역 단지가 모두 보이게 이동
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    // 처음 열 때 비교함에 단지가 있으면 그 단지들이 한눈에 보이게
    if (firstFit.current && compared.length) {
      firstFit.current = false;
      fitCompared();
      return;
    }
    firstFit.current = false;
    if (!items.length) {
      const [lat, lng, z] = CITY_CENTER["경기도 전체"];
      m.setView([lat, lng], z);
    } else {
      m.fit(items.map((x) => [x.c.lat, x.c.lng] as LatLng), 14, 70);
    }
    setTick((t) => t + 1);
    // items 전체가 아니라 지역이 바뀔 때만 이동
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, ready]);

  // 가격 말풍선 그리기: 확대가 작으면 점, 크면 가격까지
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.clearPins();
    const zoom = m.zoom();
    const inView = items.filter((x) => m.inView([x.c.lat, x.c.lng]));
    setVisible(inView.length);
    // 화면 안 단지가 많으면 점으로, 적거나 충분히 확대하면 가격 말풍선으로
    const detailed = inView.length <= 200 || zoom >= 15;
    const comparedIds = new Set(compared.map((x) => x.c.id));
    for (const x of inView) {
      if (comparedIds.has(x.c.id)) continue;
      const color = bandColor(x.price);
      const p: LatLng = [x.c.lat, x.c.lng];
      if (detailed) {
        const html = `<div class="price-pin${selected?.c.id === x.c.id ? " on" : ""}" style="--pin:${color}"><b>${formatEok(x.price)}</b><span>${x.area}㎡${zoom >= 13 ? ` · ${escapeHtml(x.c.name)}` : ""}</span></div>`;
        m.pin(p, html, () => setSelected(x));
      } else {
        m.dot(p, color, () => setSelected(x));
      }
    }
    compared.forEach((x, i) => {
      const html = `<div class="cmp-pin${selected?.c.id === x.c.id ? " on" : ""}"><i>${i + 1}</i><div><b>${escapeHtml(x.c.name)}</b><span>${formatEok(x.price)} · ${x.area}㎡</span></div></div>`;
      m.pin([x.c.lat, x.c.lng], html, () => setSelected(x), true);
    });
  }, [items, tick, selected, compared]);

  // 호재 반경 3km
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.clearCircles();
    if (!showHojae) return;
    for (const h of hojaeList) m.circle([h.lat, h.lng], 3000, `${h.badge} · ${h.title} (${h.status})`);
  }, [showHojae, ready]);

  return (
    <div className="pricemap">
      <div ref={box} className="pricemap-canvas" role="region" aria-label="경기도 아파트 가격 지도" />

      <div className="pm-bar">
        <Link href="/" className="pm-back" aria-label="아파트 비교로 돌아가기">←</Link>
        <b className="pm-title">지도에서 찾기</b>
        <div className="segment" role="radiogroup" aria-label="평형">
          {(["전체", "59", "84"] as const).map((b) => (
            <button key={b} role="radio" aria-checked={size === b} className={size === b ? "seg on" : "seg"} onClick={() => setSize(b)}>
              {b === "전체" ? "전체" : `${b}㎡`}
            </button>
          ))}
        </div>
        <label className="pm-range">
          <span>최대 <b>{maxPrice >= 30 ? "제한 없음" : formatEok(maxPrice)}</b></span>
          <input type="range" min={3} max={30} step={0.5} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} aria-label="최대 가격 (억)" />
        </label>
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="지역">
          {regions.map((r) => <option key={r}>{r}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={showHojae} onChange={(e) => setShowHojae(e.target.checked)} /> 호재 반경</label>
        {compared.length > 0 && (
          <button type="button" className="pm-compare" onClick={fitCompared}>비교 단지 {compared.length}곳 보기</button>
        )}
        <span className="pm-count">화면 안 {visible}개 단지</span>
      </div>

      <div className="pm-legend" aria-label="가격대 색상">
        {BANDS.map((b) => (
          <span key={b.label}><i style={{ background: b.color }} />{b.label}</span>
        ))}
        <span className="tiny muted">최근 3개월 실거래 기준{IS_SAMPLE ? " · 샘플 데이터" : ""}</span>
      </div>

      {selected && (
        <aside className="pm-card">
          <button className="pm-close" onClick={() => setSelected(null)} aria-label="닫기">×</button>
          <h3>{selected.c.name}</h3>
          <p className="tiny muted">{selected.c.city} {selected.c.district} · {selected.c.year}년{selected.c.households ? ` · ${householdsText(selected.c)}` : ""}</p>
          <div className="pm-sizes">
            {selected.c.sizes.map((s) => (
              <div key={s.area} className={s.area === selected.area ? "on" : ""}>
                <span>전용 {s.area}㎡ ({s.pyeong}평)</span>
                <b>{formatEok(s.price)}</b>
                <span className="tiny muted">3개월 {s.trades}건</span>
              </div>
            ))}
          </div>
          <p className="tiny">
            종합 {totalScore(selected.c)}점 · 1년 <span className={chgClass(selected.c.growth.y1)}>{pct(selected.c.growth.y1)}</span> · 5년{" "}
            <span className={chgClass(selected.c.growth.y5)}>{pct(selected.c.growth.y5)}</span> · 역 {selected.c.stationMeters}m
          </p>
          <AddToCompare id={selected.c.id} area={selected.area} className="cta" label="비교함에 담기" />
        </aside>
      )}
    </div>
  );
}
