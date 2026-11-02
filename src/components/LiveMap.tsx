import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type MapMarker,
  type MapStyleElement,
  type Region,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { LngLat } from '../features/tracking';
import { useTrackingStore } from '../store/tracking.store';
import type { HazardType } from '../theme/tokens';
import { brand, elevation, mapFeature, neutral, radius, routeLine, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { HazardIcon } from './HazardIcon';

export type CameraMode = 'follow' | 'overview' | 'free';

export type HazardPin = { id: string; type: HazardType; coord: LngLat };

type Props = {
  route: LngLat[];
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
const LINE_WIDTH = 6;
const PUCK_SIZE = 32;

/**
 * Google Maps on Android always. On iOS only in a development build that has
 * the Google SDK — i.e. a key was configured (see app.config.js). Expo Go on
 * iOS, or no key, falls back to Apple Maps; everything else here works on both.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const iosHasGoogle = Constants.expoConfig?.extra?.iosGoogleMaps === true;
const PROVIDER =
  Platform.OS === 'android' || (iosHasGoogle && !isExpoGo) ? PROVIDER_GOOGLE : undefined;

/** Basemap colours from Brand & Style Guide §2.4. Google provider only. */
const MAP_STYLE: MapStyleElement[] = [
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: mapFeature.water }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: mapFeature.greenSpace }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
];

/**
 * The live trip map: route ahead, route taken, a gliding vehicle, hazards, and
 * Google's live traffic underneath.
 *
 * Location ticks never re-render this component. The car and the camera are
 * driven from store subscriptions through native commands
 * (`animateMarkerToCoordinate`, `animateCamera`); the only thing that
 * re-renders on a fix is <RouteLines>, and the trip sheet never does.
 *
 * The store keeps GeoJSON [lng, lat]; react-native-maps wants
 * { latitude, longitude }. Conversion happens here and nowhere else — a swap
 * puts the car in the Southern Ocean.
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

  const [initialRegion] = useState(() =>
    regionFor([...route, ...(pickup ? [pickup] : []), ...(destination ? [destination] : [])]),
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
      } else if (modeRef.current === 'overview') {
        const ahead = remaining.length > 0 ? remaining : route;
        const coords = [
          ...(position ? [position] : []),
          ...ahead,
          ...(destination ? [destination] : []),
        ];
        map.fitToCoordinates(coords.map(toLatLng), { edgePadding, animated: duration > 0 });
        lastRefitAt.current = Date.now();
      }
    },
    [route, destination, edgePadding],
  );

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
      <MapView
        ref={mapRef}
        provider={PROVIDER}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={MAP_STYLE}
        mapPadding={{ top: 0, right: 0, bottom: bottomInset, left: 0 }}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsTraffic
        showsCompass={false}
        toolbarEnabled={false}
        onMapReady={() => moveCamera(0)}
        // The user moved the map: stop following until they re-centre.
        onPanDrag={() => changeMode('free')}
      >
        <RouteLines route={route} />
        {pickup ? <PlaceMarker coord={pickup} fill={neutral.surface} label="Pickup" /> : null}
        {destination ? (
          <PlaceMarker coord={destination} fill={brand.gold} label="Destination" />
        ) : null}
        <HazardMarkers hazards={hazards} />
        <CarMarker />
      </MapView>

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
  // Before the first fix (or before the trip goes live) show the whole plan.
  const ahead = useMemo(
    () => (remaining.length > 0 ? remaining : route).map(toLatLng),
    [remaining, route],
  );
  const taken = useMemo(() => trail.map(toLatLng), [trail]);

  return (
    <>
      {taken.length > 1 ? (
        <Polyline
          coordinates={taken}
          strokeColor={routeLine.taken}
          strokeWidth={LINE_WIDTH}
          lineCap="round"
          lineJoin="round"
          zIndex={1}
        />
      ) : null}
      <Polyline
        coordinates={ahead}
        strokeColor={routeLine.casing}
        strokeWidth={LINE_WIDTH + 3}
        lineCap="round"
        lineJoin="round"
        zIndex={2}
      />
      <Polyline
        coordinates={ahead}
        strokeColor={routeLine.ahead}
        strokeWidth={LINE_WIDTH}
        lineCap="round"
        lineJoin="round"
        zIndex={3}
      />
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

const HazardMarkers = memo(function HazardMarkers({ hazards }: { hazards: HazardPin[] }) {
  const tracksViewChanges = useSettledSnapshot();
  return (
    <>
      {hazards.map((h) => (
        <Marker
          key={h.id}
          coordinate={toLatLng(h.coord)}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={tracksViewChanges}
          zIndex={5}
        >
          <HazardIcon type={h.type} size={28} />
        </Marker>
      ))}
    </>
  );
});

function PlaceMarker({ coord, fill, label }: { coord: LngLat; fill: string; label: string }) {
  const tracksViewChanges = useSettledSnapshot();
  return (
    <Marker
      coordinate={toLatLng(coord)}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={4}
      accessibilityLabel={label}
    >
      <View style={[styles.place, { backgroundColor: fill }]} />
    </Marker>
  );
}

/**
 * `tracksViewChanges` for a custom-view marker whose look never changes.
 *
 * Left on, Android re-snapshots every marker every frame and the map stutters
 * once there are many hazard pins. Turned off from the start, an SVG child can
 * be snapshotted before it has drawn and the pin comes out blank. So: on for
 * the first moment, then off for good.
 */
function useSettledSnapshot(): boolean {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracking(false), 500);
    return () => clearTimeout(t);
  }, []);
  return tracking;
}

const toLatLng = ([lng, lat]: LngLat): LatLng => ({ latitude: lat, longitude: lng });

/** The real gap between fixes, clamped — the glide should end as the next fix lands. */
function glideFor(at: number | null, prevAt: number | null): number {
  const gap = at && prevAt ? at - prevAt : DEFAULT_GLIDE_MS;
  return Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, gap));
}

/** A region that fits `coords` with some margin. Kingston if there is nothing to fit. */
function regionFor(coords: LngLat[]): Region {
  if (coords.length === 0) {
    return { latitude: 18.0179, longitude: -76.8099, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.005),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.005),
  };
}

/** Fixture hazards along the demo route, standing in for `/hazards?bbox=…`. */
export const DEMO_HAZARD_PINS: HazardPin[] = [
  { id: 'hp1', type: 'pothole', coord: [-76.7942, 18.0113] },
  { id: 'hp2', type: 'construction', coord: [-76.7905, 18.0092] },
  { id: 'hp3', type: 'flooding', coord: [-76.7879, 18.0061] },
  { id: 'hp4', type: 'accident', coord: [-76.7858, 18.009] },
  { id: 'hp5', type: 'enforcement', coord: [-76.7851, 18.0119] },
];

const styles = StyleSheet.create({
  root: { flex: 1 },
  place: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: brand.navy,
  },
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
