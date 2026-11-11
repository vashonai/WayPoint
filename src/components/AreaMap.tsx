import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import type MapView from 'react-native-maps';

import { useCountry } from '../features/country';
import { HazardMarkers, MapSurface, regionFor, type HazardPin } from './MapSurface';

const AREA_ZOOM = 15;
/** Apple Maps zooms by altitude. Roughly zoom 15. */
const AREA_ALTITUDE_M = 2500;

/**
 * The map behind a home screen: the market's city until there is a fix, then
 * the person's own area, with live traffic and reported hazards.
 *
 * Memoised and mounted once per screen. `showsUserLocation` should only be
 * true once location permission is already granted — on iOS, setting it
 * before then makes the map ask for permission itself, out of context.
 */
export const AreaMap = memo(function AreaMap({
  hazards = [],
  bottomInset = 0,
  showsUserLocation = false,
}: {
  hazards?: HazardPin[];
  bottomInset?: number;
  showsUserLocation?: boolean;
}) {
  const country = useCountry();
  const mapRef = useRef<MapView>(null);
  const [initialRegion] = useState(() => regionFor([], country.map.center));

  // Centre on the person once, as soon as we're allowed to know where they are.
  useEffect(() => {
    if (!showsUserLocation) return;
    let cancelled = false;
    (async () => {
      const loc =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      if (cancelled || !loc) return;
      mapRef.current?.animateCamera(
        {
          center: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          zoom: AREA_ZOOM,
          altitude: AREA_ALTITUDE_M,
        },
        { duration: 600 },
      );
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showsUserLocation]);

  return (
    <View style={styles.root}>
      <MapSurface
        ref={mapRef}
        initialRegion={initialRegion}
        mapPadding={{ top: 0, right: 0, bottom: bottomInset, left: 0 }}
        showsUserLocation={showsUserLocation}
      >
        <HazardMarkers hazards={hazards} />
      </MapSurface>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
});
