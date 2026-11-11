import {
  autocompletePlaces,
  computeDrivingRoute,
  decodePolyline,
  fetchPlace,
  MapsApiError,
} from '../src/features/maps';
import { JM, TT } from '../src/features/country/configs';

const mockExtra = {
  googleMaps: { iosKey: 'test-ios-key', androidKey: 'test-android-key', androidCertSha1: null },
};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return {
        ios: { bundleIdentifier: 'com.waypoint.app' },
        android: { package: 'com.waypoint.app' },
        extra: mockExtra,
      };
    },
  },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });

const lastRequest = () => {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
  return { url: url as string, init, body: init.body ? JSON.parse(init.body) : undefined };
};

beforeEach(() => {
  fetchMock.mockReset();
  mockExtra.googleMaps.iosKey = 'test-ios-key';
});

describe('polyline decoding', () => {
  it('decodes Google’s reference example into [lng, lat]', () => {
    // From Google's Encoded Polyline Algorithm Format documentation.
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });

  it('returns nothing for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});

describe('driving route', () => {
  it('asks for a traffic-aware route and parses it', async () => {
    respond(200, {
      routes: [
        {
          distanceMeters: 1725,
          duration: '367s',
          staticDuration: '290s',
          polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC' },
        },
      ],
    });

    const route = await computeDrivingRoute([-76.7967, 18.0124], [-76.7849, 18.0126]);

    const { url, init, body } = lastRequest();
    expect(url).toContain('routes.googleapis.com');
    expect(body.routingPreference).toBe('TRAFFIC_AWARE');
    // lat/lng swapped at the boundary, not inside the app.
    expect(body.origin.location.latLng).toEqual({ latitude: 18.0124, longitude: -76.7967 });
    expect(init.headers['X-Goog-FieldMask']).toContain('routes.polyline.encodedPolyline');

    expect(route).toEqual({
      coords: [
        [-120.2, 38.5],
        [-120.95, 40.7],
      ],
      distanceMeters: 1725,
      durationSeconds: 367,
      staticDurationSeconds: 290,
    });
  });

  it('sends the app identity a restricted key needs', async () => {
    respond(200, { routes: [{ polyline: { encodedPolyline: '_p~iF~ps|U' } }] });
    await computeDrivingRoute([0, 1], [1, 1]);
    const { init } = lastRequest();
    expect(init.headers['X-Goog-Api-Key']).toBe('test-ios-key');
    expect(init.headers['X-Ios-Bundle-Identifier']).toBe('com.waypoint.app');
  });

  it('says so when Google finds no route, rather than drawing nothing', async () => {
    respond(200, {});
    await expect(computeDrivingRoute([0, 1], [1, 1])).rejects.toMatchObject({ reason: 'NO_ROUTE' });
  });

  it('surfaces Google’s error status', async () => {
    respond(403, { error: { message: 'API key not valid', status: 'PERMISSION_DENIED' } });
    const err = await computeDrivingRoute([0, 1], [1, 1]).catch((e) => e);
    expect(err).toBeInstanceOf(MapsApiError);
    expect(err).toMatchObject({ status: 403, reason: 'PERMISSION_DENIED' });
  });

  it('never calls Google without a key', async () => {
    mockExtra.googleMaps.iosKey = null as unknown as string;
    await expect(computeDrivingRoute([0, 1], [1, 1])).rejects.toMatchObject({ reason: 'NO_KEY' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('place search', () => {
  it('restricts suggestions to the active market', async () => {
    respond(200, { suggestions: [] });
    await autocompletePlaces({ input: 'Devon', sessionToken: 's1', country: JM });
    expect(lastRequest().body.includedRegionCodes).toEqual(['jm']);

    respond(200, { suggestions: [] });
    await autocompletePlaces({ input: 'Queen’s Park', sessionToken: 's1', country: TT });
    const { body } = lastRequest();
    expect(body.includedRegionCodes).toEqual(['tt']);
    expect(body.locationBias.circle.center).toEqual({ latitude: 10.6549, longitude: -61.519 });
  });

  it('maps predictions to suggestions', async () => {
    respond(200, {
      suggestions: [
        {
          placePrediction: {
            placeId: 'p1',
            structuredFormat: {
              mainText: { text: 'Devon House' },
              secondaryText: { text: 'Hope Road, Kingston' },
            },
            distanceMeters: 2100,
          },
        },
        { queryPrediction: { text: { text: 'devon house food' } } },
      ],
    });
    const out = await autocompletePlaces({
      input: 'Devon',
      sessionToken: 's1',
      country: JM,
      origin: [-76.79, 18.01],
    });
    expect(out).toEqual([
      {
        placeId: 'p1',
        primary: 'Devon House',
        secondary: 'Hope Road, Kingston',
        distanceMeters: 2100,
      },
    ]);
    expect(lastRequest().body.origin).toEqual({ latitude: 18.01, longitude: -76.79 });
  });

  it('resolves a place, and refuses one without a location', async () => {
    respond(200, {
      id: 'p1',
      displayName: { text: 'Devon House' },
      formattedAddress: '26 Hope Rd, Kingston',
      location: { latitude: 18.0128, longitude: -76.7861 },
    });
    await expect(fetchPlace('p1', 's1')).resolves.toEqual({
      id: 'p1',
      name: 'Devon House',
      address: '26 Hope Rd, Kingston',
      coord: [-76.7861, 18.0128],
    });
    expect(lastRequest().url).toContain('sessionToken=s1');

    respond(200, { id: 'p2', displayName: { text: 'Nowhere' } });
    await expect(fetchPlace('p2', 's1')).rejects.toMatchObject({ reason: 'NO_LOCATION' });
  });
});
