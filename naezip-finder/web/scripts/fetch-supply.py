"""입주 예정 물량: 청약홈 분양정보(한국부동산원)에서 경기도 분양 공고를 받아
입주 예정월이 앞으로 3년 안인 단지만 lib/supply.json 으로 저장합니다.

실행: python3 scripts/fetch-supply.py          (DATA_GO_KR_KEY, KAKAO_REST_KEY 환경변수)

한계: 청약홈 공고의 공급 세대수는 일반분양 물량이라 재건축·재개발 조합원 물량과 임대 물량은 빠집니다.
그래서 실제 입주 세대보다 적게 잡힐 수 있습니다.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "lib" / "supply.json"
BASE = "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail"
YEARS_BACK = 5  # 공고 후 입주까지 보통 2~4년이라 5년 전 공고부터 봅니다
TODAY = date.today()


def get(url: str, headers: dict | None = None) -> dict | None:
    req = urllib.request.Request(url, headers=headers or {})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.load(res)
        except Exception:  # noqa: BLE001 - 프록시 끊김이 잦아 재시도
            time.sleep(min(20, 2**attempt))
    return None


def notices() -> list[dict]:
    key = os.environ.get("DATA_GO_KR_KEY") or sys.exit("DATA_GO_KR_KEY 환경변수가 필요합니다.")
    since = date(TODAY.year - YEARS_BACK, TODAY.month, 1).isoformat()
    rows: list[dict] = []
    for page in range(1, 100):
        q = {
            "serviceKey": key, "page": page, "perPage": 500,
            "cond[SUBSCRPT_AREA_CODE_NM::EQ]": "경기", "cond[RCRIT_PBLANC_DE::GTE]": since,
        }
        body = get(f"{BASE}?{urllib.parse.urlencode(q)}")
        if body is None:
            sys.exit(f"청약홈 API 호출 실패 (page {page})")
        rows += body["data"]
        if len(rows) >= body["matchCount"] or not body["data"]:
            return rows
    return rows


def geocode(address: str, name: str) -> tuple[float, float] | None:
    kakao = os.environ.get("KAKAO_REST_KEY")
    if not kakao:
        return None
    tries = [
        ("address", re.sub(r"(번지|일원|일대|외).*$", "", re.sub(r"\(.*$", "", address)).strip()),
        ("keyword", re.sub(r"\(.*?\)", "", name).strip()),
        ("address", " ".join(address.split()[:3])),
    ]
    for kind, query in tries:
        if not query:
            continue
        body = get(f"https://dapi.kakao.com/v2/local/search/{kind}.json?{urllib.parse.urlencode({'query': query})}", {"Authorization": f"KakaoAK {kakao}"})
        for d in (body or {}).get("documents", []):
            if (d.get("address_name") or "").startswith("경기"):
                return round(float(d["y"]), 6), round(float(d["x"]), 6)
    return None


def main() -> None:
    horizon = f"{TODAY.year + 3}{TODAY.month:02d}"
    now = f"{TODAY.year}{TODAY.month:02d}"
    picked: dict[tuple[str, str], dict] = {}
    raw = notices()
    for r in raw:
        ym = re.sub(r"\D", "", str(r.get("MVN_PREARNGE_YM") or ""))[:6]
        n = int(r.get("TOT_SUPLY_HSHLDCO") or 0)
        if len(ym) != 6 or not (now <= ym < horizon) or not n:
            continue
        addr = (r.get("HSSPLY_ADRES") or "").strip()
        # 같은 단지의 추가·재공고는 한 번만 셉니다 (주소 + 입주월이 같으면 세대수가 큰 공고)
        key = (re.sub(r"\s|\(.*?\)", "", addr), ym)
        if key in picked and picked[key]["households"] >= n:
            continue
        city = re.search(r"경기도?\s*(\S+?[시군])(?=[\s)]|$)", addr)
        picked[key] = {
            "name": r.get("HOUSE_NM", ""), "address": addr, "city": city.group(1).replace("특례시", "시") if city else "",
            "households": n, "moveIn": f"{ym[:4]}-{ym[4:]}",
        }
    items = list(picked.values())
    with ThreadPoolExecutor(6) as pool:
        for it, geo in zip(items, pool.map(lambda x: geocode(x["address"], x["name"]), items)):
            it["lat"], it["lng"] = geo if geo else (None, None)
    items.sort(key=lambda x: (x["moveIn"], x["city"]))
    OUT.write_text(json.dumps({"asOf": TODAY.isoformat(), "source": "청약홈 분양정보 (일반분양 공급 세대수)", "items": items}, ensure_ascii=False, indent=1) + "\n")
    missing = sum(1 for x in items if x["lat"] is None)
    print(f"공고 {len(raw):,}건 → 3년 안 입주 예정 {len(items):,}단지, {sum(x['households'] for x in items):,}세대 (좌표 못 찾음 {missing}) → {OUT}")


if __name__ == "__main__":
    main()
