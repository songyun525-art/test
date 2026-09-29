"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { complexes } from "@/lib/data";
import { addToCompare, MAX_COMPARE, onCompareChange, readCompare, removeFromCompare, type StoredSlot } from "@/lib/compareStore";

export function useCompareSlots() {
  const [slots, setSlots] = useState<StoredSlot[]>([]);
  useEffect(() => {
    const sync = () => setSlots(readCompare()?.slots ?? []);
    sync();
    return onCompareChange(sync);
  }, []);
  return slots;
}

let flashTimer: ReturnType<typeof setTimeout> | undefined;
function flash(msg: string) {
  window.dispatchEvent(new CustomEvent("naezip-flash", { detail: msg }));
}

/** 누르면 이동하지 않고 비교함에만 담는 버튼 */
export function AddToCompare({ id, area, className = "link-btn", label = "비교함에 담기" }: { id: string; area: number; className?: string; label?: string }) {
  const slots = useCompareSlots();
  const inTray = slots.some((s) => s.id === id && s.area === area);
  return (
    <button
      type="button"
      className={`${className}${inTray ? " added" : ""}`}
      aria-pressed={inTray}
      onClick={() => (inTray ? removeFromCompare(id) : flash(addToCompare(id, area)))}
    >
      {inTray ? "✓ 담음" : label}
    </button>
  );
}

/** 화면 아래에 떠 있는 비교함: 담은 단지와 "비교하러 가기" */
export default function CompareTray() {
  const slots = useCompareSlots();
  const pathname = usePathname();
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => setMsg(""), 2500);
    };
    window.addEventListener("naezip-flash", on);
    return () => window.removeEventListener("naezip-flash", on);
  }, []);
  // 비교 화면 자체에서는 띄우지 않습니다.
  if (pathname === "/" || (!slots.length && !msg)) return null;
  return (
    <div className="compare-tray" role="region" aria-label="비교함">
      {msg && <div className="tray-msg" role="status">{msg}</div>}
      {slots.length > 0 && (
        <div className="tray-bar">
          <b className="tray-count">비교함 {slots.length}/{MAX_COMPARE}</b>
          <ul>
            {slots.map((s) => {
              const c = complexes.find((x) => x.id === s.id);
              return (
                <li key={s.id}>
                  <span>{c?.name} <em>{s.area}㎡</em></span>
                  <button type="button" onClick={() => removeFromCompare(s.id)} aria-label={`${c?.name} 빼기`}>×</button>
                </li>
              );
            })}
          </ul>
          <Link href="/" className="tray-go">비교하러 가기 →</Link>
        </div>
      )}
    </div>
  );
}
