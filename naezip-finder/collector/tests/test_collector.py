"""API 키 없이 돌리는 테스트. 응답 형식은 공공데이터포털 문서의 예시를 본뜬 것."""
import json
import sqlite3
from datetime import date

import pytest

from collector.build_db import bucket_of, build, match_complexes, norm_name, parse_trade
from collector.common import parse_response
from collector.fetch_trades import months_back

TRADE_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header>
<body><items>
<item><aptNm>정든마을(우성6)</aptNm><aptSeq>41135-100</aptSeq><buildYear>1994</buildYear>
<cdealType> </cdealType><dealAmount>   82,500</dealAmount><dealYear>2026</dealYear><dealMonth>8</dealMonth>
<dealDay>3</dealDay><dealingGbn>중개거래</dealingGbn><excluUseAr>58.46</excluUseAr><floor>7</floor>
<jibun>12</jibun><sggCd>41135</sggCd><umdNm>정자동</umdNm></item>
<item><aptNm>정든마을(우성6)</aptNm><aptSeq>41135-100</aptSeq><buildYear>1994</buildYear>
<cdealType>O</cdealType><dealAmount>99,000</dealAmount><dealYear>2026</dealYear><dealMonth>8</dealMonth>
<dealDay>9</dealDay><excluUseAr>58.46</excluUseAr><floor>3</floor>
<jibun>12</jibun><sggCd>41135</sggCd><umdNm>정자동</umdNm></item>
</items><numOfRows>1000</numOfRows><pageNo>1</pageNo><totalCount>2</totalCount></body></response>"""


def test_parse_xml_trades_and_skip_cancelled():
    items, total = parse_response(TRADE_XML.encode())
    assert total == 2
    parsed = [parse_trade(i) for i in items]
    assert parsed[1] is None  # 해제 거래
    t = parsed[0]
    assert t["price"] == 82500 and t["bucket"] == "59" and t["deal_date"] == "2026-08-03"


def test_parse_json_single_item():
    doc = {"response": {"header": {"resultCode": "00"}, "body": {"item": {"kaptCode": "A1", "kaptdaCnt": 500}}}}
    items, total = parse_response(json.dumps(doc).encode())
    assert items == [{"kaptCode": "A1", "kaptdaCnt": "500"}] and total == 1


def test_buckets():
    assert [bucket_of(a) for a in (39.9, 52, 58.9, 59.99, 74.5, 84.97, 101)] == ["소형", "59", "59", "59", "74", "84", "대형"]


def test_norm_name():
    assert norm_name("정든마을(우성6) 아파트") == norm_name("정든마을")


def test_months_back():
    assert months_back(3, date(2026, 2, 15)) == ["202602", "202601", "202512"]


def trade(seq, name, ym, price, area=84.9, jibun="1", umd="정자동"):
    y, m = ym.split("-")
    return {"aptNm": name, "aptSeq": seq, "buildYear": "2005", "dealAmount": f"{price:,}",
            "dealYear": y, "dealMonth": m, "dealDay": "10", "excluUseAr": str(area), "floor": "5",
            "jibun": jibun, "sggCd": "41135", "umdNm": umd, "dealingGbn": "중개거래"}


def test_build_matches_and_computes_growth(tmp_path):
    raw = tmp_path / "raw"
    (raw / "trades" / "41135").mkdir(parents=True)
    (raw / "complexes" / "list").mkdir(parents=True)
    (raw / "complexes" / "info").mkdir(parents=True)

    trades = [
        trade("41135-1", "파크뷰", "2026-08", 200000),
        trade("41135-1", "파크뷰", "2026-07", 190000),
        trade("41135-1", "파크뷰", "2025-08", 160000),
        trade("41135-1", "파크뷰", "2016-08", 80000),
        # 이름이 달라도 지번으로 매칭되는 단지
        trade("41135-2", "상록마을3", "2026-08", 120000, area=59.9, jibun="45"),
        # K-apt에 없는 단지 → 매칭 실패
        trade("41135-3", "나홀로빌", "2026-08", 50000, area=59.0, jibun="99"),
    ]
    (raw / "trades" / "41135" / "202608.json").write_text(json.dumps(trades, ensure_ascii=False))
    (raw / "complexes" / "list" / "41135.json").write_text(json.dumps([
        {"kaptCode": "A100", "kaptName": "분당파크뷰", "bjdCode": "4113510300", "as3": "정자동"},
        {"kaptCode": "A200", "kaptName": "상록우성", "bjdCode": "4113510300", "as3": "정자동"},
    ], ensure_ascii=False))
    (raw / "complexes" / "info" / "A100.json").write_text(json.dumps(
        {"kaptdaCnt": "1829", "kaptUsedate": "20040915", "kaptAddr": "경기도 성남시 분당구 정자동 1 분당파크뷰"}))
    (raw / "complexes" / "info" / "A200.json").write_text(json.dumps(
        {"kaptdaCnt": "1762", "kaptUsedate": "19950101", "kaptAddr": "경기도 성남시 분당구 정자동 45 상록우성"}))

    db = tmp_path / "t.sqlite"
    r = build(raw_dir=raw, db_path=db, today=date(2026, 9, 28))
    assert r == {"complexes": 2, "trades": 6, "trade_complexes": 3, "matched": 2, "stats_rows": 3}

    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row
    park = conn.execute("SELECT * FROM stats WHERE apt_seq='41135-1'").fetchone()
    assert park["kapt_code"] == "A100"  # 이름 포함 매칭
    assert park["ref_price"] == 195000 and park["ref_months"] == 3
    assert park["g1"] == 21.9  # 195000 / 160000
    assert park["g10"] == pytest.approx(143.75, abs=0.1)  # 195000 / 80000
    assert park["g3"] is None and park["g5"] is None
    sang = conn.execute("SELECT kapt_code, bucket FROM stats WHERE apt_seq='41135-2'").fetchone()
    assert tuple(sang) == ("A200", "59")  # 지번 매칭
    households = conn.execute("SELECT households, build_year FROM complexes WHERE kapt_code='A100'").fetchone()
    assert tuple(households) == (1829, 2004)


def test_match_eup_myeon_ri():
    # 읍·면 지역: 실거래는 "공도읍 용두리", K-apt 목록은 as3=공도읍, as4=용두리, 이름도 다르다.
    complexes = [{"kapt_code": "A1", "name": "공도주은풍림", "sgg_cd": "41550", "umd_nm": "공도읍 용두리",
                  "addr": "경기도 안성시 공도읍 용두리 752 공도주은풍림"}]
    trades = [{"apt_seq": "s1", "sgg_cd": "41550", "umd_nm": "공도읍 용두리", "apt_nm": "주은풍림", "jibun": "752"}]
    assert match_complexes(trades, complexes) == {"s1": "A1"}
