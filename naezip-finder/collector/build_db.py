"""받아 둔 원자료(data/raw)를 정리해 SQLite DB(data/naezip.sqlite)를 만든다.

1. 단지(complexes): K-apt 기본·상세정보
2. 거래(trades): 실거래가. 해제된 거래는 버리고, 전용면적을 평형 버킷(59/84 등)으로 묶는다.
3. 매칭: 실거래 단지(aptSeq) ↔ K-apt 단지(kaptCode). 같은 읍면동 안에서 단지명, 지번 순으로 찾는다.
4. 통계(stats): 단지 × 평형별 기준가(최근 3개월 중위가)와 1/3/5/10년 상승률

사용법:
    python -m collector.build_db
"""
import json
import re
import sqlite3
from datetime import date
from statistics import median

from .common import DB_PATH, RAW_DIR

# 전용면적(㎡) 구간 → 평형 버킷. 58/52/53 같은 애매한 면적은 59로 본다.
BUCKETS = [
    (0, 49, "소형"),
    (49, 66, "59"),
    (66, 76, "74"),
    (76, 90, "84"),
    (90, 1000, "대형"),
]

GROWTH_YEARS = (1, 3, 5, 10)

SCHEMA = """
DROP TABLE IF EXISTS complexes;
DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS stats;
CREATE TABLE complexes (
    kapt_code TEXT PRIMARY KEY,
    name TEXT, sgg_cd TEXT, bjd_code TEXT, umd_nm TEXT,
    addr TEXT, road_addr TEXT,
    households INTEGER, dong_cnt INTEGER, use_date TEXT, build_year INTEGER,
    subway_line TEXT, subway_station TEXT, walk_subway TEXT, walk_bus TEXT
);
CREATE TABLE trades (
    apt_seq TEXT, kapt_code TEXT,
    sgg_cd TEXT, umd_nm TEXT, jibun TEXT, apt_nm TEXT, build_year INTEGER,
    area REAL, bucket TEXT, price INTEGER, deal_date TEXT, floor INTEGER, direct INTEGER
);
CREATE INDEX trades_apt ON trades(apt_seq, bucket, deal_date);
CREATE TABLE stats (
    apt_seq TEXT, kapt_code TEXT, apt_nm TEXT, sgg_cd TEXT, umd_nm TEXT, build_year INTEGER,
    bucket TEXT, area REAL,
    ref_price INTEGER, ref_months INTEGER, ref_count INTEGER, last_deal TEXT,
    g1 REAL, g3 REAL, g5 REAL, g10 REAL,
    n1 TEXT, n3 TEXT, n5 TEXT, n10 TEXT,
    PRIMARY KEY (apt_seq, bucket)
);
"""


def bucket_of(area: float) -> str:
    for lo, hi, name in BUCKETS:
        if lo <= area < hi:
            return name
    return "대형"


def norm_name(name: str) -> str:
    """단지명 비교용 정규화: 괄호 내용·공백·'아파트' 등 흔한 꼬리말 제거."""
    n = re.sub(r"\(.*?\)", "", name or "")
    n = re.sub(r"[\s·\-_.,]", "", n)
    n = re.sub(r"(아파트|apt|APT)$", "", n)
    return n.lower()


def to_int(s, default=None):
    try:
        # K-apt는 세대수 같은 값을 "1474.0"처럼 준다.
        return int(float(str(s).replace(",", "").strip()))
    except (TypeError, ValueError, OverflowError):
        return default


