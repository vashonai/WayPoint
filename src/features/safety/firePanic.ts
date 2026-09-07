import { Alert, Linking } from 'react-native';

import type { CountryConfig } from '../country/types';
import { useSafetyStore } from '../../store/safety.store';

export type PanicContext = {
  tripId: string;
  role: 'passenger' | 'driver';
};

/**
 * Emergency escalation — Proposal §2.6.
 *
 * This never routes through TanStack Query, never awaits a render, and never
 * depends on one transport succeeding. It fires three INDEPENDENT paths and
 * resolves on whichever lands first:
 *
 *   1. Fast   — a direct call with an aggressive timeout.
 *   2. Durable— a retry-forever mutation that survives being offline.
 *   3. Guaranteed — the local emergency number, which needs no internet at all.
 *
 * The state is persisted BEFORE any network work, because a crash mid-incident
 * that looks like nothing happened is the worst failure this feature has.
 */
export async function firePanic(ctx: PanicContext, country: CountryConfig): Promise<void> {
  // 1. Persist first. Everything else can fail; this cannot.
  useSafetyStore.getState().firePanic();

  // 2. Fast path. Wired to tRPC in production.
  const fast = withTimeout(sendPanicToServer(ctx), 4000).catch(() => null);

  // 3. Durable path. Queued so it survives a dead zone and a cold start.
  queuePanicEvent(ctx);

  // 4. Guaranteed path. Offered immediately, not as a fallback after failure —
  //    the number is from country config and is never a constant in this file.
  showEmergencyDialCard(country);

  await fast;
}

/** Offers the local emergency number. One tap, no network required. */
export function showEmergencyDialCard(country: CountryConfig): void {
  const { police, label } = country.emergency;

  Alert.alert(
    'Emergency alert sent',
    `Waypoint Safety has been notified. You can also call ${label} directly.`,
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: `Call ${police}`,
        style: 'destructive',
        onPress: () => {
          Linking.openURL(`tel:${police}`).catch(() => {});
        },
      },
    ],
  );
}

/** Placeholder for the tRPC safety mutation. */
async function sendPanicToServer(_ctx: PanicContext): Promise<void> {
  return Promise.resolve();
}

/**
 * Placeholder for the persisted retry queue.
 * Production: a mutation with `retry: Infinity` built on the query cache, so
 * `resumePausedMutations()` drains it when connectivity returns.
 */
function queuePanicEvent(_ctx: PanicContext): void {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}
