"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as L from "leaflet";
import { complexes, hojaeList, regions, type Complex } from "@/lib/data";
import { bucketOf, formatEok, pct, totalScore, type Bucket } from "@/lib/score";

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

type Item = { c: Complex; area: number; pyeong: number; price: number };

function pickSize(c: Complex, size: "전체" | Bucket) {
  const inBucket = c.sizes.filter((s) => size === "전체" || bucketOf(s.area) === size);
  if (!inBucket.length) return null;
  return inBucket.find((s) => bucketOf(s.area) === "84") ?? inBucket[0];
}

export default function PriceMap() {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const hojaeLayer = useRef<L.LayerGroup | null>(null);
  const leaflet = useRef<typeof L | null>(null);

  const [size, setSize] = useState<"전체" | Bucket>("84");
  const [maxPrice, setMaxPrice] = useState(30);
  const [region, setRegion] = useState("경기도 전체");
  const [showHojae, setShowHojae] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [visible, setVisible] = useState(0);
  const [tick, setTick] = useState(0); // 지도 이동·확대 때 다시 그리기
  const [ready, setReady] = useState(false);

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

  // 지도 만들기 (브라우저에서만)
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !box.current || map.current) return;
      const Lf = (mod as unknown as { default?: typeof L }).default ?? (mod as unknown as typeof L);
      leaflet.current = Lf;
      const m = Lf.map(box.current, { zoomControl: false, preferCanvas: true }).setView([37.42, 127.03], 10);
      Lf.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(m);
      Lf.control.zoom({ position: "bottomright" }).addTo(m);
      hojaeLayer.current = Lf.layerGroup().addTo(m);
      layer.current = Lf.layerGroup().addTo(m);
      m.on("moveend zoomend", () => setTick((t) => t + 1));
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 처음 열 때와 지역을 바꿀 때 그 지역 단지가 모두 보이게 이동
  useEffect(() => {
    const m = map.current;
    const Lf = leaflet.current;
    if (!m || !Lf) return;
    if (!items.length) {
      const [lat, lng, z] = CITY_CENTER["경기도 전체"];
      m.setView([lat, lng], z);
    } else {
      m.fitBounds(Lf.latLngBounds(items.map((x) => [x.c.lat, x.c.lng] as [number, number])).pad(0.15), {
        maxZoom: 14,
        paddingTopLeft: [0, 70],
      });
    }
    setTick((t) => t + 1);
    // items 전체가 아니라 지역이 바뀔 때만 이동
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, ready]);

  // 가격 말풍선 그리기: 확대가 작으면 점, 크면 가격까지
  useEffect(() => {
    const m = map.current;
    const Lf = leaflet.current;
    const g = layer.current;
    if (!m || !Lf || !g) return;
    g.clearLayers();
    const bounds = m.getBounds().pad(0.2);
    const zoom = m.getZoom();
    const inView = items.filter((x) => bounds.contains([x.c.lat, x.c.lng]));
    setVisible(inView.length);
    const detailed = zoom >= 11 || inView.length <= 60;
    for (const x of inView) {
      const color = bandColor(x.price);
      const marker = detailed
        ? Lf.marker([x.c.lat, x.c.lng], {
            icon: Lf.divIcon({
              className: "price-pin-wrap",
              html: `<div class="price-pin${selected?.c.id === x.c.id ? " on" : ""}" style="--pin:${color}"><b>${formatEok(x.price)}</b><span>${x.area}㎡${zoom >= 13 ? ` · ${x.c.name}` : ""}</span></div>`,
              iconSize: undefined,
              iconAnchor: [0, 0],
            }),
            riseOnHover: true,
          })
        : Lf.circleMarker([x.c.lat, x.c.lng], { radius: 5, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.95 });
      marker.on("click", () => setSelected(x));
      marker.addTo(g);
    }
  }, [items, tick, selected]);

  // 호재 반경 3km
  useEffect(() => {
    const Lf = leaflet.current;
    const g = hojaeLayer.current;
    if (!Lf || !g) return;
    g.clearLayers();
    if (!showHojae) return;
    for (const h of hojaeList) {
      Lf.circle([h.lat, h.lng], { radius: 3000, color: "#f59e0b", weight: 1, dashArray: "4 4", fillOpacity: 0.08 })
        .bindTooltip(`${h.badge} · ${h.title} (${h.status})`)
        .addTo(g);
    }
  }, [showHojae, tick]);

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
        <span className="pm-count">화면 안 {visible}개 단지</span>
      </div>

      <div className="pm-legend" aria-label="가격대 색상">
        {BANDS.map((b) => (
          <span key={b.label}><i style={{ background: b.color }} />{b.label}</span>
        ))}
        <span className="tiny muted">최근 3개월 실거래 평균 · 샘플 데이터</span>
      </div>

      {selected && (
        <aside className="pm-card">
          <button className="pm-close" onClick={() => setSelected(null)} aria-label="닫기">×</button>
          <h3>{selected.c.name}</h3>
          <p className="tiny muted">{selected.c.city} {selected.c.district} · {selected.c.year}년 · {selected.c.households.toLocaleString()}세대</p>
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
            종합 {totalScore(selected.c)}점 · 1년 <span className={selected.c.growth.y1 >= 0 ? "chg up" : "chg down"}>{pct(selected.c.growth.y1)}</span> · 5년{" "}
            <span className={selected.c.growth.y5 >= 0 ? "chg up" : "chg down"}>{pct(selected.c.growth.y5)}</span> · 역 {selected.c.stationMeters}m
          </p>
          <Link className="cta" href={`/?compare=${selected.c.id}:${selected.area}`}>이 단지 비교하기</Link>
        </aside>
      )}
    </div>
  );
}
