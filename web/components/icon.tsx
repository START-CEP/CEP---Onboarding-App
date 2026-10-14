// Iconos de la maqueta Ruta (trazo 1.8, 24×24).
const PATHS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  play: "M8 5v14l11-7z",
  pen: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 19v2H6",
  cal: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6",
  check: "M5 12l5 5L20 7",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  arrow: "M5 12h14M13 6l6 6-6 6",
  chat: "M4 5h16v11H9l-5 4z",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  out: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  flag: "M5 21V4h11l-2 4 2 4H5",
  user: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  if (name === "play") {
    return (
      <svg className="i" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={PATHS.play} />
      </svg>
    );
  }
  return (
    <svg className="i" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
