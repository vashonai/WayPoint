/**
 * [lng, lat] — GeoJSON order, matching the app's `LngLat`. Defined here
 * rather than imported because the app's tracking module pulls in
 * expo-location; the shape is identical.
 */
export type LngLat = [lng: number, lat: number];
