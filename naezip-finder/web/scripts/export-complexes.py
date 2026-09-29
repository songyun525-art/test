"""수집기 DB(naezip.sqlite)를 사이트용 단지 데이터(lib/complexes.json)로 바꿉니다.

1. geo   : 단지마다 카카오 로컬 API로 좌표, 가장 가까운 지하철역·초등학교 거리를 구해
           캐시 파일(--cache)에 쌓습니다. 이미 구한 단지는 건너뛰므로 여러 번 나눠 돌려도 됩니다.
2. export: DB 통계와 캐시를 합쳐 lib/complexes.json 을 씁니다.
           평형마다 기준가 산정 기간·건수·마지막 거래일(거래 신뢰도), 10년 최고가(분기 중위가 기준),
           전세 원자료(--rents, scripts/fetch-rents.py 로 받음)가 있으면 최근 전세가·1년 상승률도 넣습니다.

실행:
    NODE 없이 python3 만 있으면 됩니다. 키는 환경변수 KAKAO_REST_KEY 로만 받습니다.
    python3 scripts/export-complexes.py geo    --db ../data/naezip.sqlite --cache ../data/web/geo.json
    python3 scripts/export-complexes.py export --db ../data/naezip.sqlite --cache ../data/web/geo.json \
        [--rents ../data/raw/rents]
"""
import argparse
import hashlib
import json
import math
import os
import re
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from statistics import median
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "lib" / "complexes.json"

# 시군구 코드 → (시, 구). 수집기 collector/regions.py 와 같은 목록입니다.
SGG = {
    "41111": "수원시 장안구", "41113": "수원시 권선구", "41115": "수원시 팔달구", "41117": "수원시 영통구",
    "41131": "성남시 수정구", "41133": "성남시 중원구", "41135": "성남시 분당구", "41150": "의정부시",
    "41171": "안양시 만안구", "41173": "안양시 동안구", "41190": "부천시", "41192": "부천시 원미구",
    "41194": "부천시 소사구", "41196": "부천시 오정구", "41210": "광명시", "41220": "평택시", "41250": "동두천시",
    "41271": "안산시 상록구", "41273": "안산시 단원구", "41281": "고양시 덕양구", "41285": "고양시 일산동구",
    "41287": "고양시 일산서구", "41290": "과천시", "41310": "구리시", "41360": "남양주시", "41370": "오산시",
    "41390": "시흥시", "41410": "군포시", "41430": "의왕시", "41450": "하남시", "41461": "용인시 처인구",
    "41463": "용인시 기흥구", "41465": "용인시 수지구", "41480": "파주시", "41500": "이천시", "41550": "안성시",
    "41570": "김포시", "41591": "화성시 만세구", "41593": "화성시 효행구", "41595": "화성시 병점구",
    "41597": "화성시 동탄구", "41610": "광주시", "41630": "양주시", "41650": "포천시", "41670": "여주시",
    "41800": "연천군", "41820": "가평군", "41830": "양평군",
}
GANGNAM = (37.4979, 127.0276)
MAIN_BUCKETS = ("84", "59", "74", "대형", "소형")
TODAY = date.today()


KAPT_INFO: Path | None = None  # K-apt 단지 상세 원자료 폴더 (세대수 보충용)


def households_of(k: dict) -> int | None:
    """DB에 세대수가 비어 있으면("1474.0" 같은 소수 표기로 못 읽은 경우) 원자료에서 다시 읽습니다."""
    if k.get("households"):
        return k["households"]
    if KAPT_INFO:
        path = KAPT_INFO / f"{k['kapt_code']}.json"
        if path.exists():
            raw = json.loads(path.read_text())
            for key in ("kaptdaCnt", "hoCnt"):
                try:
                    n = int(float(raw.get(key) or 0))
                except ValueError:
                    n = 0
                if n:
                    return n
    return None


