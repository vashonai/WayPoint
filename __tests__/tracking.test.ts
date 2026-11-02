import {
  beginTripTrace,
  bearingDeg,
  createFixFilter,
  createTraceOutbox,
  distanceMeters,
  endTripTrace,
  JUMP_RESET_AFTER,
  lineLengthMeters,
  nearestPointOnLine,
  pendingTracePoints,
  pointAlong,
  recordFixes,
  routeProgress,
  splitLineAt,
  type Fix,
  type LngLat,
} from '../src/features/tracking';
import * as traceOutbox from '../src/features/tracking/traceOutbox';
import { useTrackingStore } from '../src/store/tracking.store';

/** ~111 m per 0.001° of latitude. Near Kingston, 0.001° of longitude is ~106 m. */
const ORIGIN: LngLat = [-76.8, 18.0];
const offset = ([lng, lat]: LngLat, northM: number, eastM: number): LngLat => [
  lng + eastM / (111_320 * Math.cos((lat * Math.PI) / 180)),
  lat + northM / 111_320,
];

/** A 1 km route due east, then 1 km due north. */
const CORNER = offset(ORIGIN, 0, 1000);
const ROUTE: LngLat[] = [ORIGIN, CORNER, offset(CORNER, 1000, 0)];

const fix = (coord: LngLat, t: number, over: Partial<Fix> = {}): Fix => ({
  coord,
  accuracy: 5,
  heading: null,
  speed: null,
  timestamp: t * 1000,
  ...over,
});

describe('geometry', () => {
  it('measures distance and bearing', () => {
    expect(distanceMeters(ORIGIN, offset(ORIGIN, 100, 0))).toBeCloseTo(100, 0);
    expect(lineLengthMeters(ROUTE)).toBeCloseTo(2000, -1);
    expect(bearingDeg(ORIGIN, CORNER)).toBeCloseTo(90, 0);
    expect(bearingDeg(CORNER, ORIGIN)).toBeCloseTo(270, 0);
  });

  it('finds the nearest point on a line, and how far along it is', () => {
    const n = nearestPointOnLine(ROUTE, offset(ORIGIN, 25, 400))!;
    expect(n.segment).toBe(0);
    expect(n.distanceMeters).toBeCloseTo(25, 0);
    expect(n.alongMeters).toBeCloseTo(400, -1);
  });

  it('skips segments behind the vehicle', () => {
    // A point near both legs, closer to the first — but we are past it.
    const p = offset(CORNER, 20, -30);
    expect(nearestPointOnLine(ROUTE, p)!.segment).toBe(0);
    expect(nearestPointOnLine(ROUTE, p, 1)!.segment).toBe(1);
  });

  it('splits a line into taken and remaining at the vehicle', () => {
    const at = nearestPointOnLine(ROUTE, offset(CORNER, 500, 0))!;
    const { taken, remaining } = splitLineAt(ROUTE, at);
    expect(lineLengthMeters(taken)).toBeCloseTo(1500, -1);
    expect(lineLengthMeters(remaining)).toBeCloseTo(500, -1);
    expect(remaining[remaining.length - 1]).toEqual(ROUTE[2]);
  });

  it('walks a given distance along a line', () => {
    const at = pointAlong(ROUTE, 1500)!;
    expect(at.segment).toBe(1);
    expect(at.bearing).toBeCloseTo(0, 0);
    expect(distanceMeters(at.point, offset(CORNER, 500, 0))).toBeLessThan(2);
  });
});

describe('fix filter', () => {
  it('drops fixes less accurate than 30 m, or of unknown accuracy', () => {
    const check = createFixFilter();
    expect(check(fix(ORIGIN, 0, { accuracy: 45 }))).toEqual({ ok: false, reason: 'inaccurate' });
    expect(check(fix(ORIGIN, 0, { accuracy: null }))).toEqual({ ok: false, reason: 'inaccurate' });
    expect(check(fix(ORIGIN, 0, { accuracy: 30 }))).toEqual({ ok: true });
  });

  it('drops fixes that arrive out of order', () => {
    const check = createFixFilter();
    check(fix(ORIGIN, 10));
    expect(check(fix(offset(ORIGIN, 10, 0), 9))).toEqual({ ok: false, reason: 'stale' });
  });

  it('drops impossible jumps, but not fast legitimate driving', () => {
    const check = createFixFilter();
    check(fix(ORIGIN, 0));
    // 300 m in 1 s ≈ 1080 km/h.
    expect(check(fix(offset(ORIGIN, 300, 0), 1))).toEqual({ ok: false, reason: 'impossible_jump' });
    // 30 m in 1 s ≈ 108 km/h.
    expect(check(fix(offset(ORIGIN, 30, 0), 1))).toEqual({ ok: true });
  });

  it('re-anchors when the last accepted fix was itself the outlier', () => {
    const check = createFixFilter();
    check(fix(offset(ORIGIN, 5000, 0), 0)); // a bad fix that got through
    const verdicts = Array.from({ length: JUMP_RESET_AFTER }, (_, i) =>
      check(fix(offset(ORIGIN, i * 10, 0), i + 1)),
    );
    expect(verdicts.slice(0, -1).every((v) => !v.ok)).toBe(true);
    expect(verdicts[verdicts.length - 1]).toEqual({ ok: true });
  });
});

