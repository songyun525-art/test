"""공동주택(K-apt) 단지 목록과 단지별 기본·상세 정보를 받는다.

- 단지 목록: 시군구별 단지코드(kaptCode), 단지명, 법정동코드
- 기본정보: 세대수, 동수, 사용승인일, 주소
- 상세정보: 지하철역, 역까지 도보시간, 버스정류장 도보시간, 주차대수

사용법:
    python -m collector.fetch_complexes           # 목록 + 아직 안 받은 단지의 상세
    python -m collector.fetch_complexes --list-only

단지가 많아(경기도 약 7천 곳 × 2회 호출) 개발계정 하루 한도(1만 회)를 넘을 수 있다.
이미 받은 단지는 건너뛰므로 다음 날 다시 실행하면 이어서 받는다.

결과: data/raw/complexes/list/<시군구코드>.json, data/raw/complexes/info/<kaptCode>.json
"""
import argparse
import json

from .common import RAW_DIR, ApiError, get_items
from .regions import GYEONGGI

BASE = "https://apis.data.go.kr/1613000"
LIST_URL = f"{BASE}/AptListService4/getSigunguAptList4"
BASIS_URL = f"{BASE}/AptBasisInfoServiceV5/getAphusBassInfoV5"
DETAIL_URL = f"{BASE}/AptBasisInfoServiceV5/getAphusDtlInfoV5"
PAGE_SIZE = 1000


def fetch_list(code: str) -> list[dict]:
    items, page = [], 1
    while True:
        batch, total = get_items(LIST_URL, {"sigunguCode": code, "numOfRows": PAGE_SIZE, "pageNo": page})
        items.extend(batch)
        if not batch or len(items) >= total:
            return items
        page += 1


def fetch_info(kapt_code: str) -> dict:
    basis, _ = get_items(BASIS_URL, {"kaptCode": kapt_code})
    detail, _ = get_items(DETAIL_URL, {"kaptCode": kapt_code})
    info = {}
    for part in (basis[:1], detail[:1]):
        if part:
            info.update(part[0])
    return info


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--list-only", action="store_true")
    ap.add_argument("--only", help="특정 시군구 코드만 (쉼표 구분)")
    args = ap.parse_args()
    codes = args.only.split(",") if args.only else list(GYEONGGI)

    list_dir = RAW_DIR / "complexes" / "list"
    info_dir = RAW_DIR / "complexes" / "info"
    list_dir.mkdir(parents=True, exist_ok=True)
    info_dir.mkdir(parents=True, exist_ok=True)

    kapt_codes = []
    for code in codes:
        path = list_dir / f"{code}.json"
        if not path.exists():
            path.write_text(json.dumps(fetch_list(code), ensure_ascii=False))
        rows = json.loads(path.read_text())
        kapt_codes += [r["kaptCode"] for r in rows if r.get("kaptCode")]
        print(f"{code} {GYEONGGI.get(code, '?')}: 단지 {len(rows)}곳")

    if args.list_only:
        return

    todo = [k for k in dict.fromkeys(kapt_codes) if not (info_dir / f"{k}.json").exists()]
    print(f"상세정보 받을 단지 {len(todo)}곳")
    for i, k in enumerate(todo, 1):
        try:
            info = fetch_info(k)
        except ApiError as e:
            # 하루 호출 한도 초과 등: 받은 데까지 저장돼 있으니 멈추고 다음에 이어서 받는다.
            print(f"중단 ({i - 1}곳 완료): {e}")
            return
        (info_dir / f"{k}.json").write_text(json.dumps(info, ensure_ascii=False))
        if i % 200 == 0:
            print(f"  {i}/{len(todo)}")


if __name__ == "__main__":
    main()
