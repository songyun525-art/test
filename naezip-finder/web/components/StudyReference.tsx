"use client";

import Link from "next/link";
import { useState } from "react";
import { cities, complexes, type Complex } from "@/lib/data";
import { bucketOf, formatEok, pct } from "@/lib/score";

const TABS = ["시별 대장아파트", "1년 상승 TOP", "1년 하락 TOP", "거래 활발 TOP"] as const;
type Tab = (typeof TABS)[number];

const STEPS = [
  { t: "대장아파트부터", d: "관심 있는 시의 가장 비싼 단지가 그 지역 시세의 천장이에요. 대장 가격을 기준으로 나머지 단지를 비교해 보세요." },
  { t: "오르고 내린 곳 비교", d: "1년 상승·하락 TOP을 나란히 보면 어떤 입지(역세권, 신축, 호재)가 시장에서 먼저 반응하는지 보여요." },
  { t: "거래량 확인", d: "가격이 올라도 거래가 없으면 신호가 약해요. 거래가 활발한 단지는 시세가 믿을 만해요." },
  { t: "내 예산과 연결", d: "예산을 구하고, 그 가격대의 단지를 직접 비교해 보면 공부가 곧 내 집 찾기가 돼요." },
];

const main84 = (c: Complex) => c.sizes.find((s) => bucketOf(s.area) === "84") ?? c.sizes[c.sizes.length - 1];
const perPyeong = (c: Complex) => (main84(c).price * 10000) / main84(c).pyeong; // 만원/평
const trades = (c: Complex) => c.sizes.reduce((s, z) => s + z.trades, 0);

export default function StudyReference() {
  const [tab, setTab] = useState<Tab>("시별 대장아파트");
  const [city, setCity] = useState("경기도 전체");
  const pool = complexes.filter((c) => city === "경기도 전체" || c.city === city);

  let rows: { c: Complex; value: React.ReactNode; sub?: string }[] = [];
  if (tab === "시별 대장아파트") {
    if (city === "경기도 전체") {
      rows = cities
        .map((ct) => complexes.filter((c) => c.city === ct).sort((a, b) => perPyeong(b) - perPyeong(a))[0])
        .sort((a, b) => perPyeong(b) - perPyeong(a))
        .map((c) => ({ c, value: formatEok(main84(c).price), sub: `평당 ${Math.round(perPyeong(c)).toLocaleString()}만원` }));
    } else {
      rows = [...pool].sort((a, b) => perPyeong(b) - perPyeong(a)).map((c) => ({ c, value: formatEok(main84(c).price), sub: `평당 ${Math.round(perPyeong(c)).toLocaleString()}만원` }));
    }
  } else if (tab === "1년 상승 TOP") {
    rows = pool.filter((c) => c.growth.y1 > 0).sort((a, b) => b.growth.y1 - a.growth.y1).map((c) => ({ c, value: <span className="chg up">{pct(c.growth.y1)}</span>, sub: formatEok(main84(c).price) }));
  } else if (tab === "1년 하락 TOP") {
    rows = pool.filter((c) => c.growth.y1 < 0).sort((a, b) => a.growth.y1 - b.growth.y1).map((c) => ({ c, value: <span className="chg down">{pct(c.growth.y1)}</span>, sub: formatEok(main84(c).price) }));
  } else {
    rows = [...pool].sort((a, b) => trades(b) - trades(a)).map((c) => ({ c, value: `${trades(c)}건`, sub: "최근 3개월" }));
  }
  rows = rows.slice(0, 10);

  return (
    <div className="grid study-grid">
      <section className="panel wide">
        <div className="panel-head"><h2>어디부터 공부할까요?</h2><span className="muted">아직 돈이 없어도 지금부터 볼 수 있는 순서예요.</span></div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.t}>
              <span className="step-num">{i + 1}</span>
              <b>{s.t}</b>
              <p className="tiny muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel wide">
        <div className="panel-head">
          <div className="pill-tabs">
            {TABS.map((t) => (
              <button key={t} className={tab === t ? "pill on" : "pill"} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <select className="right" value={city} onChange={(e) => setCity(e.target.value)} aria-label="지역">
            {["경기도 전체", ...cities].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {rows.length === 0 ? (
          <p className="empty muted">이 지역에는 해당하는 단지가 샘플 데이터에 없어요.</p>
        ) : (
          <table className="rank-table">
            <thead>
              <tr><th>순위</th><th>단지</th><th>지역</th><th>{tab === "거래 활발 TOP" ? "거래" : tab === "시별 대장아파트" ? "84㎡ 실거래가" : "1년 변동"}</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.c.id}>
                  <td><span className={i < 3 ? "rank top" : "rank"}>{i + 1}</span></td>
                  <td><b>{r.c.name}</b><div className="tiny muted">{r.c.year}년 · {r.c.households.toLocaleString()}세대</div></td>
                  <td className="muted">{r.c.city} {r.c.district}</td>
                  <td><b>{r.value}</b><div className="tiny muted">{r.sub}</div></td>
                  <td><Link className="link-btn" href={`/?compare=${r.c.id}:${main84(r.c).area}`}>비교하기</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="tiny muted">샘플 데이터 기준이에요. 실거래 수집이 끝나면 경기도 전체 단지로 바뀌어요.</p>
      </section>
    </div>
  );
}
