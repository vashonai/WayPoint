import { memo, useEffect, useMemo, useState, type Ref } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type MapStyleElement,
  type MapViewProps,
  type Region,
} from 'react-native-maps';

import type { LngLat } from '../features/tracking';
import type { HazardType } from '../theme/tokens';
import { brand, mapFeature, neutral, radius, routeLine } from '../theme/tokens';
import { HazardIcon } from './HazardIcon';

export type HazardPin = { id: string; type: HazardType; coord: LngLat };

export const ROUTE_LINE_WIDTH = 6;

/**
 * Google Maps on Android always. On iOS only in a development build that has
 * the Google SDK — i.e. a key was configured (see app.config.js). Expo Go on
 * iOS, or no key, falls back to Apple Maps; everything else works on both.
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
 * Every map in the app: the provider choice, the brand basemap, Google's live
 * traffic layer, and no stock chrome. Any prop can be overridden.
 *
 * Layer order, bottom to top — the route sits ABOVE traffic by design (§3.1),
 * so it is never mistaken for the road colour underneath:
 *   basemap · traffic · route taken · route ahead (cased) · places · hazards · vehicle
 */
export function MapSurface({
  ref,
  style,
  ...rest
}: Omit<MapViewProps, 'provider'> & { ref?: Ref<MapView> }) {
  return (
    <MapView
      ref={ref}
      provider={PROVIDER}
      style={[StyleSheet.absoluteFill, style]}
      customMapStyle={MAP_STYLE}
      showsTraffic
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      {...rest}
    />
  );
}

/** The recommended route: solid blue on a darker casing that stays legible over red traffic. */
export function RouteLine({ coords }: { coords: LngLat[] }) {
  const latLngs = useMemo(() => coords.map(toLatLng), [coords]);
  if (latLngs.length < 2) return null;
  return (
    <>
      <Polyline
        coordinates={latLngs}
        strokeColor={routeLine.casing}
        strokeWidth={ROUTE_LINE_WIDTH + 3}
        lineCap="round"
        lineJoin="round"
        zIndex={2}
      />
      <Polyline
        coordinates={latLngs}
        strokeColor={routeLine.ahead}
        strokeWidth={ROUTE_LINE_WIDTH}
        lineCap="round"
        lineJoin="round"
        zIndex={3}
      />
    </>
  );
}

export const HazardMarkers = memo(function HazardMarkers({ hazards }: { hazards: HazardPin[] }) {
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

/** Pickup (white) or destination (gold — Brand Guide: destination markers). */
export function PlaceMarker({ coord, kind }: { coord: LngLat; kind: 'pickup' | 'destination' }) {
  const tracksViewChanges = useSettledSnapshot();
  return (
    <Marker
      coordinate={toLatLng(coord)}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={4}
      accessibilityLabel={kind === 'pickup' ? 'Pickup' : 'Destination'}
    >
      <View style={[styles.place, kind === 'destination' && styles.destination]} />
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
export function useSettledSnapshot(): boolean {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracking(false), 500);
    return () => clearTimeout(t);
  }, []);
  return tracking;
}

/**
 * The app keeps GeoJSON [lng, lat]; react-native-maps wants
 * { latitude, longitude }. Convert here and nowhere else — a swap puts the
 * car in the Southern Ocean.
 */
export const toLatLng = ([lng, lat]: LngLat): LatLng => ({ latitude: lat, longitude: lng });

/** A region that fits `coords` with some margin, or a city-sized view of `fallback`. */
export function regionFor(coords: LngLat[], fallback?: LngLat): Region {
  const points = coords.length > 0 ? coords : fallback ? [fallback] : [];
  if (points.length === 0) {
    return { latitude: 0, longitude: 0, latitudeDelta: 90, longitudeDelta: 180 };
  }
  const lngs = points.map((c) => c[0]);
  const lats = points.map((c) => c[1]);
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, coords.length > 0 ? 0.005 : 0.06),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, coords.length > 0 ? 0.005 : 0.06),
  };
}

const styles = StyleSheet.create({
  place: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: brand.navy,
    backgroundColor: neutral.surface,
  },
  destination: { backgroundColor: brand.gold },
});
