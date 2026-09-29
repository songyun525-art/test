import Icon from "../Icon";
import type { Tone } from "@/lib/metrics/types";

/** 판단 지표 배지 (good 초록 · normal 회색 · warn 주황 · none 흐림) */
export function MetricBadge({ tone, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span className={`mbadge ${tone}`} title={title}>
      {children}
    </span>
  );
}

/** 마우스를 올리면 설명이 뜨는 (i) 아이콘 */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip" title={text} aria-label={text} role="img">
      <Icon name="info" size={13} />
    </span>
  );
}

/** 전월세 API 연결 전 예시 값 표시 */
export function SampleTag({ what = "전세" }: { what?: string }) {
  return (
    <span className="sample-tag" title={`${what} 실거래 데이터를 연결하기 전 화면 확인용 예시 값입니다.`}>
      예시
    </span>
  );
}
