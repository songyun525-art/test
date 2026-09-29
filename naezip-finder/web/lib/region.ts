// 마지막으로 고른 지역을 이 브라우저에 기억해, 어느 화면으로 옮겨 가도 같은 지역으로 보여 줍니다.
import { useCallback, useSyncExternalStore } from "react";

export const ALL_REGION = "경기도 전체";
const KEY = "naezip.region.v1";
const EVENT = "naezip-region";

function read(): string {
  try {
    return localStorage.getItem(KEY) || ALL_REGION;
  } catch {
    return ALL_REGION;
  }
}

function subscribe(cb: () => void) {
  const storage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", storage);
  };
}

export function useRegion(): [string, (region: string) => void] {
  const region = useSyncExternalStore(subscribe, read, () => ALL_REGION);
  const setRegion = useCallback((next: string) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* 저장이 막힌 브라우저 */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [region, setRegion];
}
