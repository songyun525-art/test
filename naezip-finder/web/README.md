# 윤송이의 내집찾기 · 웹 화면

시안 이미지를 바탕으로 만든 Next.js 화면입니다. 지금은 `lib/data.ts`의 **샘플 데이터**로 동작하고, 수집 스크립트(`naezip-finder/` 상위 폴더) 결과가 나오면 같은 모양의 JSON으로 바꿉니다.

## 실행

```bash
cd naezip-finder/web
npm install
npm run dev      # http://localhost:3000
```

## 구성

| 파일 | 내용 |
|---|---|
| `lib/data.ts` | 샘플 단지 21개, 경기도 주요 호재 21개 |
| `lib/budget.ts` | 예산 계산 (DSR·LTV·주담대 한도·정책대출) |
| `lib/score.ts` | 종합점수(입지30·상승률25·세대수15·연식15·호재15), ±5% 추천, 가격 추이 |
| `components/` | 사이드바, 검색, 단지 비교 카드, 지도(약도), 점수표, 가격 차트, 추천, 호재 |

## 화면

| 주소 | 화면 |
|---|---|
| `/` | 아파트 비교 (종합점수, 가격 추이, 상세 비교표, ±5% 추천, 호재) |
| `/budget` | 내 예산 구하기 (현금·소득·가구 상황·금리·규제지역·가격대·기존 대출·생애최초) |
| `/map` | 전체 화면 지도, 단지마다 가격 말풍선 (평형·최대 가격·지역 필터) |
| `/find` | 예산에 맞는 집 (리스트 + 지도, 59/84 필터) |
| `/subscription` | 청약 정보 (경기도 분양 일정, 분양가 vs 주변 시세, 청약 가점 계산) |
| `/study` | 공부 레퍼런스 (시별 대장아파트, 1년 상승·하락 TOP, 거래 활발 TOP) |

대출 규정은 `lib/budget.ts`의 `RULES`에 모아 두었습니다 (2025년 10월 수도권 기준 요약).

## 되는 것

- 단지 검색 → 비교에 추가 (최대 3개), 빼기, 평형 변경
- 호가 직접 입력 → 추천 단지가 그 가격 ±5%로 다시 계산
- 항목별 점수 설명에서 가중치 조절
- 지도 확대·축소, 리스트 보기, 호재 탭 필터, 차트에 마우스를 올리면 분기별 가격

## 판단 지표 (전세·거래 신뢰도·고점 회복률)

점수가 높은 단지만이 아니라 실제로 집을 볼 때의 판단 기준을 함께 보여 줍니다.

| 단계 | 지표 | 계산 (`lib/metrics/`) | 화면 (`components/metrics/`) |
|---|---|---|---|
| 1 ✅ | 전세가율 · 매매-전세 갭 · 1년 전세 상승률 | `jeonse.ts` | `JeonseLine` — 비교 카드, 종합 비교 결과 보조 지표, 상세 비교표 |
| 1 ✅ | 거래 신뢰도 (3개월 5건↑ 높음 / 1~4건 보통 / 6·12개월로 넓힘 낮음) | `trust.ts` | `TrustLine` — 기준가 아래, 상세 비교표 |
| 1 ✅ | 고점 대비 하락률 · 회복률 (10년 분기 중위가 최고치 기준) | `recovery.ts` | `PeakRecoveryCard` — 가격 추이 아래, 상세 비교표 |
| 2 ✅ | 입주물량 리스크 (반경 3km 3년 1,000/5,000세대 기준), 리스크 요약 | `supply.ts`, `risk.ts` | 상세 비교표 입주물량 행, `RiskSummaryCard` — 상세 비교표 위 |
| 3 | 자금 부담 계산, 호재 확실성 등급, 점수 기준 토글 | `funding.ts`, `hojaeGrade.ts`, `profiles.ts` | (예정) `FundingCard`, `HojaeGradeCard`, `ScoreProfileToggle` |

타입은 모두 `lib/metrics/types.ts`에 있습니다. 입주 예정 단지는 `scripts/fetch-supply.py`가 청약홈 분양정보에서 모아 `lib/supply.json`에 씁니다 (일반분양 세대수라 조합원·임대 물량은 빠짐). 거래 신뢰도·10년 최고가는 `scripts/export-complexes.py`가 수집 DB에서 뽑아 `lib/complexes.json`에 넣습니다.

전세는 공공데이터포털 **국토교통부_아파트 전월세 실거래가 자료**(2026-09-29 승인)로 최근 3개월 순수 전세 중위가를 씁니다. 전세 원자료가 없으면 화면 확인용 예시 값이 `예시` 표시와 함께 나옵니다. 갱신:

```bash
python3 scripts/fetch-rents.py --out ../data/raw/rents        # 최근 25개월 전월세 원자료
python3 scripts/export-complexes.py export --db ... --cache ... --kapt-info ... --rents ../data/raw/rents
```

## 다음 단계

- 실제 수집 데이터 연결, 카카오맵으로 지도 교체
- Vercel 배포

## 지도 키 (선택)

`/map` 지도는 `NEXT_PUBLIC_KAKAO_JS_KEY`(카카오 JavaScript 키)가 있으면 카카오맵을, 없으면 OpenStreetMap을 씁니다.
카카오 개발자 콘솔에서 JavaScript SDK 도메인(또는 Web 플랫폼 사이트 도메인)에 배포 주소를 등록해야 합니다.

## 실제 단지 데이터 넣기

수집기(`naezip-finder/collector`)가 만든 `naezip.sqlite`를 사이트용 `lib/complexes.json`으로 바꿉니다.
`lib/complexes.json`이 비어 있으면 샘플 21개 단지를 씁니다.

```bash
# 1) 단지 좌표, 가장 가까운 지하철역·초등학교 거리 (카카오 로컬, 이미 구한 단지는 건너뜀)
KAKAO_REST_KEY=... python3 scripts/export-complexes.py geo --db ../data/naezip.sqlite --cache ../data/web/geo.json --workers 32
# 2) 내보내기: 최근 1년 거래가 있고 100세대 이상(세대수 모르면 10년 거래 30건 이상)인 단지
python3 scripts/export-complexes.py export --db ../data/naezip.sqlite --cache ../data/web/geo.json
```
