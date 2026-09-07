import { TextStyle } from 'react-native';

import { neutral } from './tokens';

/**
 * Brand & Style Guide §3.1 — typefaces.
 *
 * Fraunces  — display and wordmark. Marketing headlines, onboarding screens.
 * Inter     — the entire in-app UI. Buttons, labels, fares, lists.
 * Plex Mono — DOCUMENTED EXTENSION, not in the guide. Developer-facing surfaces
 *             only: trip IDs, plate numbers, reference codes, debug overlays.
 *             Confirm with the founder before it reaches a passenger screen.
 */
export const fontFamily = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

/**
 * Brand & Style Guide §3.2 — the type scale.
 * Sizes are fixed by the guide; do not invent intermediate steps.
 */
export const type = {
  /** H1 — screen titles. 28–32px bold. */
  h1: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: neutral.charcoal,
  },
  /** H2 — section headers, card titles. 20–22px bold. */
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.2,
    color: neutral.charcoal,
  },
  /** H3 — sub-sections. */
  h3: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    lineHeight: 23,
    color: neutral.charcoal,
  },
  /** Body — standard UI text. 14–16px regular. */
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: neutral.charcoal,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
    color: neutral.charcoal,
  },
  /** Caption — timestamps, helper text, legend labels. 11–12px. */
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: neutral.inkSoft,
  },
  captionStrong: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    color: neutral.inkSoft,
  },
  /** Button label — all CTAs. 14–15px bold. */
  button: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  /**
   * Money. Tabular figures keep fare digits aligned in receipts and
   * earnings ledgers — Brand & Style Guide §3.1.
   */
  money: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
    color: neutral.charcoal,
  },
  moneyLarge: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
    color: neutral.charcoal,
  },
  /** Developer-facing mono. */
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    lineHeight: 16,
    color: neutral.inkSoft,
  },
  /** Uppercase eyebrow labels. */
  eyebrow: {
    fontFamily: fontFamily.monoMedium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: neutral.inkSoft,
  },
} satisfies Record<string, TextStyle>;
