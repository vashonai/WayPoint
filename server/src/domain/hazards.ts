import { HAZARDS } from '../../../src/features/hazards/taxonomy';
import type { HazardType as ClientHazardType } from '../../../src/theme/tokens';

/**
 * The ten reportable road conditions, as the database names them.
 *
 * The app's taxonomy (src/features/hazards/taxonomy.ts) is the source of the
 * expiry and routing rules; this file maps its keys onto the database's and
 * adds `congestion`, which the app does not show yet (PLAN-DATA-LAYER.md, C5).
 */
export const HAZARD_TYPES = [
  'pothole',
  'construction',
  'accident',
  'congestion',
  'roadblock',
  'flooding',
  'fallen_tree',
  'broken_down_vehicle',
  'road_closure',
  'traffic_enforcement',
] as const;

export type HazardType = (typeof HAZARD_TYPES)[number];

/** Database name → app taxonomy key. `congestion` has no app key yet. */
export const CLIENT_HAZARD_KEY: Record<HazardType, ClientHazardType | null> = {
  pothole: 'pothole',
  construction: 'construction',
  accident: 'accident',
  congestion: null,
  roadblock: 'roadblock',
  flooding: 'flooding',
  fallen_tree: 'fallenTree',
  broken_down_vehicle: 'brokenDown',
  road_closure: 'closure',
  traffic_enforcement: 'enforcement',
};

export type HazardRule = {
  /** Minutes until a report ages out on its own. Null = until cleared. */
  expiryMinutes: number | null;
  /** 0 = the router and deviation excusal must never consider it. */
  routingWeight: number;
};

/**
 * ASSUMPTION, pending product sign-off: congestion clears quickly and should
 * influence routing moderately. Revisit when the app adds the type.
 */
const CONGESTION_RULE: HazardRule = { expiryMinutes: 60, routingWeight: 4 };

/** Default rules, from the app's taxonomy. A country's config may override them. */
export const DEFAULT_HAZARD_RULES: Record<HazardType, HazardRule> = Object.fromEntries(
  HAZARD_TYPES.map((type) => {
    const key = CLIENT_HAZARD_KEY[type];
    const rule = key
      ? { expiryMinutes: HAZARDS[key].expiryMinutes, routingWeight: HAZARDS[key].routingWeight }
      : CONGESTION_RULE;
    return [type, rule];
  }),
) as Record<HazardType, HazardRule>;

/**
 * Types the router and deviation excusal may never consider, whatever a
 * country config says. Enforcement reports are road awareness only (Proposal
 * §2.2) — making that structural is the point, so it is a constant, not data.
 */
export const NON_ROUTABLE_HAZARDS: readonly HazardType[] = ['traffic_enforcement'];

/** H3 resolution for hazard cells: ~0.1 km² hexagons, about a city block. */
export const HAZARD_H3_RESOLUTION = 9;
