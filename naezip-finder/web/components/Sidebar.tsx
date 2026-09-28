"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import Icon from "./Icon";
import BuildingArt from "./BuildingArt";

const NAV = [
  { icon: "home", label: "아파트 비교", href: "/" },
  { icon: "wallet", label: "내 예산 구하기", href: "/budget" },
  { icon: "pin", label: "지도에서 찾기", href: "/map" },
  { icon: "map", label: "예산에 맞는 집", href: "/find" },
  { icon: "calendar", label: "청약 정보", href: "/subscription" },
  { icon: "book", label: "공부 레퍼런스", href: "/study" },
  { icon: "spark", label: "호재 정보", href: "/#hojae" },
  { icon: "star", label: "관심 단지", soon: true },
  { icon: "info", label: "데이터 소개", soon: true },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/"><Logo /></Link>
      <nav>
        {NAV.map((n) => {
          const active = n.href === path;
          return n.soon ? (
            <span key={n.label} className="nav-item soon" title="준비 중">
              <Icon name={n.icon} />
              <span>{n.label}</span>
              <span className="beta">준비 중</span>
            </span>
          ) : (
            <Link key={n.label} href={n.href!} className={active ? "nav-item active" : "nav-item"} aria-current={active ? "page" : undefined}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-art">
        <BuildingArt seed={11} />
      </div>
    </aside>
  );
}