def db_complexes(db: Path) -> dict[str, dict]:
    """최근 1년 안에 거래가 있는 단지만, 평형별 통계를 묶어 돌려줍니다."""
    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row
    info = {r["kapt_code"]: dict(r) for r in conn.execute("SELECT * FROM complexes")}
    for k in info.values():
        k["households"] = households_of(k)
    cutoff = date(TODAY.year - 1, TODAY.month, 1).isoformat()
    out: dict[str, dict] = {}
    for r in conn.execute("SELECT * FROM stats WHERE ref_price IS NOT NULL ORDER BY apt_seq"):
        c = out.setdefault(r["apt_seq"], {"seq": r["apt_seq"], "stats": [], "kapt": info.get(r["kapt_code"]) if r["kapt_code"] else None})
        c["stats"].append(dict(r))
    # 나홀로 건물·소규모 단지는 뺍니다: 세대수를 알면 100세대 이상, 모르면 10년간 거래 30건 이상
    # (2023년 이후 준공은 거래가 적어 10건 이상).
    counts = dict(conn.execute("SELECT apt_seq, COUNT(*) FROM trades GROUP BY apt_seq"))
    for seq in list(out):
        c = out[seq]
        year = c["stats"][0]["build_year"] or 0
        households = (c["kapt"] or {}).get("households")
        big = households >= 100 if households else counts.get(seq, 0) >= (10 if year >= 2023 else 30)
        if not big or max(s["last_deal"] for s in c["stats"]) < cutoff:
            del out[seq]
    return out


def address_of(c: dict) -> tuple[str, str]:
    s = c["stats"][0]
    k = c["kapt"] or {}
    jibun = seq_jibun(c["seq"])
    addr = k.get("road_addr") or k.get("addr") or f"경기도 {SGG.get(s['sgg_cd'], '')} {s['umd_nm']} {jibun}".strip()
    return addr, s["apt_nm"]


def seq_jibun(seq: str) -> str:
    parts = seq.split("|")
    return parts[2] if len(parts) >= 4 else ""


# ---------- 카카오 로컬 ----------
KAKAO = os.environ.get("KAKAO_REST_KEY", "")


def kakao(path: str, **params) -> list[dict]:
    url = f"https://dapi.kakao.com/v2/local/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Authorization": f"KakaoAK {KAKAO}"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                return json.load(res).get("documents", [])
        except Exception:  # noqa: BLE001 - 프록시 끊김이 잦아 재시도
            time.sleep(0.5 * 2**attempt)
    return []


def locate(c: dict) -> dict | None:
    addr, name = address_of(c)
    s = c["stats"][0]
    area = f"{SGG.get(s['sgg_cd'], '')} {s['umd_nm']}"
    docs = kakao("search/address.json", query=addr)
    if not docs:
        docs = kakao("search/keyword.json", query=f"{area} {name}아파트")
    doc = next((d for d in docs if (d.get("address_name") or "").startswith("경기")), None)
    if not doc:
        return None
    lat, lng = float(doc["y"]), float(doc["x"])
    station = kakao("search/category.json", category_group_code="SW8", x=lng, y=lat, radius=20000, sort="distance", size=1)
    schools = kakao("search/category.json", category_group_code="SC4", x=lng, y=lat, radius=5000, sort="distance", size=15)
    school = next((d for d in schools if d["place_name"].endswith("초등학교")), None)
    return {
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "station": int(station[0]["distance"]) if station else 20000,
        "stationName": station[0]["place_name"] if station else "",
        "school": int(school["distance"]) if school else 5000,
    }


def run_geo(db: Path, cache_path: Path, workers: int) -> None:
    if not KAKAO:
        sys.exit("환경변수 KAKAO_REST_KEY 가 필요합니다.")
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    todo = [c for seq, c in db_complexes(db).items() if seq not in cache]
    print(f"좌표 계산할 단지 {len(todo):,}곳 (캐시 {len(cache):,}곳)", flush=True)
    done = 0
    with ThreadPoolExecutor(workers) as pool:
        for c, geo in zip(todo, pool.map(locate, todo)):
            cache[c["seq"]] = geo  # 못 찾은 단지는 None 으로 남겨 다시 묻지 않습니다
            done += 1
            if done % 100 == 0:
                save(cache_path, cache)
                print(f"  {done:,}/{len(todo):,}", flush=True)
    save(cache_path, cache)
    missing = sum(1 for v in cache.values() if v is None)
    print(f"완료: 캐시 {len(cache):,}곳, 좌표 못 찾음 {missing:,}곳")


def save(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False))
    tmp.replace(path)


