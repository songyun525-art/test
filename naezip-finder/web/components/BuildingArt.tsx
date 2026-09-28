// 단지 사진 대신 쓰는 아파트 일러스트. 실제 사진이 생기면 <img>로 바꿉니다.
const PALETTES = [
  ["#eef1f5", "#d9dee6", "#b8c2cf"],
  ["#f3efe9", "#e2d9cc", "#c7b9a5"],
  ["#eef3f1", "#d6e1dc", "#b3c5bd"],
  ["#f1f1f4", "#dcdce4", "#bdbdcb"],
];

function rand(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function BuildingArt({ seed, className }: { seed: number; className?: string }) {
  const r = rand(seed + 3);
  const pal = PALETTES[seed % PALETTES.length];
  const towers = Array.from({ length: 6 }, (_, i) => {
    const w = 20 + r() * 8;
    const h = 45 + r() * 40;
    const x = 8 + i * 31 + r() * 6;
    return { x, w, h, shade: pal[Math.floor(r() * 3)] };
  });
  return (
    <svg className={className} viewBox="0 0 200 100" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id={`sky${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe3f5" />
          <stop offset="1" stopColor="#f4f8fb" />
        </linearGradient>
      </defs>
      <rect width="200" height="100" fill={`url(#sky${seed})`} />
      {towers.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={100 - t.h} width={t.w} height={t.h} fill={t.shade} stroke="#a9b3bf" strokeWidth="0.4" />
          <rect x={t.x} y={100 - t.h} width={t.w} height="3" fill="#8f9aa8" />
          {Array.from({ length: Math.floor(t.h / 5) - 1 }, (_, row) => (
            <line
              key={row}
              x1={t.x + 2}
              x2={t.x + t.w - 2}
              y1={100 - t.h + 6 + row * 5}
              y2={100 - t.h + 6 + row * 5}
              stroke="#8fa2b8"
              strokeWidth="1.3"
              strokeDasharray="3 1.5"
              opacity="0.55"
            />
          ))}
        </g>
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={i * 24 + 6} cy={98} r={5 + (i % 3)} fill={i % 2 ? "#7fae6b" : "#94bf7c"} />
      ))}
      <rect y="97" width="200" height="3" fill="#8bb574" />
    </svg>
  );
}
