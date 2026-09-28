"""공공데이터포털 API 호출 공통 함수."""
import json
import os
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
DB_PATH = DATA_DIR / "naezip.sqlite"


class ApiError(RuntimeError):
    pass


def service_key() -> str:
    key = os.environ.get("DATA_GO_KR_KEY")
    if not key:
        raise SystemExit("환경변수 DATA_GO_KR_KEY 가 없습니다. 공공데이터포털 일반 인증키(Decoding)를 넣어 주세요.")
    return key


def get_items(url: str, params: dict, retries: int = 4) -> tuple[list[dict], int]:
    """API를 호출해 (item 목록, 전체 건수)를 돌려준다.

    서비스마다 XML/JSON 기본 응답이 달라서 둘 다 처리한다.
    네트워크 오류는 지수 백오프로 재시도한다.
    """
    params = {"serviceKey": service_key(), **params}
    last = None
    for attempt in range(retries):
        try:
            res = requests.get(url, params=params, timeout=30)
            res.raise_for_status()
            return parse_response(res.content)
        except (requests.RequestException, ET.ParseError, ValueError) as e:
            last = e
            time.sleep(2 ** (attempt + 1))
    shown = {k: v for k, v in params.items() if k != "serviceKey"}
    raise ApiError(f"{url} {shown}: {last}")


def parse_response(content: bytes) -> tuple[list[dict], int]:
    text = content.lstrip()
    if text.startswith(b"{"):
        return parse_json(json.loads(text))
    root = ET.fromstring(text)
    check_header(root)
    return item_dicts(root), total_count(root)


def parse_json(doc: dict) -> tuple[list[dict], int]:
    res = doc.get("response", doc)
    header = res.get("header", {})
    code = str(header.get("resultCode", "00"))
    if code.strip("0") != "" and code != "03":
        raise ApiError(f"API 오류 {code}: {header.get('resultMsg', '')}")
    body = res.get("body", {}) or {}
    items = body.get("items") or []
    if isinstance(items, dict):  # {"item": [...]} 또는 {"item": {...}}
        items = items.get("item", [])
    if isinstance(items, dict):  # 기본정보 API는 item 하나를 객체로 준다
        items = [items]
    if not items and "item" in body:
        items = body["item"] if isinstance(body["item"], list) else [body["item"]]
    items = [{k: "" if v is None else str(v).strip() for k, v in it.items()} for it in items]
    return items, int(body.get("totalCount") or len(items))


def check_header(root: ET.Element) -> None:
    code = (root.findtext(".//resultCode") or "").strip()
    # 실거래가 API는 "000", 공동주택 API는 "00"을 성공으로 돌려준다.
    # "03"은 해당 조건에 데이터가 없다는 뜻이라 오류로 보지 않는다.
    if code and code.strip("0") != "" and code != "03":
        msg = root.findtext(".//resultMsg") or ""
        raise ApiError(f"API 오류 {code}: {msg}")
    # 인증키 오류 등은 OpenAPI_ServiceResponse 형태로 온다.
    auth = root.findtext(".//returnAuthMsg")
    if auth:
        raise ApiError(f"인증 오류: {auth}")


def item_dicts(root: ET.Element) -> list[dict]:
    return [{child.tag: (child.text or "").strip() for child in item} for item in root.iter("item")]


def total_count(root: ET.Element) -> int:
    return int(root.findtext(".//totalCount") or 0)
