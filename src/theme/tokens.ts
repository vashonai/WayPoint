/**
 * Waypoint design tokens — the single source of truth.
 *
 * Values come directly from the Waypoint Brand & Style Guide.
 * Nothing in the app may hardcode a colour, radius or font family;
 * every consumer (StyleSheet, map layers, icons) reads from here.
 *
 * Guide references are noted per group so a designer can audit this file
 * against the document without reading any component code.
 */

/** Brand & Style Guide §2.1 — the four core brand colours. */
export const brand = {
  /** Primary. Buttons, app bar, headings, wordmark "Way". */
  navy: '#10233D',
  /** Secondary. Verified badges, success states, wordmark accent. */
  green: '#0E7C61',
  /**
   * Accent. Destination markers, highlights, premium accents.
   * FILL AND LARGE-BOLD DISPLAY ONLY — 2.3:1 on white, fails WCAG AA.
   * There is deliberately no `text` role for gold; see theme/typography.ts.
   */
  gold: '#E3A008',
  /**
   * Critical. Panic button, destructive actions, critical errors ONLY.
   * Never decorative. 4.4:1 — passes AA for large/bold text only.
   */
  coral: '#D64545',
} as const;

/** Brand & Style Guide §2.2 — neutrals. */
export const neutral = {
  /** App background. */
  paper: '#EDF1EE',
  /** Cards, sheets, input fields. */
  surface: '#FFFFFF',
  /** Secondary text, captions, placeholders. 5.6:1 — passes AA. */
  inkSoft: '#5B6B6F',
  /** Borders, dividers, disabled states. */
  line: '#D8E0DC',
  /** Primary body text. */
  charcoal: '#222222',
} as const;

/**
 * Brand & Style Guide §2.4 — functional map colours.
 *
 * These have exactly one job: telling a driver or passenger what is happening
 * on the road right now. They are NOT part of the brand palette and must never
 * be reused for branding, marketing, or UI state. A "verified" badge uses
 * `brand.green`, never `traffic.clear` — reusing it erodes the signal.
 */
export const traffic = {
  /** Light or no traffic on this road segment. */
  clear: '#34A853',
  /** Moderate congestion. */
  moderate: '#F29900',
  /** Heavy congestion, or a serious incident nearby. */
  heavy: '#EA4335',
  /** No data for this segment. */
  unknown: '#9AA0A6',
} as const;

/**
 * The recommended route and the trail behind the vehicle.
 *
 * Functional, like traffic: the blue line is the route still to drive, drawn
 * above traffic (§3.1); the grey line is where the vehicle has actually been.
 */
export const routeLine = {
  ahead: '#2B6CF6',
  casing: '#12428F',
  taken: '#6B7780',
} as const;

/** Brand & Style Guide §2.4 — basemap features. */
export const mapFeature = {
  water: '#B7DEF5',
  greenSpace: '#D7ECD3',
} as const;

/**
 * Hazard identity colours — Proposal §3.2 (Table 2) and Figure 2.
 *
 * These are IDENTITY, not state: a flooding pin is this blue in every theme.
 * Rendered as a 2px ring on a white circle per Brand Guide §4.1.
 */
export const hazard = {
  pothole: '#7B4A2B',
  construction: brand.gold,
  accident: '#EA4335',
  roadblock: '#D35400',
  flooding: '#3AA0E8',
  fallenTree: brand.green,
  brokenDown: '#8A979A',
  closure: '#B3261E',
  /** Navy — display only, zero routing weight. See features/hazards. */
  enforcement: brand.navy,
} as const;

/** Brand & Style Guide §4.2 — corner radius. */
export const radius = {
  /** Cards. */
  card: 16,
  /** Buttons and input fields. */
  control: 12,
  /** Phone frames and large containers. */
  frame: 32,
  pill: 999,
} as const;

/**
 * Brand & Style Guide §4.2 — "soft, low-opacity shadows only".
 * No hard drop shadows anywhere in the product.
 */
export const elevation = {
  card: {
    shadowColor: brand.navy,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sheet: {
    shadowColor: brand.navy,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
} as const;

/** 4pt spacing scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Minimum touch target. Non-negotiable on safety controls. */
export const HIT_SLOP_MIN = 44;

export const tokens = {
  brand,
  neutral,
  traffic,
  routeLine,
  mapFeature,
  hazard,
  radius,
  elevation,
  space,
} as const;

export type HazardType = keyof typeof hazard;
export type TrafficLevel = keyof typeof traffic;
