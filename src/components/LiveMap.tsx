import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type MapView from 'react-native-maps';
import { Marker, Polyline, type MapMarker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { LngLat } from '../features/tracking';
import { useTrackingStore } from '../store/tracking.store';
import { brand, elevation, neutral, radius, routeLine, space } from '../theme/tokens';
import { type } from '../theme/typography';
import {
  HazardMarkers,
  MapSurface,
  PlaceMarker,
  regionFor,
  ROUTE_LINE_WIDTH,
  RouteLine,
  toLatLng,
  useSettledSnapshot,
  type HazardPin,
} from './MapSurface';

export type CameraMode = 'follow' | 'overview' | 'free';

type Props = {
  /** The planned route. Null while it is still being fetched. */
  route: LngLat[] | null;
  pickup?: LngLat;
  destination?: LngLat;
  /** Driver: follow (heading-up, zoomed in). Passenger: overview (fit the whole trip). */
  defaultCamera: Exclude<CameraMode, 'free'>;
  /** Height covered by the trip sheet. The map frames everything above it. */
  bottomInset?: number;
  hazards?: HazardPin[];
  /** The OS blue dot for the person holding the phone. */
  showsUserLocation?: boolean;
};

const FOLLOW_ZOOM = 17;
/** Apple Maps zooms by camera altitude, not zoom level. Roughly zoom 17. */
const FOLLOW_ALTITUDE_M = 600;
const FOLLOW_PITCH = 45;
const MIN_GLIDE_MS = 300;
const MAX_GLIDE_MS = 2000;
const DEFAULT_GLIDE_MS = 1000;
/** Overview re-fits this often rather than on every fix, so the zoom doesn't twitch. */
const OVERVIEW_REFIT_MS = 5000;
const PUCK_SIZE = 32;
const NO_ROUTE: LngLat[] = [];

/**
 * The live trip map: route ahead, route taken, a gliding vehicle, hazards, and
 * Google's live traffic underneath.
 *
 * Location ticks never re-render this component. The car and the camera are
 * driven from store subscriptions through native commands
 * (`animateMarkerToCoordinate`, `animateCamera`); the only thing that
 * re-renders on a fix is <RouteLines>, and the trip sheet never does.
 */
export function LiveMap({
  route,
  pickup,
  destination,
  defaultCamera,
  bottomInset = 0,
  hazards = [],
  showsUserLocation = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [mode, setMode] = useState<CameraMode>(defaultCamera);
  const modeRef = useRef<CameraMode>(defaultCamera);
  const lastRefitAt = useRef(0);
  const plan = route ?? NO_ROUTE;

  const [initialRegion] = useState(() =>
    regionFor([...plan, ...(pickup ? [pickup] : []), ...(destination ? [destination] : [])]),
  );

  const edgePadding = useMemo(
    () => ({ top: insets.top + 80, right: 60, bottom: 40, left: 60 }),
    [insets.top],
  );

  /** Points the camera at the store's current state for the active mode. */
  const moveCamera = useCallback(
    (duration: number) => {
      const map = mapRef.current;
      if (!map) return;
      const { position, heading, remaining } = useTrackingStore.getState();

      if (modeRef.current === 'follow' && position) {
        map.animateCamera(
          {
            center: toLatLng(position),
            heading,
            pitch: FOLLOW_PITCH,
            zoom: FOLLOW_ZOOM,
            altitude: FOLLOW_ALTITUDE_M,
          },
          { duration },
        );
      } else if (modeRef.current === 'overview' || !position) {
        const ahead = remaining.length > 0 ? remaining : plan;
        const coords = [
          ...(position ? [position] : pickup ? [pickup] : []),
          ...ahead,
          ...(destination ? [destination] : []),
        ];
        if (coords.length === 0) return;
        map.fitToCoordinates(coords.map(toLatLng), { edgePadding, animated: duration > 0 });
        lastRefitAt.current = Date.now();
      }
    },
    [plan, pickup, destination, edgePadding],
  );

  // A new plan (Google's route replacing the placeholder view): frame it.
  useEffect(() => {
    if (modeRef.current !== 'free') moveCamera(600);
  }, [moveCamera]);

  useEffect(
    () =>
      useTrackingStore.subscribe((s, prev) => {
        if (!s.position || s.position === prev.position) return;
        if (modeRef.current === 'follow') {
          moveCamera(glideFor(s.lastFixAt, prev.lastFixAt));
        } else if (
          modeRef.current === 'overview' &&
          Date.now() - lastRefitAt.current > OVERVIEW_REFIT_MS
        ) {
          moveCamera(DEFAULT_GLIDE_MS);
        }
      }),
    [moveCamera],
  );

  const changeMode = useCallback(
    (next: CameraMode) => {
      if (modeRef.current === next) return;
      modeRef.current = next;
      setMode(next);
      if (next !== 'free') moveCamera(800);
    },
    [moveCamera],
  );

  return (
    <View style={styles.root}>
      <MapSurface
        ref={mapRef}
        initialRegion={initialRegion}
        mapPadding={{ top: 0, right: 0, bottom: bottomInset, left: 0 }}
        showsUserLocation={showsUserLocation}
        onMapReady={() => moveCamera(0)}
        // The user moved the map: stop following until they re-centre.
        onPanDrag={() => changeMode('free')}
      >
        <RouteLines route={plan} />
        {pickup ? <PlaceMarker coord={pickup} kind="pickup" /> : null}
        {destination ? <PlaceMarker coord={destination} kind="destination" /> : null}
        <HazardMarkers hazards={hazards} />
        <CarMarker />
      </MapSurface>

      {mode === 'free' ? (
        <Pressable
          style={[styles.recentre, { top: insets.top + space.md }]}
          onPress={() => changeMode(defaultCamera)}
          accessibilityRole="button"
          accessibilityLabel="Re-centre map"
        >
          <Ionicons name="locate" size={18} color={brand.navy} />
          <Text style={styles.recentreText}>Re-centre</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Route taken (grey, below) and route ahead (blue, cased, above). */
const RouteLines = memo(function RouteLines({ route }: { route: LngLat[] }) {
  const trail = useTrackingStore((s) => s.trail);
  const remaining = useTrackingStore((s) => s.remaining);
  const taken = useMemo(() => trail.map(toLatLng), [trail]);

  return (
    <>
      {taken.length > 1 ? (
        <Polyline
          coordinates={taken}
          strokeColor={routeLine.taken}
          strokeWidth={ROUTE_LINE_WIDTH}
          lineCap="round"
          lineJoin="round"
          zIndex={1}
        />
      ) : null}
      {/* Before the first fix (or before the trip goes live) show the whole plan. */}
      <RouteLine coords={remaining.length > 0 ? remaining : route} />
    </>
  );
});

/**
 * The vehicle. Mounted on the first good fix, then moved only by the native
 * glide — its `coordinate` prop never changes after mount, so a re-render for
 * a new heading can't snap it back to where it started.
 */
function CarMarker() {
  const hasPosition = useTrackingStore((s) => s.position !== null);
  return hasPosition ? <MovingCar /> : null;
}

function MovingCar() {
  const ref = useRef<MapMarker>(null);
  const [start] = useState(() => toLatLng(useTrackingStore.getState().position!));
  const heading = useTrackingStore((s) => s.heading);
  const tracksViewChanges = useSettledSnapshot();

  useEffect(
    () =>
      useTrackingStore.subscribe((s, prev) => {
        if (!s.position || s.position === prev.position) return;
        // Glide over the real gap between fixes, so the car is always moving
        // and arrives just as the next fix does.
        ref.current?.animateMarkerToCoordinate(
          toLatLng(s.position),
          glideFor(s.lastFixAt, prev.lastFixAt),
        );
      }),
    [],
  );

  return (
    <Marker
      ref={ref}
      coordinate={start}
      rotation={heading}
      flat
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={10}
      accessibilityLabel="Vehicle"
    >
      <Svg width={PUCK_SIZE} height={PUCK_SIZE} viewBox="0 0 32 32">
        <Circle
          cx={16}
          cy={16}
          r={14}
          fill={routeLine.ahead}
          stroke={neutral.surface}
          strokeWidth={3}
        />
        <Path d="M16 7 L22.5 22 L16 18.5 L9.5 22 Z" fill={neutral.surface} />
      </Svg>
    </Marker>
  );
}

/** The real gap between fixes, clamped — the glide should end as the next fix lands. */
function glideFor(at: number | null, prevAt: number | null): number {
  const gap = at && prevAt ? at - prevAt : DEFAULT_GLIDE_MS;
  return Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, gap));
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  recentre: {
    position: 'absolute',
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: neutral.surface,
    ...elevation.card,
  },
  recentreText: { ...type.caption, color: brand.navy, fontWeight: '600' },
});
