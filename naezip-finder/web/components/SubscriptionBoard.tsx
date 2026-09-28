"use client";

import { useState } from "react";
import { regions } from "@/lib/data";
import { formatEok } from "@/lib/score";
import { daysUntil, gajeom, marketCompare, statusOf, subscriptions, type SubStatus } from "@/lib/subscription";

const TABS: ("전체" | SubStatus)[] = ["전체", "접수 중", "접수 예정", "발표 대기", "발표 완료"];
const STATUS_CLASS: Record<SubStatus, string> = { "접수 중": "st-live", "접수 예정": "st-soon", "발표 대기": "st-wait", "발표 완료": "st-done" };
const md = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`;

function Stepper({ label, value, unit, max, onChange, hint }: { label: string; value: number; unit: string; max: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="stepper">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`${label} 줄이기`}>−</button>
        <span><b>{value}</b>{unit}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label} 늘리기`}>+</button>
      </div>
      {hint && <span className="tiny muted">{hint}</span>}
    </div>
  );
}

export default function SubscriptionBoard() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("전체");
  const [region, setRegion] = useState("경기도 전체");
  const [g, setG] = useState({ homelessYears: 5, dependents: 2, accountYears: 7 });
  const score = gajeom(g);

  const list = subscriptions
    .filter((s) => tab === "전체" || statusOf(s) === tab)
    .filter((s) => region === "경기도 전체" || s.city === region)
    .sort((a, b) => {
      const order: SubStatus[] = ["접수 중", "접수 예정", "발표 대기", "발표 완료"];
      return order.indexOf(statusOf(a)) - order.indexOf(statusOf(b)) || (statusOf(a) === "발표 완료" ? b.applyStart.localeCompare(a.applyStart) : a.applyStart.localeCompare(b.applyStart));
    });

  return (
    <div className="grid sub-grid">
      <section className="panel">
        <div className="panel-head">
          <div className="pill-tabs">
            {TABS.map((t) => (
              <button key={t} className={tab === t ? "pill on" : "pill"} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <select className="right plain-select" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="지역">
            {[...new Set([...regions, ...subscriptions.map((s) => s.city)])].map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        {list.length === 0 ? (
          <p className="empty muted">조건에 맞는 분양 일정이 없어요.</p>
        ) : (
          <ul className="sub-list">
            {list.map((s) => {
              const st = statusOf(s);
              const main = s.sizes.find((z) => z.area >= 70 && z.area < 95) ?? s.sizes[0];
              const mk = marketCompare(s, main.area);
              const gap = mk ? (main.price - mk.avg) / mk.avg : null;
              const dday = st === "접수 예정" ? daysUntil(s.applyStart) : st === "접수 중" ? daysUntil(s.applyEnd) : st === "발표 대기" ? daysUntil(s.winners) : null;
              return (
                <li key={s.id} className="sub-card">
                  <div className="sub-top">
                    <span className={`status ${STATUS_CLASS[st]}`}>{st}</span>
                    {dday !== null && (
                      <span className="dday">
                        {st === "접수 예정" ? "접수까지 " : st === "접수 중" ? "마감까지 " : "발표까지 "}
                        {dday === 0 ? "오늘" : `D-${dday}`}
                      </span>
                    )}
                    <span className="tiny muted right">{s.type}</span>
                  </div>
                  <h3>{s.name}</h3>
                  <p className="tiny muted">{s.city} {s.district} · {s.households.toLocaleString()}세대</p>
                  <div className="sub-sizes">
                    {s.sizes.map((z) => (
                      <span key={z.area}>{z.area}㎡ <b>{formatEok(z.price)}</b></span>
                    ))}
                  </div>
                  {mk && gap !== null && (
                    <p className="sub-market">
                      {main.area}㎡ 분양가가 주변 시세({formatEok(mk.avg)})보다{" "}
                      <b className={gap < 0 ? "chg down" : "chg up"}>{Math.abs(gap) < 0.01 ? "비슷해요" : gap < 0 ? `${Math.round(-gap * 100)}% 싸요` : `${Math.round(gap * 100)}% 비싸요`}</b>
                      <span className="tiny muted"> · 비교: {mk.names.join(", ")}</span>
                    </p>
                  )}
                  <ol className="timeline">
                    {([["공고", s.announce], ["1순위 접수", `${md(s.applyStart)}~${md(s.applyEnd)}`], ["당첨 발표", s.winners]] as const).map(([k, v]) => (
                      <li key={k}><span className="tiny muted">{k}</span><b>{v.includes("~") ? v : md(v)}</b></li>
                    ))}
                  </ol>
                  {st === "발표 완료" && s.cutline !== undefined && (
                    <p className={score.total >= s.cutline ? "cut ok" : "cut"}>
                      84㎡ 최저 당첨 {s.cutline}점 · 경쟁률 {s.competition}:1 · 내 가점 {score.total}점이면{" "}
                      <b>{score.total >= s.cutline ? "당첨권이었어요" : `${s.cutline - score.total}점 부족했어요`}</b>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="tiny muted">샘플 일정이에요. 실제 일정은 청약홈 분양정보 API를 연결하면 자동으로 채워져요.</p>
      </section>

      <section className="panel gajeom-panel">
        <div className="panel-head"><h2>내 청약 가점</h2><span className="muted">84점 만점</span></div>
        <div className="gajeom-total"><strong>{score.total}</strong><span>점</span></div>
        <div className="gajeom-bars">
          {([["무주택 기간", score.homeless, 32], ["부양가족", score.family, 35], ["청약통장 가입", score.account, 17]] as const).map(([k, v, m]) => (
            <div key={k} className="bar-cell">
              <span className="g-label">{k}</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: `${(v / m) * 100}%`, background: "#ef5a4f" }} /></span>
              <span className="g-val">{v}/{m}</span>
            </div>
          ))}
        </div>
        <div className="form one">
          <Stepper label="무주택 기간" value={g.homelessYears} unit="년" max={15} onChange={(v) => setG({ ...g, homelessYears: v })} hint="만 30세 또는 혼인신고일부터 계산 (15년 이상 만점)" />
          <Stepper label="부양가족 수" value={g.dependents} unit="명" max={6} onChange={(v) => setG({ ...g, dependents: v })} hint="본인 제외, 배우자·자녀·직계존속 (6명 이상 만점)" />
          <Stepper label="청약통장 가입 기간" value={g.accountYears} unit="년" max={15} onChange={(v) => setG({ ...g, accountYears: v })} hint="15년 이상 만점" />
        </div>
        <details className="rules" open>
          <summary>1순위 조건 (경기도 민영주택)</summary>
          <ul>
            <li>비규제지역: 청약통장 가입 1년 이상, 지역별 예치금 충족</li>
            <li>규제지역: 가입 2년 이상, 세대주, 5년 내 당첨 이력 없음, 무주택 또는 1주택</li>
            <li>공공분양·신혼희망타운은 가점이 아니라 납입 횟수·소득·자산 기준으로 뽑아요</li>
          </ul>
        </details>
      </section>
    </div>
  );
}
