"""국토교통부 아파트 매매 실거래가 자료를 경기도 전체에 대해 월별로 받는다.

사용법:
    python -m collector.fetch_trades --years 10          # 최근 10년치, 이미 받은 달은 건너뜀
    python -m collector.fetch_trades --check             # 코드별 지난달 거래 건수만 확인
    python -m collector.fetch_trades --refresh-months 3  # 최근 3개월은 다시 받기 (신고 지연분 반영)

결과는 data/raw/trades/<시군구코드>/<YYYYMM>.json 에 저장된다.
"""
import argparse
import json
from datetime import date

from .common import RAW_DIR, get_items
from .regions import GYEONGGI

URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade"
PAGE_SIZE = 1000


def months_back(n: int, today: date | None = None) -> list[str]:
    """이번 달부터 n개월치 YYYYMM 목록 (최신순). 이번 달은 신고가 진행 중인 부분 자료다."""
    today = today or date.today()
    y, m = today.year, today.month
    out = []
    for _ in range(n):
        out.append(f"{y}{m:02d}")
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return out


def fetch_month(lawd_cd: str, ym: str) -> list[dict]:
    items, page = [], 1
    while True:
        batch, total = get_items(URL, {"LAWD_CD": lawd_cd, "DEAL_YMD": ym, "numOfRows": PAGE_SIZE, "pageNo": page})
        items.extend(batch)
        if not batch or len(items) >= total:
            return items
        page += 1


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", type=int, default=10)
    ap.add_argument("--refresh-months", type=int, default=3)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--only", help="특정 시군구 코드만 (쉼표 구분)")
    args = ap.parse_args()

    codes = args.only.split(",") if args.only else list(GYEONGGI)

    if args.check:
        ym = months_back(2)[1]
        for code in codes:
            print(f"{code} {GYEONGGI.get(code, '?'):12s} {ym}: {len(fetch_month(code, ym))}건")
        return

    months = months_back(args.years * 12 + 1)
    fresh = set(months[: args.refresh_months])
    calls = 0
    for code in codes:
        out_dir = RAW_DIR / "trades" / code
        out_dir.mkdir(parents=True, exist_ok=True)
        for ym in months:
            path = out_dir / f"{ym}.json"
            if path.exists() and ym not in fresh:
                continue
            items = fetch_month(code, ym)
            calls += 1
            path.write_text(json.dumps(items, ensure_ascii=False))
        print(f"{code} {GYEONGGI.get(code, '?')} 완료")
    print(f"API 호출 {calls}회")


if __name__ == "__main__":
    main()
