import {
  HAZARDS,
  HAZARD_PICKER_ORDER,
  isExpired,
  isRoutable,
} from '../src/features/hazards/taxonomy';

describe('hazard taxonomy', () => {
  /**
   * The regulatory guarantee, as a test.
   *
   * Proposal §2.2 frames traffic-enforcement reports strictly as road
   * awareness, "never as a tool to evade law enforcement". If this test ever
   * fails, Waypoint's position with Caribbean regulators is broken — this is
   * not a refactor to work around.
   */
  it('never lets enforcement reports influence routing', () => {
    expect(HAZARDS.enforcement.routingWeight).toBe(0);
    expect(isRoutable('enforcement')).toBe(false);
  });

  it('routes on every other hazard type', () => {
    const routable = Object.keys(HAZARDS).filter((t) => isRoutable(t as never));
    expect(routable).toHaveLength(Object.keys(HAZARDS).length - 1);
    expect(routable).not.toContain('enforcement');
  });

  it('weights closures and flooding above advisory reports', () => {
    expect(HAZARDS.closure.routingWeight).toBeGreaterThan(HAZARDS.pothole.routingWeight);
    expect(HAZARDS.flooding.routingWeight).toBeGreaterThan(HAZARDS.construction.routingWeight);
  });

  it('expires a broken-down vehicle report within the hour', () => {
    const reportedAt = Date.now() - 46 * 60_000;
    expect(isExpired('brokenDown', reportedAt)).toBe(true);
    expect(isExpired('brokenDown', Date.now() - 10 * 60_000)).toBe(false);
  });

  it('never expires reports that stand until cleared', () => {
    const longAgo = Date.now() - 1000 * 60 * 60 * 24 * 365;
    expect(isExpired('closure', longAgo)).toBe(false);
    expect(isExpired('fallenTree', longAgo)).toBe(false);
  });

  it('offers every hazard type in the report picker', () => {
    expect(new Set(HAZARD_PICKER_ORDER).size).toBe(HAZARD_PICKER_ORDER.length);
    expect(HAZARD_PICKER_ORDER).toHaveLength(9);
  });
});
