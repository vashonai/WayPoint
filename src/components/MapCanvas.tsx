import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HAZARDS } from '../features/hazards/taxonomy';
import { brand, mapFeature, neutral, radius, routeLine, space, traffic } from '../theme/tokens';
import type { HazardType } from '../theme/tokens';
import { type } from '../theme/typography';
import { HazardIcon } from './HazardIcon';

export type MapHazard = {
  id: string;
  type: HazardType;
  /** Percentage position within the canvas. Stands in for lat/lng here. */
  x: number;
  y: number;
};

export type MapSegment = {
  id: string;
  level: 'clear' | 'moderate' | 'heavy';
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  hazards?: MapHazard[];
  segments?: MapSegment[];
  showRoute?: boolean;
  children?: React.ReactNode;
};

/**
 * The live map surface — Proposal §3, Figure 1.
 *
 * SCAFFOLD IMPLEMENTATION. This renders the real visual language (traffic-
 * coloured segments, the recommended-route line above them, ring-and-badge
 * hazard pins) using plain views, so the rest of the frontend can be built,
 * reviewed and tested today without a native dev build.
 *
 * The trip screens have moved to `LiveMap` (react-native-maps); home and
 * quote still render this. The layer order below is the one LiveMap keeps:
 *
 *   6  puck            driver position, bearing-rotated (UI thread)
 *   5  hazard-symbols  clustered SymbolLayer, 10 icon types
 *   4  route-casing    darker outline, keeps the route legible over red
 *   3  route-line      solid, above traffic BY DESIGN (§3.1)
 *   2  traffic-line    data-driven clear / moderate / heavy
 *   1  basemap         custom style — water & green space from the brand guide
 *
 * Two rules survive the swap and are the reason this component is memoised:
 *   - Never mount a map inside a component that re-renders on a timer, a
 *     location update, or a trip-phase change.
 *   - Memoise every FeatureCollection handed to a ShapeSource; a fresh object
 *     identity forces a full native source reload.
 */
export const MapCanvas = memo(function MapCanvas({
  hazards = [],
  segments = [],
  showRoute = true,
  children,
}: Props) {
  return (
    <View style={styles.canvas} accessibilityLabel="Live map">
      {/* Layer 1 — basemap */}
      <View style={styles.water} />
      <View style={styles.park} />

      {/* Layer 2 — traffic segments */}
      {segments.map((seg) => (
        <View
          key={seg.id}
          style={[
            styles.segment,
            {
              left: `${seg.x}%`,
              top: `${seg.y}%`,
              width: `${seg.width}%`,
              height: seg.height,
              backgroundColor: traffic[seg.level],
            },
          ]}
        />
      ))}

      {/* Layers 3 & 4 — the recommended route, drawn ABOVE traffic so it is
          never confused with the underlying road colour (§3.1). */}
      {showRoute ? (
        <>
          <View style={[styles.routeCasing, styles.routeH]} />
          <View style={[styles.routeCasing, styles.routeV]} />
          <View style={[styles.route, styles.routeH]} />
          <View style={[styles.route, styles.routeV]} />
        </>
      ) : null}

      {/* Layer 5 — hazard pins */}
      {hazards.map((h) => (
        <View key={h.id} style={[styles.pin, { left: `${h.x}%`, top: `${h.y}%` }]}>
          <HazardIcon type={h.type} size={28} />
        </View>
      ))}

      <View style={styles.legend} pointerEvents="none">
        <Text style={styles.legendTitle}>Live traffic</Text>
        <View style={styles.legendRow}>
          {(['clear', 'moderate', 'heavy'] as const).map((lvl) => (
            <View key={lvl} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: traffic[lvl] }]} />
              <Text style={styles.legendLabel}>{lvl}</Text>
            </View>
          ))}
        </View>
      </View>

      {children}
    </View>
  );
});

/** Hazard fixtures roughly matching the Figure 1 layout around New Kingston. */
export const DEMO_HAZARDS: MapHazard[] = [
  { id: 'h1', type: 'pothole', x: 14, y: 26 },
  { id: 'h2', type: 'construction', x: 47, y: 22 },
  { id: 'h3', type: 'accident', x: 70, y: 27 },
  { id: 'h4', type: 'enforcement', x: 86, y: 17 },
  { id: 'h5', type: 'flooding', x: 9, y: 61 },
  { id: 'h6', type: 'roadblock', x: 29, y: 63 },
  { id: 'h7', type: 'fallenTree', x: 49, y: 62 },
  { id: 'h8', type: 'brokenDown', x: 69, y: 63 },
  { id: 'h9', type: 'closure', x: 86, y: 53 },
];

export const DEMO_SEGMENTS: MapSegment[] = [
  { id: 's1', level: 'clear', x: 0, y: 40, width: 62, height: 7 },
  { id: 's2', level: 'moderate', x: 62, y: 40, width: 12, height: 7 },
  { id: 's3', level: 'heavy', x: 74, y: 40, width: 26, height: 7 },
  { id: 's4', level: 'clear', x: 38, y: 0, width: 4, height: 300 },
];

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#E9EDEA',
    overflow: 'hidden',
  },
  water: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '12%',
    backgroundColor: mapFeature.water,
  },
  park: {
    position: 'absolute',
    right: '6%',
    bottom: '14%',
    width: '26%',
    height: '12%',
    borderRadius: 8,
    backgroundColor: mapFeature.greenSpace,
  },
  segment: { position: 'absolute', borderRadius: 3 },
  route: { position: 'absolute', backgroundColor: routeLine.ahead },
  routeCasing: { position: 'absolute', backgroundColor: routeLine.casing },
  routeH: { left: '18%', top: '46%', width: '46%', height: 5 },
  routeV: { left: '62%', top: '24%', width: 5, height: '24%' },
  pin: { position: 'absolute', marginLeft: -14, marginTop: -14 },
  legend: {
    position: 'absolute',
    left: space.md,
    bottom: space.md,
    backgroundColor: neutral.surface,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.xs,
  },
  legendTitle: { ...type.eyebrow, fontSize: 9 },
  legendRow: { flexDirection: 'row', gap: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  legendSwatch: { width: 14, height: 4, borderRadius: 2 },
  legendLabel: { ...type.caption, fontSize: 10, textTransform: 'capitalize' },
});

/** Re-exported so screens can label pins without reaching into the taxonomy. */
export { HAZARDS };
export { brand };
