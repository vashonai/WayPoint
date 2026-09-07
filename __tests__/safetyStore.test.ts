import { useSafetyStore } from '../src/store/safety.store';
import { canSubmitReport } from '../src/store/report.store';

const reset = () =>
  useSafetyStore.setState({
    panicFiredAt: null,
    panicAcknowledged: false,
    isSharing: false,
    shareDuration: 'this_trip',
    trustedContact: null,
  });

const contact = { id: 'c1', name: 'Mikayla J.', relationship: 'Mother', initials: 'MJ' };

describe('Share My Ride', () => {
  beforeEach(reset);

  it('is off by default', () => {
    // Proposal §2.1 — this feature never activates automatically.
    expect(useSafetyStore.getState().isSharing).toBe(false);
    expect(useSafetyStore.getState().trustedContact).toBeNull();
  });

  it('expires at trip end unless the passenger chose otherwise', () => {
    useSafetyStore.getState().startSharing(contact, 'this_trip');
    useSafetyStore.getState().onTripEnded();
    expect(useSafetyStore.getState().isSharing).toBe(false);
  });

  it('keeps sharing past trip end only when explicitly chosen', () => {
    useSafetyStore.getState().startSharing(contact, 'until_i_stop');
    useSafetyStore.getState().onTripEnded();
    expect(useSafetyStore.getState().isSharing).toBe(true);
  });

  it('revokes access immediately, without waiting on a round trip', () => {
    useSafetyStore.getState().startSharing(contact, 'until_i_stop');
    useSafetyStore.getState().stopSharing();
    expect(useSafetyStore.getState().isSharing).toBe(false);
  });
});

describe('panic state', () => {
  beforeEach(reset);

  it('records the moment it fired so a relaunch lands on the incident screen', () => {
    useSafetyStore.getState().firePanic();
    const { panicFiredAt, panicAcknowledged } = useSafetyStore.getState();
    expect(panicFiredAt).toBeGreaterThan(0);
    expect(panicAcknowledged).toBe(false);
  });
});

describe('hazard report gating', () => {
  it('blocks submission until the vehicle is confirmed stopped', () => {
    // Proposal §2.3 — drivers are never encouraged to report while driving.
    expect(canSubmitReport({ type: 'pothole', vehicleStopped: false })).toBe(false);
    expect(canSubmitReport({ type: null, vehicleStopped: true })).toBe(false);
    expect(canSubmitReport({ type: 'pothole', vehicleStopped: true })).toBe(true);
  });
});