describe('route progress', () => {
  it('snaps a fix within 40 m onto the route', () => {
    const p = routeProgress(ROUTE, offset(ORIGIN, 30, 500));
    expect(p.onRoute).toBe(true);
    expect(distanceMeters(p.display, offset(ORIGIN, 0, 500))).toBeLessThan(1);
    expect(lineLengthMeters(p.remaining!)).toBeCloseTo(1500, -1);
  });

  it('shows the raw point when off route, and keeps the remaining line', () => {
    const raw = offset(ORIGIN, 80, 500);
    const p = routeProgress(ROUTE, raw);
    expect(p.onRoute).toBe(false);
    expect(p.display).toEqual(raw);
    expect(p.offRouteMeters).toBeCloseTo(80, 0);
    expect(p.remaining).toBeNull();
  });
});

describe('trace outbox', () => {
  it('keeps every fix through a dead zone and uploads them in order', async () => {
    const sent: number[] = [];
    let online = false;
    const outbox = createTraceOutbox({
      maxBatch: 2,
      send: async (batch) => {
        if (!online) throw new Error('offline');
        sent.push(...batch.map((f) => f.timestamp));
      },
    });

    await outbox.push(fix(ORIGIN, 1));
    await outbox.push(fix(ORIGIN, 2));
    await outbox.push(fix(ORIGIN, 3));
    expect(sent).toEqual([]);
    expect(outbox.size()).toBe(3);

    online = true;
    await outbox.flush();
    expect(sent).toEqual([1000, 2000, 3000]);
    expect(outbox.size()).toBe(0);
  });
});

describe('tracking store', () => {
  beforeEach(() => useTrackingStore.getState().load(ROUTE));

  it('grows the trail and shrinks the remaining route as the vehicle drives', () => {
    const { ingest } = useTrackingStore.getState();
    ingest(fix(offset(ORIGIN, 5, 0), 0));
    ingest(fix(offset(ORIGIN, -5, 20), 2));
    ingest(fix(offset(ORIGIN, 5, 40), 4));

    const s = useTrackingStore.getState();
    expect(s.trail).toHaveLength(3);
    expect(lineLengthMeters(s.remaining)).toBeCloseTo(1960, -1);
    expect(s.onRoute).toBe(true);
    expect(s.heading).toBeCloseTo(90, 0); // follows the road, not the jitter
  });

  it('counts rejected fixes without moving the vehicle', () => {
    const { ingest } = useTrackingStore.getState();
    ingest(fix(ORIGIN, 0));
    ingest(fix(offset(ORIGIN, 0, 10), 1, { accuracy: 80 }));

    const s = useTrackingStore.getState();
    expect(s.rejected).toBe(1);
    expect(s.trail).toHaveLength(1);
  });

  it('clears the live position when the trip stops', () => {
    useTrackingStore.getState().ingest(fix(ORIGIN, 0));
    useTrackingStore.getState().reset();
    expect(useTrackingStore.getState().position).toBeNull();
    expect(useTrackingStore.getState().trail).toEqual([]);
  });
});

describe('trip trace', () => {
  afterEach(() => jest.restoreAllMocks());

  it('records only for an active trip, and only good fixes', async () => {
    const upload = jest.spyOn(traceOutbox, 'uploadTraceBatch').mockResolvedValue();

    await recordFixes([fix(ORIGIN, 0)]);
    expect(upload).not.toHaveBeenCalled();

    beginTripTrace('trip_a');
    await recordFixes([fix(ORIGIN, 1), fix(ORIGIN, 2, { accuracy: 90 })]);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith('trip_a', [expect.objectContaining({ timestamp: 1000 })]);
    await endTripTrace();
  });

  it('keeps an offline trip’s points under that trip after the next one starts', async () => {
    let online = false;
    const upload = jest.spyOn(traceOutbox, 'uploadTraceBatch').mockImplementation(async () => {
      if (!online) throw new Error('offline');
    });

    beginTripTrace('trip_a');
    await recordFixes([fix(ORIGIN, 10)]);
    await endTripTrace();
    expect(pendingTracePoints()).toBe(1);

    beginTripTrace('trip_b');
    online = true;
    await recordFixes([fix(ORIGIN, 20)]);

    const sent = upload.mock.calls.slice(-2);
    expect(sent).toEqual([
      ['trip_a', [expect.objectContaining({ timestamp: 10_000 })]],
      ['trip_b', [expect.objectContaining({ timestamp: 20_000 })]],
    ]);
    expect(pendingTracePoints()).toBe(0);
    await endTripTrace();
  });
});
