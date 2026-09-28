// 청약홈 분양정보(한국부동산원, 공공데이터포털)에서 경기도 분양 공고를 받아 lib/subscriptions.json으로 저장합니다.
// 실행: DATA_GO_KR_KEY=... KAKAO_REST_KEY=... node scripts/fetch-subscriptions.mjs
// (프록시 뒤에서는 NODE_USE_ENV_PROXY=1 을 함께 붙입니다)
// 키는 저장소에 넣지 않고 환경변수로만 받습니다.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const KEY = process.env.DATA_GO_KR_KEY;
const KAKAO = process.env.KAKAO_REST_KEY;
if (!KEY) {
  console.error("DATA_GO_KR_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const BASE = "https://api.odcloud.kr/api";
const DAYS_BACK = 150;
const OUT = fileURLToPath(new URL("../lib/subscriptions.json", import.meta.url));

async function odcloud(path, cond, perPage = 100) {
  const rows = [];
  for (let page = 1; page < 50; page++) {
    const url = new URL(`${BASE}/${path}`);
    url.searchParams.set("serviceKey", KEY);
    url.searchParams.set("page", String(page));
    url.searchParams.set("perPage", String(perPage));
    for (const [k, v] of Object.entries(cond)) url.searchParams.set(`cond[${k}]`, v);
    let res;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        res = await fetch(url);
        if (res.ok) break;
      } catch {
        /* 네트워크 오류는 재시도 */
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
    if (!res?.ok) throw new Error(`${path} 호출 실패 (${res?.status ?? "network"})`);
    const body = await res.json();
    rows.push(...body.data);
    if (rows.length >= body.matchCount || body.data.length === 0) break;
  }
  return rows;
}

async function geocode(address, name) {
  if (!KAKAO) return null;
  const tries = [
    ["address", address.replace(/\(.*$/, "").replace(/(번지|일원|일대|외).*$/, "").trim()],
    ["keyword", name.replace(/\(.*?\)/g, "").trim()],
    ["address", address.split(" ").slice(0, 3).join(" ")],
  ];
  for (const [kind, query] of tries) {
    if (!query) continue;
    const url = new URL(`https://dapi.kakao.com/v2/local/search/${kind}.json`);
    url.searchParams.set("query", query);
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO}` } }).catch(() => null);
    if (!res?.ok) continue;
    const doc = (await res.json()).documents?.find((d) => (d.address_name ?? d.address?.address_name ?? "").startsWith("경기"));
    if (doc) return { lat: Number(doc.y), lng: Number(doc.x) };
  }
  return null;
}

const typeOf = (r) =>
  r.HOUSE_SECD_NM === "신혼희망타운" ? "신혼희망타운" : r.HOUSE_DTL_SECD_NM === "민영" ? "민영" : "공공분양";

const areaOf = (houseTy) => Number(String(houseTy).replace(/[^0-9.]/g, ""));
const num = (v) => (v === null || v === undefined || v === "" || v === "-" ? null : Number(String(v).replace(/[^0-9.]/g, "")) || null);

const since = new Date(Date.now() - DAYS_BACK * 86400000).toISOString().slice(0, 10);
const notices = (
  await odcloud("ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail", {
    "SUBSCRPT_AREA_CODE_NM::EQ": "경기",
    "RCRIT_PBLANC_DE::GTE": since,
  })
).filter((r) => r.RENT_SECD === "0" || r.RENT_SECD_NM === "분양주택");

console.log(`경기도 분양 공고 ${notices.length}건 (${since} 이후)`);

const out = [];
for (const r of notices) {
  const cond = { "HOUSE_MANAGE_NO::EQ": r.HOUSE_MANAGE_NO };
  const [models, cmpet, scores] = await Promise.all([
    odcloud("ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl", cond),
    odcloud("ApplyhomeInfoCmpetRtSvc/v1/getAPTLttotPblancCmpet", cond).catch(() => []),
    odcloud("ApplyhomeInfoCmpetRtSvc/v1/getAptLttotPblancScore", cond).catch(() => []),
  ]);

  // 주택형별 분양가(최고가, 만원 → 억). 같은 전용면적대는 가장 비싼 값으로 묶습니다.
  const sizeMap = new Map();
  for (const m of models) {
    const area = Math.floor(areaOf(m.HOUSE_TY)); // 084.98 → 84
    const price = num(m.LTTOT_TOP_AMOUNT);
    if (!area || !price) continue;
    const prev = sizeMap.get(area);
    sizeMap.set(area, Math.max(prev ?? 0, Math.round(price / 1000) / 10));
  }
  const sizes = [...sizeMap.entries()].sort((a, b) => a[0] - b[0]).map(([area, price]) => ({ area, price }));

  // 대표 평형: 84㎡대, 없으면 공급이 가장 많은 평형
  const main = models.find((m) => areaOf(m.HOUSE_TY) >= 76 && areaOf(m.HOUSE_TY) < 95) ?? models[0];
  let competition = null;
  let cutline = null;
  if (main) {
    const rank1 = cmpet.filter((c) => c.HOUSE_TY === main.HOUSE_TY && Number(c.SUBSCRPT_RANK_CODE) === 1);
    const req = rank1.reduce((t, c) => t + (num(c.REQ_CNT) ?? 0), 0);
    const supply = num(rank1[0]?.SUPLY_HSHLDCO);
    if (supply && req) competition = Math.round((req / supply) * 10) / 10;
    const local = scores.find((s) => s.HOUSE_TY === main.HOUSE_TY && s.RESIDE_SENM === "해당지역") ?? scores.find((s) => s.HOUSE_TY === main.HOUSE_TY);
    cutline = num(local?.LWET_SCORE);
  }

  const addr = (r.HSSPLY_ADRES ?? "").replace(/^[\s(]+/, "");
  const tokens = addr.replace(/^경기도?\s*/, "").split(/\s+/);
  const geo = await geocode(addr, r.HOUSE_NM);
  out.push({
    id: r.HOUSE_MANAGE_NO,
    name: r.HOUSE_NM,
    city: /[시군]$/.test(tokens[0] ?? "") ? tokens[0] : `${tokens[0] ?? ""}시`,
    district: tokens[1] ?? "",
    address: addr,
    type: typeOf(r),
    households: r.TOT_SUPLY_HSHLDCO,
    sizes,
    announce: r.RCRIT_PBLANC_DE,
    applyStart: r.RCEPT_BGNDE,
    applyEnd: r.RCEPT_ENDDE,
    winners: r.PRZWNER_PRESNATN_DE,
    moveIn: r.MVN_PREARNGE_YM ? `${r.MVN_PREARNGE_YM.slice(0, 4)}.${Number(r.MVN_PREARNGE_YM.slice(4))}` : null,
    regulated: r.SPECLT_RDN_EARTH_AT === "Y" || r.MDAT_TRGET_AREA_SECD === "Y",
    priceCap: r.PARCPRC_ULS_AT === "Y",
    url: r.PBLANC_URL,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    competition,
    cutline,
  });
  process.stdout.write(".");
}

out.sort((a, b) => b.announce.localeCompare(a.announce));
writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString().slice(0, 10), items: out }, null, 1) + "\n");
console.log(`\n저장: ${OUT} (${out.length}건, 좌표 없음 ${out.filter((o) => o.lat === null).length}건)`);
