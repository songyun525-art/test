// 비교함: 비교할 단지(최대 3개)와 관심 단지를 이 브라우저에 저장합니다.
// 여러 화면에서 "비교함에 담기"로 모으고, 첫 화면(아파트 비교)이 이 목록을 읽어 보여 줍니다.
import { complexes } from "./data";

export const MAX_COMPARE = 3;
const KEY = "naezip.compare.v1";
const EVENT = "naezip-compare";

export type StoredSlot = { id: string; area: number; customPrice?: number };
export type CompareState = { slots: StoredSlot[]; liked: string[] };

export function readCompare(): CompareState | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as CompareState | null;
    if (!raw) return null;
    // 데이터가 바뀌어 없어진 단지는 뺍니다.
    return { slots: (raw.slots ?? []).filter((s) => complexes.some((c) => c.id === s.id)), liked: raw.liked ?? [] };
  } catch {
    return null;
  }
}

export function writeCompare(state: CompareState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 저장이 막힌 브라우저에서는 이번 화면에서만 기억합니다 */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** 다른 화면이나 탭에서 비교함이 바뀌면 알려 줍니다. */
export function onCompareChange(cb: () => void) {
  const storage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", storage);
  };
}

/** 비교함에 담습니다. 이미 있으면 평형만 바꾸고, 3개가 차 있으면 가장 먼저 담은 단지를 뺍니다. 알림 문구를 돌려줍니다. */
export function addToCompare(id: string, area: number): string {
  const c = complexes.find((x) => x.id === id);
  if (!c) return "";
  const state = readCompare() ?? { slots: [], liked: [] };
  const slots = state.slots;
  let msg: string;
  let next: StoredSlot[];
  if (slots.some((s) => s.id === id)) {
    const same = slots.some((s) => s.id === id && s.area === area);
    next = slots.map((s) => (s.id === id ? { id, area } : s));
    msg = same ? `${c.name}은(는) 이미 비교함에 있어요.` : `${c.name}을(를) ${area}㎡로 바꿔 담았어요.`;
  } else if (slots.length < MAX_COMPARE) {
    next = [...slots, { id, area }];
    msg = `${c.name}을(를) 비교함에 담았어요 (${next.length}/${MAX_COMPARE}).`;
  } else {
    const out = complexes.find((x) => x.id === slots[0].id);
    next = [...slots.slice(1), { id, area }];
    msg = `${out?.name ?? "첫 단지"} 대신 ${c.name}을(를) 담았어요.`;
  }
  writeCompare({ ...state, slots: next });
  return msg;
}

export function removeFromCompare(id: string) {
  const state = readCompare();
  if (state) writeCompare({ ...state, slots: state.slots.filter((s) => s.id !== id) });
}
