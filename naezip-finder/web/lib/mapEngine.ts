/* eslint-disable @typescript-eslint/no-explicit-any */
// 지도 엔진: 카카오 JavaScript 키(NEXT_PUBLIC_KAKAO_JS_KEY)가 있으면 카카오맵,
// 없으면 OpenStreetMap(Leaflet)을 씁니다. 화면 코드는 이 인터페이스만 사용합니다.
import type * as L from "leaflet";

export type LatLng = [number, number];

export interface MapEngine {
  kind: "kakao" | "osm";
  /** Leaflet 기준 확대 단계 (카카오 레벨은 20 - level 로 맞춤) */
  zoom(): number;
  /** 화면(조금 넓게) 안에 있는지 */
  inView(p: LatLng): boolean;
  setView(p: LatLng, zoom: number): void;
  fit(points: LatLng[], maxZoom: number, topPadding: number): void;
  onMove(cb: () => void): void;
  clearPins(): void;
  pin(p: LatLng, html: string, onClick: () => void): void;
  dot(p: LatLng, color: string, onClick: () => void): void;
  clearCircles(): void;
  circle(p: LatLng, radius: number, title: string): void;
  destroy(): void;
}

export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";

export async function createMapEngine(el: HTMLElement, center: LatLng, zoom: number): Promise<MapEngine> {
  if (KAKAO_JS_KEY) {
    try {
      return await createKakao(el, center, zoom);
    } catch (e) {
      // 도메인 미등록·키 오류면 OpenStreetMap으로 대신 보여 줍니다.
      console.warn("카카오맵을 불러오지 못해 OpenStreetMap으로 표시합니다.", e);
      el.innerHTML = "";
    }
  }
  return createLeaflet(el, center, zoom);
}

/* ---------- OpenStreetMap (Leaflet) ---------- */
async function createLeaflet(el: HTMLElement, center: LatLng, zoom: number): Promise<MapEngine> {
  const mod = await import("leaflet");
  const Lf = (mod as unknown as { default?: typeof L }).default ?? (mod as unknown as typeof L);
  const m = Lf.map(el, { zoomControl: false, preferCanvas: true }).setView(center, zoom);
  Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(m);
  Lf.control.zoom({ position: "bottomright" }).addTo(m);
  const circles = Lf.layerGroup().addTo(m);
  const pins = Lf.layerGroup().addTo(m);
  return {
    kind: "osm",
    zoom: () => m.getZoom(),
    inView: (p) => m.getBounds().pad(0.2).contains(p),
    setView: (p, z) => m.setView(p, z),
    fit: (points, maxZoom, top) => m.fitBounds(Lf.latLngBounds(points).pad(0.15), { maxZoom, paddingTopLeft: [0, top] }),
    onMove: (cb) => m.on("moveend zoomend", cb),
    clearPins: () => pins.clearLayers(),
    pin: (p, html, onClick) =>
      Lf.marker(p, { icon: Lf.divIcon({ className: "price-pin-wrap", html, iconSize: undefined, iconAnchor: [0, 0] }), riseOnHover: true })
        .on("click", onClick)
        .addTo(pins),
    dot: (p, color, onClick) =>
      Lf.circleMarker(p, { radius: 5, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.95 }).on("click", onClick).addTo(pins),
    clearCircles: () => circles.clearLayers(),
    circle: (p, radius, title) =>
      Lf.circle(p, { radius, color: "#f59e0b", weight: 1, dashArray: "4 4", fillOpacity: 0.08 }).bindTooltip(title).addTo(circles),
    destroy: () => m.remove(),
  };
}

/* ---------- 카카오맵 ---------- */
let kakaoLoading: Promise<any> | null = null;

function loadKakao(): Promise<any> {
  const w = window as any;
  if (w.kakao?.maps?.LatLng) return Promise.resolve(w.kakao);
  kakaoLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&autoload=false`;
    s.async = true;
    s.onload = () => (w.kakao?.maps ? w.kakao.maps.load(() => resolve(w.kakao)) : reject(new Error("kakao sdk")));
    s.onerror = () => reject(new Error("kakao sdk load failed"));
    document.head.appendChild(s);
  }).catch((e) => {
    kakaoLoading = null;
    throw e;
  });
  return kakaoLoading;
}

const toLevel = (zoom: number) => Math.min(14, Math.max(1, Math.round(20 - zoom)));

async function createKakao(el: HTMLElement, center: LatLng, zoom: number): Promise<MapEngine> {
  const kakao = await loadKakao();
  const km = kakao.maps;
  const m = new km.Map(el, { center: new km.LatLng(center[0], center[1]), level: toLevel(zoom) });
  m.addControl(new km.ZoomControl(), km.ControlPosition.BOTTOMRIGHT);
  let pins: any[] = [];
  let circles: any[] = [];

  const overlay = (p: LatLng, node: HTMLElement, onClick: () => void) => {
    node.addEventListener("click", onClick);
    const o = new km.CustomOverlay({ position: new km.LatLng(p[0], p[1]), content: node, xAnchor: 0, yAnchor: 0, clickable: true });
    o.setMap(m);
    pins.push(o);
  };

  return {
    kind: "kakao",
    zoom: () => 20 - m.getLevel(),
    inView: ([lat, lng]) => {
      const b = m.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const dLat = (ne.getLat() - sw.getLat()) * 0.2;
      const dLng = (ne.getLng() - sw.getLng()) * 0.2;
      return lat >= sw.getLat() - dLat && lat <= ne.getLat() + dLat && lng >= sw.getLng() - dLng && lng <= ne.getLng() + dLng;
    },
    setView: (p, z) => {
      m.setLevel(toLevel(z));
      m.setCenter(new km.LatLng(p[0], p[1]));
    },
    fit: (points, maxZoom, top) => {
      const b = new km.LatLngBounds();
      for (const [lat, lng] of points) b.extend(new km.LatLng(lat, lng));
      m.setBounds(b, top + 20, 20, 40, 20);
      if (m.getLevel() < toLevel(maxZoom)) m.setLevel(toLevel(maxZoom));
    },
    onMove: (cb) => km.event.addListener(m, "idle", cb),
    clearPins: () => {
      pins.forEach((o) => o.setMap(null));
      pins = [];
    },
    pin: (p, html, onClick) => {
      const node = document.createElement("div");
      node.className = "price-pin-wrap";
      node.innerHTML = html;
      overlay(p, node, onClick);
    },
    dot: (p, color, onClick) => {
      const node = document.createElement("div");
      node.className = "price-dot";
      node.style.background = color;
      overlay(p, node, onClick);
    },
    clearCircles: () => {
      circles.forEach((c) => c.setMap(null));
      circles = [];
    },
    circle: (p, radius) => {
      const c = new km.Circle({
        center: new km.LatLng(p[0], p[1]),
        radius,
        strokeWeight: 1,
        strokeColor: "#f59e0b",
        strokeStyle: "dash",
        fillColor: "#f59e0b",
        fillOpacity: 0.08,
      });
      c.setMap(m);
      circles.push(c);
    },
    destroy: () => {
      pins.forEach((o) => o.setMap(null));
      circles.forEach((c) => c.setMap(null));
      el.innerHTML = "";
    },
  };
}
