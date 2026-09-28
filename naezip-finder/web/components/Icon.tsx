const PATHS: Record<string, string> = {
  home: "M3 11 12 4l9 7M5 10v10h14V10",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  tag: "M3 12V4h8l9 9-8 8-9-9zM7.5 7.5h.01",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  wallet: "M3 7h16v12H3zM3 7l12-3v3M15 13h2",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  pin: "M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01",
  book: "M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 5v16",
  heart: "M12 20s-8-4.8-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8C20 15.2 12 20 12 20z",
  x: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  chevron: "m6 9 6 6 6-6",
  right: "m9 6 6 6-6 6",
  pencil: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  crown: "M3 8l4 4 5-7 5 7 4-4-2 11H5z",
  building: "M5 21V4h9v17M14 9h5v12M8 8h3M8 12h3M8 16h3",
  trend: "M3 17 9 11l4 4 8-8M15 7h6v6",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  bus: "M5 17V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11zM5 12h14M8 20v-3M16 20v-3",
};

export default function Icon({ name, size = 18, fill = false }: { name: string; size?: number; fill?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
