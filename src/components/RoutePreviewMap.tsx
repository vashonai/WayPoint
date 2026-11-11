import { useCallback, useEffect, useRef, useState } from 'react';
import type MapView from 'react-native-maps';

import type { LngLat } from '../features/tracking';
import { MapSurface, PlaceMarker, regionFor, RouteLine, toLatLng } from './MapSurface';

const EDGE = 36;

/**
 * A still picture of the trip before it is booked: pickup, destination and
 * the route between them, over live traffic. Not interactive — it sits inside
 * a scrolling screen, and a map that steals the scroll gesture is a trap.
 */
export function RoutePreviewMap({
  route,
  pickup,
  destination,
}: {
  /** Null while the route is loading; the two ends still show. */
  route: LngLat[] | null;
  pickup: LngLat;
  destination: LngLat;
}) {
  const mapRef = useRef<MapView>(null);
  const [initialRegion] = useState(() => regionFor([pickup, destination]));

  const fit = useCallback(() => {
    mapRef.current?.fitToCoordinates([pickup, destination, ...(route ?? [])].map(toLatLng), {
      edgePadding: { top: EDGE, right: EDGE, bottom: EDGE, left: EDGE },
      animated: true,
    });
  }, [route, pickup, destination]);

  useEffect(() => fit(), [fit]);

  return (
    <MapSurface
      ref={mapRef}
      initialRegion={initialRegion}
      onMapReady={fit}
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      accessibilityLabel="Route preview"
    >
      {route ? <RouteLine coords={route} /> : null}
      <PlaceMarker coord={pickup} kind="pickup" />
      <PlaceMarker coord={destination} kind="destination" />
    </MapSurface>
  );
}
