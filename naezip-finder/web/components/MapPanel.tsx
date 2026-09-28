"use client";

import { useState } from "react";
import Icon from "./Icon";
import SketchMap, { type MapPin } from "./SketchMap";
import { hojaeList, regions } from "@/lib/data";
import { formatEok, type Recommendation } from "@/lib/score";
import { SLOT_COLORS, slotPrice, type Slot } from "./Compare";

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
  const pins: MapPin[] = [
    ...(show.recs ? recs.map((r) => ({ id: `${r.complex.id}-${r.area}`, lat: r.complex.lat, lng: r.complex.lng, color: "#4b5563", small: true })) : []),
    ...(show.compare
      ? slots.map((s, i) => ({ id: s.complex.id, lat: s.complex.lat, lng: s.complex.lng, color: SLOT_COLORS[i], label: s.complex.name, sub: formatEok(slotPrice(s)) }))
      : []),
  ];

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
        <SketchMap pins={pins} circles={show.hojae ? hojaeList : []} fit={slots.map((s) => s.complex)} label="비교 단지 위치 지도" />
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
