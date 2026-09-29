// 3단계 · 호재 확실성 등급. 점수 반영은 hojaeGradeScore 로 따로 두고, 아직 종합점수에는 연결하지 않았습니다.
import type { Hojae } from "../data";
import type { HojaeDetail, HojaeGrade, HojaeType } from "./types";

export const GRADE_LABEL: Record<HojaeGrade, string> = { S: "개통/완공", A: "공사 중", B: "착공 예정", C: "계획 발표", D: "검토/구상" };

/** 지금 호재 목록의 진행 상태 → 등급 ("진행 중"은 지구 지정·정비계획 수립 단계라 B로 봅니다) */
const STATUS_GRADE: Record<Hojae["status"], HojaeGrade> = { 개통: "S", "공사 중": "A", "진행 중": "B", 계획: "C" };
const TYPE_OF: Record<Hojae["category"], HojaeType> = { GTX: "GTX", "신규 노선": "신규 노선", "정비·개발": "정비사업", 일자리: "일자리" };

const CAUTION: Record<HojaeGrade, string> = {
  S: "",
  A: "개통 시점 변동 가능",
  B: "착공·개통 시점 변동 가능",
  C: "사업 지연·변경 가능",
  D: "실현 여부 불확실",
};

export function hojaeDetail(h: Hojae): HojaeDetail {
  const grade = STATUS_GRADE[h.status];
  return { id: h.id, title: h.title, type: TYPE_OF[h.category], grade, stage: GRADE_LABEL[grade], expected: "", caution: CAUTION[grade] };
}

/** 등급별 반영 비율 (S 100% … D 20%) */
export const GRADE_FACTOR: Record<HojaeGrade, number> = { S: 1, A: 0.85, B: 0.6, C: 0.4, D: 0.2 };
const TYPE_POINTS: Record<HojaeType, number> = { GTX: 25, "신규 노선": 15, 정비사업: 10, 일자리: 10, 기타: 5 };

/** 호재 점수 (0~100): 기본 50점에 호재마다 유형 점수 × 등급 비율을 더합니다. */
export function hojaeGradeScore(list: HojaeDetail[]) {
  return Math.min(100, Math.round(list.reduce((s, h) => s + TYPE_POINTS[h.type] * GRADE_FACTOR[h.grade], 50)));
}