def load_complexes(raw_dir=RAW_DIR) -> list[dict]:
    rows = []
    list_dir = raw_dir / "complexes" / "list"
    info_dir = raw_dir / "complexes" / "info"
    for path in sorted(list_dir.glob("*.json")):
        for c in json.loads(path.read_text()):
            k = c.get("kaptCode")
            if not k:
                continue
            info_path = info_dir / f"{k}.json"
            info = json.loads(info_path.read_text()) if info_path.exists() else {}
            use_date = info.get("kaptUsedate", "")
            rows.append({
                "kapt_code": k,
                "name": c.get("kaptName") or info.get("kaptName", ""),
                "sgg_cd": (c.get("bjdCode") or info.get("bjdCode") or path.stem)[:5],
                "bjd_code": c.get("bjdCode", ""),
                # 읍·면 지역은 as3=읍면, as4=리. 실거래 umdNm("공도읍 용두리")과 같은 모양으로 맞춘다.
                "umd_nm": " ".join(x for x in (c.get("as3"), c.get("as4")) if x),
                "addr": info.get("kaptAddr", ""),
                "road_addr": info.get("doroJuso", ""),
                "households": to_int(info.get("kaptdaCnt")),
                "dong_cnt": to_int(info.get("kaptDongCnt")),
                "use_date": use_date,
                "build_year": to_int(use_date[:4]),
                "subway_line": info.get("subwayLine", ""),
                "subway_station": info.get("subwayStation", ""),
                "walk_subway": info.get("kaptdWtimesub", ""),
                "walk_bus": info.get("kaptdWtimebus", ""),
            })
    return rows


def parse_trade(t: dict) -> dict | None:
    if (t.get("cdealType") or "").strip():  # 해제된 거래
        return None
    price = to_int(t.get("dealAmount"))
    area = float(t.get("excluUseAr") or 0)
    y, m, d = to_int(t.get("dealYear")), to_int(t.get("dealMonth")), to_int(t.get("dealDay"), 1)
    if not price or not area or not y or not m:
        return None
    sgg = t.get("sggCd", "")
    apt_nm = t.get("aptNm", "")
    umd = t.get("umdNm", "")
    jibun = t.get("jibun", "")
    return {
        # aptSeq가 없던 옛 자료 대비: 시군구+동+지번+단지명으로 대체 키를 만든다.
        "apt_seq": t.get("aptSeq") or f"{sgg}|{umd}|{jibun}|{norm_name(apt_nm)}",
        "sgg_cd": sgg,
        "umd_nm": umd,
        "jibun": jibun,
        "apt_nm": apt_nm,
        "build_year": to_int(t.get("buildYear")),
        "area": area,
        "bucket": bucket_of(area),
        "price": price,
        "deal_date": f"{y:04d}-{m:02d}-{d:02d}",
        "floor": to_int(t.get("floor")),
        "direct": 1 if "직거래" in (t.get("dealingGbn") or "") else 0,
    }


def load_trades(raw_dir=RAW_DIR) -> list[dict]:
    seen, out = set(), []
    for path in sorted((raw_dir / "trades").glob("*/*.json")):
        for raw in json.loads(path.read_text()):
            t = parse_trade(raw)
            if not t:
                continue
            # 부천시 구 재설치 전후 코드가 겹칠 수 있어 중복 거래를 걸러낸다.
            key = (t["apt_seq"], t["deal_date"], t["area"], t["floor"], t["price"])
            if key in seen:
                continue
            seen.add(key)
            out.append(t)
    return out


def match_complexes(trades: list[dict], complexes: list[dict]) -> dict[str, str]:
    """aptSeq → kaptCode. 같은 시군구·읍면동 안에서 이름 일치 → 지번 일치 → 이름 포함 순으로 찾는다."""
    by_name, by_jibun, by_umd = {}, {}, {}
    for c in complexes:
        key = (c["sgg_cd"], c["umd_nm"])
        by_name[(*key, norm_name(c["name"]))] = c["kapt_code"]
        by_umd.setdefault(key, []).append(c)
        m = re.search(r"(\S+[동리가로])\s+(산?\d+(?:-\d+)?)", c["addr"] or "")
        if m:
            by_jibun[(c["sgg_cd"], m.group(1), m.group(2))] = c["kapt_code"]

    result = {}
    for t in trades:
        seq = t["apt_seq"]
        if seq in result:
            continue
        key = (t["sgg_cd"], t["umd_nm"])
        name = norm_name(t["apt_nm"])
        dong = t["umd_nm"].split()[-1] if t["umd_nm"] else ""  # "공도읍 용두리" → 주소의 "용두리"
        code = by_name.get((*key, name)) or by_jibun.get((t["sgg_cd"], dong, t["jibun"]))
        if not code and name:
            cands = [c for c in by_umd.get(key, []) if name in norm_name(c["name"]) or norm_name(c["name"]) in name]
            if len(cands) == 1:
                code = cands[0]["kapt_code"]
        result[seq] = code
    return result


