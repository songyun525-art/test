"use client";

import { useState } from "react";
import Icon from "./Icon";
import { hojaeList, regions } from "@/lib/data";
import { formatEok, type Recommendation } from "@/lib/score";
import { SLOT_COLORS, slotPrice, type Slot } from "./Compare";

// 간단한 경기도 약도 (실제 지도는 카카오맵 연동 단계에서 교체)
const W = 400;
const H = 300;
const BOUNDS = { west: 126.62, east: 127.4, south: 37.12, north: 37.73 };

const LABELS: [string, number, number, boolean?][] = [
  ["서울특별시", 37.575, 126.99, true],
  ["인천광역시", 37.46, 126.7, true],
  ["고양시", 37.665, 126.84],
  ["하남시", 37.54, 127.23],
  ["성남시", 37.43, 127.15],
  ["안양시", 37.4, 126.925],
  ["용인시", 37.24, 127.2],
  ["수원시", 37.3, 126.99],
  ["화성시", 37.16, 126.96],
  ["오산시", 37.14, 127.07],
];

const RIVER: [number, number][] = [
  [37.63, 126.66], [37.6, 126.77], [37.575, 126.86], [37.54, 126.92], [37.52, 126.98],
  [37.515, 127.03], [37.525, 127.08], [37.545, 127.12], [37.56, 127.19], [37.555, 127.28], [37.54, 127.4],
];

function project(lat: number, lng: number) {
  return {
    x: ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * W,
    y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * H,
  };
}