# ---------- 내보내기 ----------
def km(a, b):
    r = 6371
    dlat = math.radians(b[0] - a[0])
    dlng = math.radians(b[1] - a[1])
    h = math.sin(dlat / 2) ** 2 + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(dlng / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


# 전용면적(㎡) → 평형 버킷. 수집기 collector/build_db.py 의 BUCKETS 와 같습니다.
BUCKETS = [(0, 49, "소형"), (49, 66, "59"), (66, 76, "74"), (76, 90, "84"), (90, 1000, "대형")]


def bucket_of(area: float) -> str:
    return next((name for lo, hi, name in BUCKETS if lo <= area < hi), "대형")


def shift_months(d: date, months: int) -> date:
    y, m = divmod(d.year * 12 + d.month - 1 - months, 12)
    return date(y, m + 1, 1)


def window_median(deals: list[tuple[str, float]], end: date) -> tuple[float | None, int]:
    """end 달까지 3개월 창에서 값이 없으면 6, 12개월로 넓힙니다. (중위값, 건수) — 수집기와 같은 규칙."""
    stop = shift_months(end, -1).isoformat()
    for months in (3, 6, 12):
        start = shift_months(end, months - 1).isoformat()
        vals = [v for dt, v in deals if start <= dt < stop]
        if vals:
            return median(vals), len(vals)
    return None, 0


def peaks(conn: sqlite3.Connection) -> dict[tuple[str, str], tuple[float, str]]:
    """평형별 최근 10년 최고가: 분기 중위가 중 가장 높은 값 (억, "2021-3" 분기).

    한 건짜리 이상 거래에 끌려가지 않도록 거래가 2건 이상인 분기만 보고, 그런 분기가 없으면 전체 분기에서 고릅니다.
    """
    since = date(TODAY.year - 10, TODAY.month, 1).isoformat()
    groups: dict[tuple[str, str], dict[str, list[int]]] = {}
    for seq, bucket, price, dt in conn.execute(
        "SELECT apt_seq, bucket, price, deal_date FROM trades WHERE direct = 0 AND deal_date >= ?", (since,)
    ):
        q = f"{dt[:4]}-{(int(dt[5:7]) - 1) // 3 + 1}"
        groups.setdefault((seq, bucket), {}).setdefault(q, []).append(price)
    out = {}
    for key, quarters in groups.items():
        solid = {q: v for q, v in quarters.items() if len(v) >= 2} or quarters
        q, vals = max(solid.items(), key=lambda kv: (median(kv[1]), kv[0]))
        out[key] = (round(median(vals) / 10000, 2), q)
    return out


def norm_name(name: str) -> str:
    """수집기 collector/build_db.py 의 norm_name 과 같습니다 (aptSeq 가 없는 자료의 대체 키)."""
    n = re.sub(r"\(.*?\)", "", name or "")
    n = re.sub(r"[\s·\-_.,]", "", n)
    n = re.sub(r"(아파트|apt|APT)$", "", n)
    return n.lower()


def jeonse_stats(rent_dir: Path) -> dict[tuple[str, str], tuple[float, float | None, int]]:
    """전월세 원자료(raw/rents/<시군구>/<YYYYMM>.json)에서 평형별 순수 전세(월세 0)만 골라
    (최근 전세 중위가 억, 1년 상승률, 건수)를 돌려줍니다. 기준가와 같은 3→6→12개월 창을 씁니다."""
    deals: dict[tuple[str, str], list[tuple[str, float, float]]] = {}
    for f in sorted(rent_dir.glob("*/*.json")):
        for t in json.loads(f.read_text()):
            try:
                deposit = int(str(t.get("deposit", "")).replace(",", ""))
                rent = int(str(t.get("monthlyRent") or "0").replace(",", ""))
                area = float(t.get("excluUseAr") or 0)
                y, m, d = int(t["dealYear"]), int(t["dealMonth"]), int(t.get("dealDay") or 1)
            except (KeyError, ValueError):
                continue
            if rent or not deposit or not area:
                continue
            # 매매 DB의 apt_seq 와 같은 대체 키 (매매 API 자료에는 aptSeq 가 없어 전월세의 aptSeq 는 쓰지 않습니다)
            seq = f"{t.get('sggCd', '')}|{t.get('umdNm', '')}|{t.get('jibun', '')}|{norm_name(t.get('aptNm', ''))}"
            for key in (seq, seq.rsplit("|", 1)[0]):
                deals.setdefault((key, bucket_of(area)), []).append((f"{y:04d}-{m:02d}-{d:02d}", deposit, deposit / area))
    this_month = date(TODAY.year, TODAY.month, 1)
    out = {}
    for key, ds in deals.items():
        now, n = window_median([(dt, v) for dt, v, _ in ds], this_month)
        if now is None:
            continue
        per_now, _ = window_median([(dt, v) for dt, _, v in ds], this_month)
        per_past, _ = window_median([(dt, v) for dt, _, v in ds], shift_months(this_month, 12))
        g = round(per_now / per_past - 1, 3) if per_now and per_past else None
        out[key] = (round(now / 10000, 2), g, n)
    return out


def run_export(db: Path, cache_path: Path, rent_dir: Path | None = None) -> None:
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    peak = peaks(sqlite3.connect(db))
    jeonse = jeonse_stats(rent_dir) if rent_dir else {}
    print(f"10년 최고가 {len(peak):,}개 평형, 전세 {len(jeonse):,}개 평형")
    rows = []
    for seq, c in db_complexes(db).items():
        geo = cache.get(seq)
        if not geo:
            continue
        stats = sorted(c["stats"], key=lambda s: MAIN_BUCKETS.index(s["bucket"]) if s["bucket"] in MAIN_BUCKETS else 9)
        main = stats[0]
        k = c["kapt"] or {}
        sgg = SGG.get(main["sgg_cd"], "")
        city, _, gu = sgg.partition(" ")
        growth = [round(main[f"g{y}"] / 100, 3) if main[f"g{y}"] is not None else None for y in (1, 3, 5, 10)]
        sizes = []
        for s in sorted(c["stats"], key=lambda s: s["area"]):
            area = math.floor(s["area"])
            pk = peak.get((seq, s["bucket"]))
            # 단지명 표기가 매매와 다르면 같은 시군구·동·지번으로 찾습니다.
            js = jeonse.get((seq, s["bucket"])) or jeonse.get((seq.rsplit("|", 1)[0], s["bucket"]))
            # [면적, 평, 기준가, 3개월 건수, 기준가 산정 기간(개월), 그 기간 건수, 마지막 거래일,
            #  10년 최고가, 최고가 분기, 전세가, 전세 1년 상승률, 전세 건수] — lib/data.ts 의 SizeRow 와 같은 순서
            sizes.append([
                area, round(area * 1.33 / 3.3058), round(s["ref_price"] / 10000, 2), s["ref_count"] if s["ref_months"] == 3 else 0,
                s["ref_months"], s["ref_count"], s["last_deal"],
                pk[0] if pk else None, pk[1] if pk else None,
                js[0] if js else None, js[1] if js else None, js[2] if js else 0,
            ])
        # 강남역 대중교통 시간은 직선거리로 어림합니다 (역이 멀면 가산).
        commute = round(min(120, 12 + km((geo["lat"], geo["lng"]), GANGNAM) * 2.1 + max(0, geo["station"] - 800) / 80))
        rid = hashlib.md5(seq.encode()).hexdigest()[:10]
        rows.append([
            rid, main["apt_nm"], city, f"{gu} {main['umd_nm']}".strip(), main["build_year"] or 0, k.get("households") or 0, 0,
            geo["lat"], geo["lng"], geo["station"], geo["school"], commute, growth, sizes, int(rid, 16) % 6,
        ])
    rows.sort(key=lambda r: (r[2], r[3], r[1]))
    OUT.write_text(json.dumps({"asOf": TODAY.isoformat(), "rows": rows}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"저장: {OUT} ({len(rows):,}개 단지, {OUT.stat().st_size / 1e6:.1f}MB)")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("stage", choices=["geo", "export"])
    p.add_argument("--db", type=Path, required=True)
    p.add_argument("--cache", type=Path, required=True)
    p.add_argument("--workers", type=int, default=6)
    p.add_argument("--kapt-info", type=Path, help="K-apt 단지 상세 원자료 폴더 (raw/complexes/info)")
    p.add_argument("--rents", type=Path, help="전월세 원자료 폴더 (scripts/fetch-rents.py 결과, raw/rents)")
    a = p.parse_args()
    global KAPT_INFO
    KAPT_INFO = a.kapt_info
    run_geo(a.db, a.cache, a.workers) if a.stage == "geo" else run_export(a.db, a.cache, a.rents)


if __name__ == "__main__":
    main()