def shift_months(d: date, months: int) -> date:
    y, m = divmod(d.year * 12 + d.month - 1 - months, 12)
    return date(y, m + 1, 1)


def window(deals: list[tuple[str, float]], end: date, months: int) -> list[float]:
    """end 달을 포함해 거꾸로 months개월 안의 값들."""
    start = shift_months(end, months - 1).isoformat()
    stop = shift_months(end, -1).isoformat()
    return [v for dt, v in deals if start <= dt < stop]


def window_median(deals, end: date) -> tuple[float | None, int, int]:
    """3개월 창에서 거래가 없으면 6, 12개월로 넓힌다. (중위값, 창 크기, 건수)"""
    for months in (3, 6, 12):
        vals = window(deals, end, months)
        if vals:
            return median(vals), months, len(vals)
    return None, 0, 0


def compute_stats(trades: list[dict], today: date | None = None) -> list[dict]:
    today = today or date.today()
    this_month = date(today.year, today.month, 1)
    groups: dict[tuple[str, str], list[dict]] = {}
    for t in trades:
        if t["direct"]:  # 직거래는 가족 간 거래 등이 섞여 시세 계산에서 뺀다
            continue
        groups.setdefault((t["apt_seq"], t["bucket"]), []).append(t)

    out = []
    for (seq, bucket), ts in groups.items():
        ts.sort(key=lambda t: t["deal_date"])
        prices = [(t["deal_date"], t["price"]) for t in ts]
        per_m2 = [(t["deal_date"], t["price"] / t["area"]) for t in ts]
        ref, ref_months, ref_count = window_median(prices, this_month)
        row = {
            "apt_seq": seq,
            "kapt_code": ts[-1].get("kapt_code"),
            "apt_nm": ts[-1]["apt_nm"],
            "sgg_cd": ts[-1]["sgg_cd"],
            "umd_nm": ts[-1]["umd_nm"],
            "build_year": ts[-1]["build_year"],
            "bucket": bucket,
            "area": round(median(t["area"] for t in ts), 1),
            "ref_price": round(ref) if ref else None,
            "ref_months": ref_months,
            "ref_count": ref_count,
            "last_deal": ts[-1]["deal_date"],
        }
        # 상승률: 현재 창과 N년 전 창의 ㎡당 중위가 비교 (같은 버킷 안 면적 차이 보정)
        now, _, now_n = window_median(per_m2, this_month)
        for years in GROWTH_YEARS:
            past, _, past_n = window_median(per_m2, shift_months(this_month, years * 12))
            g = round((now / past - 1) * 100, 1) if now and past else None
            row[f"g{years}"] = g
            row[f"n{years}"] = f"{past_n}/{now_n}" if g is not None else None
        out.append(row)
    return out


def insert(conn, table: str, rows: list[dict]) -> None:
    if not rows:
        return
    cols = list(rows[0])
    conn.executemany(
        f"INSERT INTO {table} ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})",
        [tuple(r[c] for c in cols) for r in rows],
    )


def build(raw_dir=RAW_DIR, db_path=DB_PATH, today: date | None = None) -> dict:
    complexes = load_complexes(raw_dir)
    trades = load_trades(raw_dir)
    mapping = match_complexes(trades, complexes)
    for t in trades:
        t["kapt_code"] = mapping.get(t["apt_seq"])
    stats = compute_stats(trades, today)

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    insert(conn, "complexes", complexes)
    insert(conn, "trades", trades)
    insert(conn, "stats", stats)
    conn.commit()
    conn.close()

    seqs = set(mapping)
    matched = sum(1 for s in seqs if mapping[s])
    return {
        "complexes": len(complexes),
        "trades": len(trades),
        "trade_complexes": len(seqs),
        "matched": matched,
        "stats_rows": len(stats),
    }


def main() -> None:
    r = build()
    rate = r["matched"] / r["trade_complexes"] * 100 if r["trade_complexes"] else 0
    print(f"K-apt 단지 {r['complexes']:,}곳, 거래 {r['trades']:,}건")
    print(f"거래가 있는 단지 {r['trade_complexes']:,}곳 중 {r['matched']:,}곳 매칭 ({rate:.1f}%)")
    print(f"단지×평형 통계 {r['stats_rows']:,}행 → {DB_PATH}")


if __name__ == "__main__":
    main()
