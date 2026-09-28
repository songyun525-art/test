import Logo from "./Logo";
import Icon from "./Icon";
import BuildingArt from "./BuildingArt";

const NAV = [
  { icon: "home", label: "아파트 비교", active: true },
  { icon: "search", label: "단지 검색" },
  { icon: "tag", label: "가격대 추천" },
  { icon: "map", label: "지도에서 찾기" },
  { icon: "spark", label: "호재 정보" },
  { icon: "calendar", label: "청약 트래킹", beta: true },
  { icon: "star", label: "관심 단지" },
  { icon: "wallet", label: "내 자금계획" },
  { icon: "info", label: "데이터 소개" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <Logo />
      <nav>
        {NAV.map((n) => (
          <a key={n.label} href="#" className={n.active ? "nav-item active" : "nav-item"} aria-current={n.active ? "page" : undefined}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
            {n.beta && <span className="beta">Beta</span>}
          </a>
        ))}
      </nav>
      <div className="sidebar-art">
        <BuildingArt seed={11} />
      </div>
    </aside>
  );
}
