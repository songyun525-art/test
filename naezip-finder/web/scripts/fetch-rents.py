"""국토교통부 아파트 전월세 실거래가를 경기도 전체에 대해 월별로 받아 원자료로 저장합니다.

공공데이터포털에서 '국토교통부_아파트 전월세 실거래가 자료' 활용신청이 되어 있어야 합니다
(매매 실거래가와 같은 DATA_GO_KR_KEY 를 씁니다).

실행:
    python3 scripts/fetch-rents.py --out ../data/raw/rents              # 최근 25개월 (1년 상승률 계산용)
    python3 scripts/fetch-rents.py --out ../data/raw/rents --check      # 키·활용신청 확인만
그다음 export-complexes.py export ... --rents ../data/raw/rents 로 사이트 데이터에 넣습니다.

결과는 <out>/<시군구코드>/<YYYYMM>.json 에 저장됩니다. 이미 받은 달은 건너뛰고, 최근 3개월은 신고 지연분이 있어 다시 받습니다.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent"
PAGE_SIZE = 1000
# export-complexes.py 의 SGG 와 같은 시군구 코드 (화성시 옛 코드 41590 은 거래가 0건이라 뺍니다)
SGG = [
    "41111", "41113", "41115", "41117", "41131", "41133", "41135", "41150", "41171", "41173", "41190", "41192",
    "41194", "41196", "41210", "41220", "41250", "41271", "41273", "41281", "41285", "41287", "41290", "41310",
    "41360", "41370", "41390", "41410", "41430", "41450", "41461", "41463", "41465", "41480", "41500", "41550",
    "41570", "41591", "41593", "41595", "41597", "41610", "41630", "41650", "41670", "41800", "41820", "41830",
]


class ApiError(RuntimeError):
    pass


def call(params: dict) -> tuple[list[dict], int]:
    key = os.environ.get("DATA_GO_KR_KEY")
    if not key:
        sys.exit("환경변수 DATA_GO_KR_KEY 가 필요합니다.")
    url = f"{URL}?{urllib.parse.urlencode({'serviceKey': key, **params})}"
    last: Exception | None = None
    for attempt in range(6):
        try:
            with urllib.request.urlopen(url, timeout=30) as res:
                return parse(res.read())
        except urllib.error.HTTPError as e:  # 활용신청 전이면 403 + SERVICE_KEY_IS_NOT_REGISTERED_ERROR
            body = e.read()
            if b"SERVICE_KEY_IS_NOT_REGISTERED" in body:
                raise ApiError("전월세 API 활용신청이 안 된 키입니다 (SERVICE_KEY_IS_NOT_REGISTERED_ERROR).") from e
            last = e
        except (OSError, ET.ParseError) as e:  # 프록시 끊김이 잦아 재시도
            last = e
        time.sleep(min(30, 2 ** attempt))
    raise ApiError(f"{params}: {last}")


def parse(content: bytes) -> tuple[list[dict], int]:
    root = ET.fromstring(content)
    code = (root.findtext(".//resultCode") or root.findtext(".//returnReasonCode") or "").strip()
    if code.strip("0"):
        msg = root.findtext(".//resultMsg") or root.findtext(".//errMsg") or ""
        raise ApiError(f"API 오류 {code}: {msg}")
    items = [{c.tag: (c.text or "").strip() for c in it} for it in root.iter("item")]
    return items, int(root.findtext(".//totalCount") or 0)


def fetch_month(sgg: str, ym: str) -> list[dict]:
    items, page = [], 1
    while True:
        batch, total = call({"LAWD_CD": sgg, "DEAL_YMD": ym, "numOfRows": PAGE_SIZE, "pageNo": page})
        items.extend(batch)
        if not batch or len(items) >= total:
            return items
        page += 1


def months_back(n: int) -> list[str]:
    y, m = date.today().year, date.today().month
    out = []
    for _ in range(n):
        out.append(f"{y}{m:02d}")
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--months", type=int, default=25)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()

    if a.check:
        ym = months_back(2)[1]
        print(f"41135 {ym}: {len(fetch_month('41135', ym))}건")
        return

    months = months_back(a.months)
    recent = set(months[:3])
    todo = [(s, ym) for s in SGG for ym in months if ym in recent or not (a.out / s / f"{ym}.json").exists()]
    print(f"받을 달 {len(todo):,}개", flush=True)

    def job(t: tuple[str, str]) -> int:
        s, ym = t
        try:
            items = fetch_month(s, ym)
        except ApiError as e:
            if "활용신청" in str(e):
                raise
            print(f"  실패 {s} {ym}: {e}", flush=True)  # 다시 실행하면 이어서 받습니다
            return -1
        path = a.out / s / f"{ym}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(items, ensure_ascii=False))
        tmp.replace(path)
        return len(items)

    total = failed = 0
    with ThreadPoolExecutor(a.workers) as pool:
        for i, n in enumerate(pool.map(job, todo), 1):
            if n < 0:
                failed += 1
            else:
                total += n
            if i % 50 == 0:
                print(f"  {i:,}/{len(todo):,} ({total:,}건)", flush=True)
    print(f"완료: {total:,}건" + (f", 실패 {failed}개 달 (다시 실행하세요)" if failed else ""))
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
