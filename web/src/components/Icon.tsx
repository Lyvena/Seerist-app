/**
 * The icon set.
 *
 * Inline SVG rather than emoji: emoji render differently on every OS, carry
 * their own colour, and read as a toy in a console people run a business from.
 * These inherit `currentColor` and the surrounding font size, so one icon works
 * in a nav item, a button and a badge without variants.
 *
 * Drawn on a 24×24 grid with a 1.75 stroke so they stay even next to Inter.
 */

export type IconName = keyof typeof PATHS;

/** Stroked outlines. `fill` entries are for the few shapes that need a solid. */
const PATHS = {
  // --- Navigation ---
  home: 'M3 10.6 12 3.2l9 7.4M5.6 9.4V20.3h12.8V9.4M9.6 20.3v-5.6h4.8v5.6',
  queue: 'M4.2 4.2h4.4v15.6H4.2zM9.8 4.2h4.4v10.6H9.8zM15.4 4.2h4.4v6.6h-4.4z',
  analytics: 'M3.4 20.4h17.2M6.6 20.4v-5.8M11.4 20.4V6.2M16.2 20.4v-9.4',
  radar: 'M12 12.2 17 7.4M12 20.4a8.2 8.2 0 1 1 8.2-8.2M12 16.6a4.4 4.4 0 1 1 4.4-4.4',
  delivery: 'M2.8 6.6h10.6v9.8H2.8zM13.4 10.2h3.9l3 3.2v3H13.4zM6.6 19.4a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM17.4 19.4a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z',
  growth: 'M3.2 16.8 9 11l4 4 7.6-7.6M15.4 7.4h5.2v5.2',
  personas: 'M8.4 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM2.8 20.2c0-3.1 2.5-5.2 5.6-5.2s5.6 2.1 5.6 5.2M16 5.1a3.2 3.2 0 0 1 0 6.2M17.4 15.2c2.3.5 3.8 2.3 3.8 5',
  settings: 'M4 7.2h3.4M12.2 7.2h7.8M4 12h9.4M18.2 12h1.8M4 16.8h5M13.8 16.8h6.2M9.8 7.2a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 0 0-4.4 0zM15.8 12a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 0 0-4.4 0zM11.4 16.8a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 0 0-4.4 0z',

  // --- Actions ---
  plus: 'M12 5v14M5 12h14',
  check: 'M4.8 12.6 9.6 17.4 19.2 6.6',
  close: 'M6 6l12 12M18 6 6 18',
  refresh: 'M20.2 12a8.2 8.2 0 1 1-2.6-6M20.4 4.4v5.2h-5.2',
  play: 'M8 5.4 18.6 12 8 18.6z',
  search: 'M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4zM16.2 16.2 20.6 20.6',
  filter: 'M3.6 5.4h16.8L14 12.8v5.6l-4 2.2v-7.8z',
  copy: 'M9.4 9.4h9.4v9.4H9.4zM5.2 14.6V5.2h9.4',
  external: 'M14.4 4.4h5.2v5.2M19.6 4.4 11.4 12.6M17.4 14v5.6H4.4V6.6H10',
  chevron: 'M8.6 5.2 15.4 12l-6.8 6.8',
  send: 'M20.6 3.4 3.4 10.2l6.6 2.8 2.8 6.6z',
  trash: 'M4.6 6.6h14.8M9.4 6.6V4.4h5.2v2.2M6.6 6.6l1 12.8h8.8l1-12.8',

  // --- Signals ---
  bell: 'M12 3.6a5.6 5.6 0 0 0-5.6 5.6c0 5-2 6.6-2 6.6h15.2s-2-1.6-2-6.6A5.6 5.6 0 0 0 12 3.6zM10.2 19.2a2 2 0 0 0 3.6 0',
  mail: 'M3.4 5.6h17.2v12.8H3.4zM3.4 6.6 12 13l8.6-6.4',
  clock: 'M12 20.4a8.4 8.4 0 1 0 0-16.8 8.4 8.4 0 0 0 0 16.8zM12 7.2V12l3.2 2',
  alert: 'M12 4.2 21 19.4H3zM12 10v4M12 17.2v.1',
  info: 'M12 20.4a8.4 8.4 0 1 0 0-16.8 8.4 8.4 0 0 0 0 16.8zM12 11v5.4M12 7.8v.1',
  shield: 'M12 3.4 4.6 6.4v5.2c0 4.6 3.1 7.9 7.4 9 4.3-1.1 7.4-4.4 7.4-9V6.4z',
  sparkle: 'M12 3.6 13.9 9 19.4 11 13.9 13 12 18.4 10.1 13 4.6 11 10.1 9zM18.6 16.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  target: 'M12 20.4a8.4 8.4 0 1 0 0-16.8 8.4 8.4 0 0 0 0 16.8zM12 16.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zM12 13.4a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z',
  bolt: 'M13.4 3.4 4.6 13.8h6L10.6 20.6l8.8-10.4h-6z',
  lock: 'M5.8 10.6h12.4v9H5.8zM8.6 10.6V7.8a3.4 3.4 0 0 1 6.8 0v2.8',
  pause: 'M9 5.4v13.2M15 5.4v13.2',

  // --- Personas & domain ---
  scout: 'M6.4 19.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8zM17.6 19.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8zM9.8 16h4.4M6.4 12.6 8.2 5h3.2l-1.6 8M17.6 12.6 15.8 5h-3.2l1.6 8',
  pen: 'M4.4 19.6h4l11-11a2.8 2.8 0 0 0-4-4l-11 11zM14.4 6.6l3 3',
  hammer: 'M14.4 3.6 20.4 9.6l-2.8 2.8-6-6zM12.2 9 4.4 16.8a2.2 2.2 0 0 0 3.2 3.2L15.4 12',
  handshake: 'M3.4 10.4 7 6.8h4l2 2 2-2h4l3.6 3.6M7 13l3 3M12 8.8l-3.4 3.4a1.9 1.9 0 0 0 2.7 2.7l1-1 1.6 1.6a1.7 1.7 0 0 0 2.4-2.4M3.4 10.4v4.2l3 3M20.6 10.4v4.2l-3 3',
  sprout: 'M12 20.4v-7.2M12 13.2C12 9.6 9.2 6.8 5.6 6.8c0 3.6 2.8 6.4 6.4 6.4zM12 13.2c0-3.2 2.4-5.6 5.6-5.6 0 3.2-2.4 5.6-5.6 5.6z',
  clipboard: 'M8.6 4.8H6.4v14.8h11.2V4.8h-2.2M8.6 4.8V3.4h6.8v1.4zM9 11h6M9 15h4',
  crown: 'M4 17.6h16M4 17.6 3 7.4l5 3.6 4-6.4 4 6.4 5-3.6-1 10.2',
  building: 'M4.4 20.4V4.4h9.2v16M13.6 20.4V9.6h6v10.8M7.2 8h3.2M7.2 12h3.2M7.2 16h3.2M16 13h1.2M16 16.6h1.2',
  rocket: 'M12 3.4c3.2 2.4 5 6.2 5 10.2l-2.6 2.6H9.6L7 13.6c0-4 1.8-7.8 5-10.2zM12 11.4a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8zM9.6 16.2 8 20.6l3.2-1.6M14.4 16.2l1.6 4.4-3.2-1.6',
  brain: 'M9.4 4.6a3 3 0 0 0-3 3 3 3 0 0 0-1.6 5.4A3.2 3.2 0 0 0 8 19.4a2.8 2.8 0 0 0 4-1.2V4.6a2.6 2.6 0 0 0-2.6 0zM14.6 4.6a3 3 0 0 1 3 3 3 3 0 0 1 1.6 5.4A3.2 3.2 0 0 1 16 19.4a2.8 2.8 0 0 1-4-1.2',
  puzzle: 'M9 4.4h3.4a1.6 1.6 0 1 1 3.2 0h3.4v3.4a1.6 1.6 0 1 0 0 3.2v3.4h-3.4a1.6 1.6 0 1 0-3.2 0H9v-3.2a1.6 1.6 0 1 1 0-3.2z',
  link: 'M10 13.6a3.8 3.8 0 0 0 5.6.4l2.6-2.6a3.8 3.8 0 0 0-5.4-5.4l-1.4 1.4M14 10.4a3.8 3.8 0 0 0-5.6-.4l-2.6 2.6a3.8 3.8 0 0 0 5.4 5.4l1.4-1.4',
  database: 'M12 8.6c4 0 7.2-1.2 7.2-2.6S16 3.4 12 3.4 4.8 4.6 4.8 6s3.2 2.6 7.2 2.6zM4.8 6v12c0 1.4 3.2 2.6 7.2 2.6s7.2-1.2 7.2-2.6V6M4.8 12c0 1.4 3.2 2.6 7.2 2.6s7.2-1.2 7.2-2.6',
  chart: 'M4.4 4.4v15.2h15.2M8 16V11M12 16V7.4M16 16v-3.4',
} as const;

/** Icons whose geometry reads better filled than stroked. */
const FILLED = new Set<IconName>(['play', 'send']);

export function Icon({
  name,
  size,
  className,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const filled = FILLED.has(name);
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      width={size ?? '1.15em'}
      height={size ?? '1.15em'}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The Seerist mark, inline so it inherits colour in dark surfaces too. */
export function Logomark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lm-ring" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="lm-core" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#4338ca" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path
        d="M 336.3 141.3 A 140 140 0 1 0 385.0 306.0"
        fill="none"
        stroke="url(#lm-ring)"
        strokeWidth="54"
        strokeLinecap="round"
      />
      <circle cx="393" cy="119" r="42" fill="url(#lm-core)" />
      <circle cx="256" cy="256" r="52" fill="url(#lm-core)" />
    </svg>
  );
}

export default Icon;