function Pin({ x, y, color, k, label, sub }: { x: number; y: number; color: string; k: number; label?: string; sub?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${1 / k})`}>
      <path d="M0 0 C-3 -6 -8 -9 -8 -15 A8 8 0 1 1 8 -15 C8 -9 3 -6 0 0z" fill={color} stroke="#fff" strokeWidth="1.5" />
      <circle cy="-15" r="3" fill="#fff" />
      {label && (
        <g transform="translate(10 -30)">
          <rect width={Math.max(label.length * 9.5, 50) + 12} height="30" rx="4" fill="#fff" stroke={color} strokeWidth="1" />
          <text x="6" y="13" fontSize="10" fontWeight="700" fill="#1f2530">{label}</text>
          <text x="6" y="25" fontSize="10" fontWeight="700" fill={color}>{sub}</text>
        </g>
      )}
    </g>
  );
}

export default function MapPanel({
  slots,
  recs,
  region,
  onRegion,
}: {
  slots: Slot[];
  recs: Recommendation[];
  region: string;
  onRegion: (r: string) => void;
}) {
  const [view, setView] = useState<"map" | "list">("map");
  const [show, setShow] = useState({ compare: true, recs: true, hojae: true });
  const [zoom, setZoom] = useState(1);

  // 비교 단지가 모두 보이도록 자동으로 맞춘 뒤, +/- 버튼으로 배율 조정
  const pts = slots.map((s) => project(s.complex.lat, s.complex.lng));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const fit = pts.length
    ? Math.min(W / (Math.max(...xs) - Math.min(...xs) + 220), H / (Math.max(...ys) - Math.min(...ys) + 140))
    : 1;
  const k = Math.min(Math.max(fit * zoom, 1), 8);
  const vw = W / k;
  const vh = H / k;
  const focus = pts.length
    ? { x: (Math.max(...xs) + Math.min(...xs)) / 2 + 30 / k, y: (Math.max(...ys) + Math.min(...ys)) / 2 - 10 / k }
    : { x: W / 2, y: H / 2 };
  const vx = Math.min(Math.max(focus.x - vw / 2, 0), W - vw);
  const vy = Math.min(Math.max(focus.y - vh / 2, 0), H - vh);
  const river = RIVER.map(([la, ln]) => project(la, ln)).map((p) => `${p.x},${p.y}`).join(" ");
  const seoul = project(37.56, 126.99);
  const r3km = (3 / 88.4 / (BOUNDS.east - BOUNDS.west)) * W;

  return (
    <section className="panel map-panel">
      <div className="tabs">
        <button className={view === "map" ? "tab on" : "tab"} onClick={() => setView("map")}>
          <Icon name="pin" size={16} /> 지도에서 보기
        </button>
        <button className={view === "list" ? "tab on" : "tab"} onClick={() => setView("list")}>
          <Icon name="list" size={16} /> 리스트로 보기
        </button>
      </div>
      <div className="map-filters">
        <select value={region} onChange={(e) => onRegion(e.target.value)} aria-label="지역">
          {regions.map((r) => <option key={r}>{r}</option>)}
        </select>
        {([
          ["compare", "비교 단지"],
          ["recs", "추천 단지"],
          ["hojae", "호재 지역"],
        ] as const).map(([key, label]) => (
          <label key={key} className="check">
            <input type="checkbox" checked={show[key]} onChange={() => setShow({ ...show, [key]: !show[key] })} />
            {label}
          </label>
        ))}
      </div>
      {view === "map" ? (
        <div className="map-box">
          <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="비교 단지 위치 지도">
            <rect x="-50" y="-50" width={W + 100} height={H + 100} fill="#eef2ea" />
            <path d={`M-50 ${H + 50} L-50 150 L20 170 L35 230 L10 270 L30 ${H + 50}z`} fill="#cfe0ef" />
            <ellipse cx={seoul.x} cy={seoul.y} rx="72" ry="45" fill="#f6ecd9" stroke="#e1cfae" strokeDasharray="3 3" />
            <polyline points={river} fill="none" stroke="#b9d3ea" strokeWidth={7 / Math.sqrt(k)} strokeLinecap="round" />
            {LABELS.map(([name, la, ln, big]) => {
              const p = project(la, ln);
              return (
                <text key={name} x={p.x} y={p.y} textAnchor="middle" fontSize={(big ? 12 : 10) / Math.sqrt(k)} fill={big ? "#3a414d" : "#6b7280"} fontWeight={big ? 700 : 500}>
                  {name}
                </text>
              );
            })}
            {show.hojae &&
              hojaeList.map((h) => {
                const p = project(h.lat, h.lng);
                return <circle key={h.id} cx={p.x} cy={p.y} r={r3km} fill="#f59e0b" opacity="0.12" stroke="#f59e0b" strokeOpacity="0.4" strokeDasharray="2 2" />;
              })}
            {show.recs &&
              recs.map((r) => {
                const p = project(r.complex.lat, r.complex.lng);
                return <Pin key={`${r.complex.id}-${r.area}`} x={p.x} y={p.y} color="#4b5563" k={k * 1.4} />;
              })}
            {show.compare &&
              slots.map((s, i) => {
                const p = project(s.complex.lat, s.complex.lng);
                return (
                  <Pin key={s.complex.id} x={p.x} y={p.y} color={SLOT_COLORS[i]} k={k} label={s.complex.name} sub={formatEok(slotPrice(s))} />
                );
              })}
          </svg>
          <div className="zoom">
            <button onClick={() => setZoom(zoom * 1.5)} aria-label="확대">+</button>
            <button onClick={() => setZoom(Math.max(zoom / 1.5, 1 / 8))} aria-label="축소">−</button>
          </div>
          <span className="map-note">약도 · 샘플 위치</span>
        </div>
      ) : (
        <div className="map-list">
          <table>
            <tbody>
              {slots.map((s, i) => (
                <tr key={s.complex.id}>
                  <td><span className="dot" style={{ background: SLOT_COLORS[i] }} />{s.complex.name}</td>
                  <td className="muted">{s.complex.city}</td>
                  <td className="num-cell">{formatEok(slotPrice(s))}</td>
                </tr>
              ))}
              {recs.map((r) => (
                <tr key={`${r.complex.id}-${r.area}`}>
                  <td><span className="dot" style={{ background: "#4b5563" }} />{r.complex.name} <span className="muted">{r.area}㎡</span></td>
                  <td className="muted">{r.complex.city}</td>
                  <td className="num-cell">{formatEok(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
