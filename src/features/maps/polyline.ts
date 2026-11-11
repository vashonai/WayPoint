import type { LngLat } from '../tracking';

/**
 * Decodes Google's Encoded Polyline Algorithm Format into [lng, lat] pairs.
 *
 * Google encodes lat before lng; the output is GeoJSON order to match the rest
 * of the app. `precision` is 5 for Routes API polylines.
 */
export function decodePolyline(encoded: string, precision = 5): LngLat[] {
  const factor = 10 ** precision;
  const coords: LngLat[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20); // past the end, charCodeAt is NaN and the loop stops
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += next();
    lng += next();
    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}
