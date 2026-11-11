/**
 * The maps feature's public surface: Google Maps Platform web services.
 *
 * Routes (driving route + traffic ETA) and Places (search, details, nearest
 * place). The native map itself is react-native-maps — see components/MapSurface.
 */
export { MapsApiError, mapsApiKey } from './client';
export { decodePolyline } from './polyline';
export { computeDrivingRoute, type DrivingRoute } from './routes';
export {
  autocompletePlaces,
  fetchPlace,
  nearestPlace,
  newSessionToken,
  type Place,
  type PlaceSuggestion,
} from './places';
export { locatePickup, useDrivingRoute, usePlaceSuggestions, useTripRoute } from './hooks';
