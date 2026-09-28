"use client";

import { useMemo, useState } from "react";
import Icon from "./Icon";
import { complexes, regions, type Complex } from "@/lib/data";

export function Skyline() {
  const towers = [
    [520, 70, 34], [560, 110, 30], [596, 150, 36], [640, 95, 28], [676, 175, 40], [724, 130, 32],
    [762, 205, 42], [812, 160, 36], [856, 120, 30], [894, 190, 40], [942, 140, 34], [984, 100, 30],
    [1022, 165, 38], [1068, 125, 32], [1108, 85, 28],
  ];
  return (
    <svg className="hero-skyline" viewBox="0 0 1200 260" preserveAspectRatio="xMaxYMax slice" aria-hidden>
      <defs>
        <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcebf8" />
          <stop offset="1" stopColor="#f6f9fc" />
        </linearGradient>
        <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8d3ea" />
          <stop offset="1" stopColor="#d9e8f4" />
        </linearGradient>
      </defs>
      <rect width="1200" height="260" fill="url(#heroSky)" />
      <path d="M380 200 C520 150 640 170 760 140 S1000 120 1200 150 V260 H380z" fill="#d7e2ec" />
      {towers.map(([x, h, w], i) => (
        <g key={i}>
          <rect x={x} y={215 - h} width={w} height={h} fill={i % 3 ? "#eef2f6" : "#e3e9ef"} stroke="#b9c5d2" strokeWidth="0.8" />
          {Array.from({ length: Math.floor(h / 9) }, (_, r) => (
            <line key={r} x1={x + 3} x2={x + w - 3} y1={222 - h + r * 9} y2={222 - h + r * 9} stroke="#9fb3c8" strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />
          ))}
        </g>
      ))}
      <rect x="380" y="214" width="820" height="46" fill="url(#river)" />
      <path d="M380 214 H1200" stroke="#a9bfd3" strokeWidth="1" />
    </svg>
  );
}

export default function Hero({
  region,
  onRegion,
  onPick,
  inputRef,
}: {
  region: string;
  onRegion: (r: string) => void;
  onPick: (c: Complex) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const q = query.replace(/\s/g, "");
    return complexes
      .filter((c) => region === "경기도 전체" || c.city === region)
      .filter((c) => !q || (c.name + c.city + c.district).replace(/\s/g, "").includes(q))
      .slice(0, 6);
  }, [query, region]);

  const pick = (c: Complex) => {
    onPick(c);
    setQuery("");
    setOpen(false);
  };

  return (
    <header className="hero">
      <Skyline />
      <div className="hero-top">
        <button className="icon-btn" aria-label="도움말">
          <Icon name="help" />
        </button>
        <button className="ghost-btn">
          <Icon name="book" size={16} /> 이용 방법
        </button>
      </div>
      <div className="hero-body">
        <p className="hero-kicker">같은 돈으로, 가장 좋은 집을 찾는</p>
        <h1>
          윤송이의 <em>내집찾기</em>
        </h1>
        <p className="hero-sub">경기도 아파트를 데이터로 비교하고, 나에게 맞는 최적의 선택을 도와드려요.</p>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (matches[0]) pick(matches[0]);
          }}
        >
          <Icon name="search" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="아파트 단지명을 검색해보세요. (예: 동탄역 롯데캐슬, 광교 호반써밋)"
            aria-label="단지 검색"
          />
          <label className="region">
            <Icon name="pin" size={16} />
            <select value={region} onChange={(e) => onRegion(e.target.value)} aria-label="지역">
              {regions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="search-btn">
            <Icon name="search" size={16} /> 검색
          </button>
          {open && matches.length > 0 && (
            <ul className="suggest">
              {matches.map((c) => (
                <li key={c.id}>
                  <button type="button" onMouseDown={() => pick(c)}>
                    <strong>{c.name}</strong>
                    <span>
                      {c.city} {c.district} · {c.year}년 · {c.households.toLocaleString()}세대
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      </div>
    </header>
  );
}
