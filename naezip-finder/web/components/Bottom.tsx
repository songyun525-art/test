"use client";

import { useState } from "react";
import Icon from "./Icon";
import BuildingArt from "./BuildingArt";
import { hojaeList, type Complex, type Hojae } from "@/lib/data";
import { complexesNear, formatEok, totalScore, type Recommendation, type Weights } from "@/lib/score";

export function Recommendations({
  base,
  recs,
  weights,
  liked,
  onToggleLike,
  onAdd,
}: {
  base?: { name: string; price: number };
  recs: Recommendation[];
  weights: Weights;
  liked: Set<string>;
  onToggleLike: (id: string) => void;
  onAdd: (c: Complex, area: number) => void;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? recs : recs.slice(0, 4);
  return (
    <section className="panel recs-panel">
      <div className="panel-head">
        <h2>비슷한 가격대 추천 단지</h2>
        {base && (
          <span className="muted">
            {base.name} ({formatEok(base.price)})과 가격이 비슷한 단지 (±5% 이내)
          </span>
        )}
        {recs.length > 4 && (
          <button className="more right" onClick={() => setAll(!all)}>
            {all ? "접기" : `더보기 (${recs.length})`} <Icon name="right" size={14} />
          </button>
        )}
      </div>
      {recs.length === 0 ? (
        <p className="empty muted">이 가격대(±5%)에 해당하는 다른 단지가 샘플 데이터에 없어요. 지역을 &lsquo;경기도 전체&rsquo;로 바꿔 보세요.</p>
      ) : (
        <div className="recs-grid">
          {shown.map((r) => {
            const d = Math.round(r.diff * 100);
            const isLiked = liked.has(r.complex.id);
            return (
              <article key={`${r.complex.id}-${r.area}`} className="rec-card">
                <BuildingArt seed={r.complex.art} className="rec-art" />
                <div className="rec-body">
                  <div className="rec-title">
                    <h3>{r.complex.name}</h3>
                    <button className={isLiked ? "heart on" : "heart"} onClick={() => onToggleLike(r.complex.id)} aria-label="관심 단지">
                      <Icon name="heart" size={15} fill={isLiked} />
                    </button>
                  </div>
                  <p className="tiny muted">{r.complex.city} {r.complex.district}</p>
                  <p className="tiny">전용 {r.area}㎡ · {totalScore(r.complex, weights)}점</p>
                  <div className="rec-price">
                    <b>{formatEok(r.price)}</b>
                    <span className={d > 0 ? "diff up" : d < 0 ? "diff down" : "diff"}>{d > 0 ? `+${d}` : d}%</span>
                  </div>
                  <button className="link-btn" onClick={() => onAdd(r.complex, r.area)}>비교에 넣기</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const TABS = ["전체", "GTX", "신규 노선", "정비사업"] as const;
const BADGE_CLASS: Record<Hojae["category"], string> = { GTX: "b-purple", "신규 노선": "b-blue", 정비사업: "b-green" };

export function HojaePanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("전체");
  const list = hojaeList.filter((h) => tab === "전체" || h.category === tab);
  return (
    <section className="panel hojae-panel">
      <div className="panel-head">
        <h2>주요 호재 정보</h2>
        <div className="pill-tabs right">
          {TABS.map((t) => (
            <button key={t} className={tab === t ? "pill on" : "pill"} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>
      <ul className="hojae-list">
        {list.map((h) => (
          <li key={h.id}>
            <span className={`hbadge ${BADGE_CLASS[h.category]}`}>{h.badge}</span>
            <div>
              <b>{h.title}</b> <span className="muted">({h.status})</span>
              <div className="tiny muted">{h.detail}</div>
            </div>
            <span className="tiny muted near">반경 3km 내<br />+{complexesNear(h).length}개 단지</span>
          </li>
        ))}
      </ul>
      <p className="tiny muted">샘플 목록입니다. 일정은 공식 발표로 확인이 필요해요.</p>
    </section>
  );
}
