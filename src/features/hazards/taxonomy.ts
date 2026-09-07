import { hazard, type HazardType } from '../../theme/tokens';

/**
 * The ten reportable road conditions — Proposal §2.2 and Table 2 (§3.2).
 *
 * Colour is identity and comes from tokens. The user-facing LABEL does not
 * live here: it comes from the active country config, because the wording is
 * regulator-reviewed and differs per market.
 */

export type HazardDefinition = {
  type: HazardType;
  color: string;
  /** Ionicons glyph name — the ring-and-badge treatment, Brand Guide §4.1. */
  icon: string;
  /** Minutes until a report ages out on its own. `null` = until cleared. */
  expiryMinutes: number | null;
  /**
   * Weight the recommended-route calculation gives this condition.
   * 0 means the router must not consider it at all.
   */
  routingWeight: number;
  /** Symbol sort key — higher wins when pins overlap on the map. */
  priority: number;
  /** Why it matters, from Table 2. Shown in the hazard detail sheet. */
  rationale: string;
};

export const HAZARDS: Record<HazardType, HazardDefinition> = {
  pothole: {
    type: 'pothole',
    color: hazard.pothole,
    icon: 'ellipse',
    expiryMinutes: 60 * 24 * 30,
    routingWeight: 1,
    priority: 10,
    rationale: 'Warns approaching drivers in time to slow down or steer around it.',
  },
  construction: {
    type: 'construction',
    color: hazard.construction,
    icon: 'triangle',
    expiryMinutes: 60 * 24 * 14,
    routingWeight: 3,
    priority: 40,
    rationale: 'Feeds the Route Integrity System so construction deviations are pre-approved, not flagged.',
  },
  accident: {
    type: 'accident',
    color: hazard.accident,
    icon: 'close-circle',
    expiryMinutes: 120,
    routingWeight: 5,
    priority: 70,
    rationale: 'Immediate reroute suggestion for the recommended route and for drivers already in transit.',
  },
  roadblock: {
    type: 'roadblock',
    color: hazard.roadblock,
    icon: 'remove-circle',
    expiryMinutes: 360,
    routingWeight: 6,
    priority: 60,
    rationale: 'Automatically qualifies as a legitimate reason for route deviation.',
  },
  flooding: {
    type: 'flooding',
    color: hazard.flooding,
    icon: 'water',
    expiryMinutes: 720,
    routingWeight: 9,
    priority: 90,
    rationale: 'High-priority alert — weighted heavily in the automatic route check.',
  },
  fallenTree: {
    type: 'fallenTree',
    color: hazard.fallenTree,
    icon: 'leaf',
    expiryMinutes: null,
    routingWeight: 8,
    priority: 80,
    rationale: 'Flags the road segment impassable until multiple drivers report it cleared.',
  },
  brokenDown: {
    type: 'brokenDown',
    color: hazard.brokenDown,
    icon: 'car',
    expiryMinutes: 45,
    routingWeight: 2,
    priority: 20,
    rationale: 'Short expiration window; clears automatically once traffic flow normalises.',
  },
  closure: {
    type: 'closure',
    color: hazard.closure,
    icon: 'ban',
    expiryMinutes: null,
    routingWeight: 10,
    priority: 100,
    rationale: 'Excluded entirely from the recommended route until the closure is confirmed cleared.',
  },
  enforcement: {
    type: 'enforcement',
    color: hazard.enforcement,
    icon: 'shield',
    expiryMinutes: 45,
    /**
     * ZERO — and this is load-bearing, not an oversight.
     *
     * Proposal §2.2 frames enforcement reports strictly as road awareness,
     * "never as a tool to evade law enforcement". That has to be structural
     * rather than a copy decision, so the router must not accept this report
     * as an input, and there is no proximity alert or audio cue for it.
     *
     * See `isRoutable()` below and its test.
     */
    routingWeight: 0,
    priority: 30,
    rationale: 'Encourages lawful, attentive driving rather than avoidance behaviour; wording is regulator-reviewed.',
  },
};

/** Display order in the report picker — matches Figure 2 (left). */
export const HAZARD_PICKER_ORDER: HazardType[] = [
  'construction',
  'accident',
  'flooding',
  'pothole',
  'roadblock',
  'brokenDown',
  'closure',
  'enforcement',
  'fallenTree',
];

/**
 * Whether the recommended-route calculation may consider this report.
 *
 * Enforcement reports are always excluded. If this function ever returns true
 * for 'enforcement', the platform's regulatory position is broken — the test
 * in __tests__/hazards.test.ts guards it.
 */
export function isRoutable(type: HazardType): boolean {
  return HAZARDS[type].routingWeight > 0;
}

/** A report is stale once past its expiry window. `null` never expires alone. */
export function isExpired(type: HazardType, reportedAt: number, now = Date.now()): boolean {
  const { expiryMinutes } = HAZARDS[type];
  if (expiryMinutes === null) return false;
  return now - reportedAt > expiryMinutes * 60_000;
}
