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
