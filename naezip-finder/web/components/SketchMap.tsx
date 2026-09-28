"use client";

import { useState } from "react";

// 간단한 경기도 약도 (실제 지도는 카카오맵 연동 단계에서 교체)
const W = 400;
const H = 300;
const BOUNDS = { west: 126.62, east: 127.4, south: 37.12, north: 37.73 };

const LABELS: [string, number, number, boolean?][] = [
  ["서울특별시", 37.575, 126.99, true],
  ["인천광역시", 37.46, 126.7, true],
  ["고양시", 37.665, 126.84],
  ["김포시", 37.64, 126.66],
  ["부천시", 37.49, 126.78],
  ["광명시", 37.44, 126.86],
  ["구리시", 37.6, 127.12],
  ["남양주시", 37.64, 127.22],
  ["하남시", 37.54, 127.23],
  ["성남시", 37.43, 127.15],
  ["과천시", 37.445, 127.0],
  ["안양시", 37.4, 126.925],
  ["군포시", 37.35, 126.9],
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

export type MapPin = { id: string; lat: number; lng: number; color: string; label?: string; sub?: string; small?: boolean };
export type MapCircle = { id: string; lat: number; lng: number };

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

export default function SketchMap({
  pins,
  circles = [],
  fit,
  label = "단지 위치 지도",
}: {
  pins: MapPin[];
  circles?: MapCircle[];
  fit: { lat: number; lng: number }[];
  label?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const pts = fit.map((p) => project(p.lat, p.lng));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const fitK = pts.length
    ? Math.min(W / (Math.max(...xs) - Math.min(...xs) + 220), H / (Math.max(...ys) - Math.min(...ys) + 140))
    : 1;
  const k = Math.min(Math.max(fitK * zoom, 1), 8);
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
    <div className="map-box">
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
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
        {circles.map((c) => {
          const p = project(c.lat, c.lng);
          return <circle key={c.id} cx={p.x} cy={p.y} r={r3km} fill="#f59e0b" opacity="0.12" stroke="#f59e0b" strokeOpacity="0.4" strokeDasharray="2 2" />;
        })}
        {[...pins].sort((a, b) => Number(!a.small) - Number(!b.small)).map((pin) => {
          const p = project(pin.lat, pin.lng);
          return <Pin key={pin.id} x={p.x} y={p.y} color={pin.color} k={pin.small ? k * 1.4 : k} label={pin.label} sub={pin.sub} />;
        })}
      </svg>
      <div className="zoom">
        <button onClick={() => setZoom(zoom * 1.5)} aria-label="확대">+</button>
        <button onClick={() => setZoom(Math.max(zoom / 1.5, 1 / 8))} aria-label="축소">−</button>
      </div>
      <span className="map-note">약도 · 샘플 위치</span>
    </div>
  );
}
