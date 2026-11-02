import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { brand } from '../../theme/tokens';
import { fromLocationObject } from './sources';
import { recordFixes } from './tripTrace';

export const TRIP_LOCATION_TASK = 'waypoint-trip-location';

/**
 * Expo Go cannot run background location: TaskManager is missing on Android
 * and background execution is unsupported on iOS. Needs a development build.
 */
export const backgroundTrackingSupported =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/**
 * The background half of trip tracking.
 *
 * This runs outside React — sometimes with no UI at all, when the OS relaunches
 * the app just to hand over a batch of locations. It cannot touch component
 * state and a socket is not reliable here, so it does one job: the evidence
 * path (filter, queue, upload over HTTP).
 *
 * It MUST be defined at module scope in a file the entry point imports — see
 * index.js. Defined inside a component, background delivery silently stops
 * after the app restarts.
 */
if (backgroundTrackingSupported) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    TRIP_LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data) return;
      await recordFixes(data.locations.map(fromLocationObject));
    },
  );
}

export type LocationAccess = 'background' | 'foreground' | 'denied';

/**
 * Asks for location the way iOS and Android reviewers expect: "While Using"
 * first, then "Always" — and only when the driver goes online, never at launch.
 *
 * `explainBackground` runs between the two prompts and resolves false if the
 * driver declines. On Android 11+ the second request jumps to system Settings,
 * so the driver needs to know why before it happens.
 */
export async function requestTripLocationAccess(
  explainBackground: () => Promise<boolean>,
): Promise<LocationAccess> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';
  if (!backgroundTrackingSupported) return 'foreground';

  const existing = await Location.getBackgroundPermissionsAsync();
  if (existing.status === 'granted') return 'background';
  if (!(await explainBackground())) return 'foreground';

  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'background' : 'foreground';
}

/** Starts background updates for a trip. Resolves false when unavailable. */
export async function startBackgroundTracking(): Promise<boolean> {
  if (!backgroundTrackingSupported) return false;
  const { status } = await Location.getBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  if (!(await Location.hasStartedLocationUpdatesAsync(TRIP_LOCATION_TASK))) {
    await Location.startLocationUpdatesAsync(TRIP_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 2000,
      distanceInterval: 5,
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Waypoint trip in progress',
        notificationBody: 'Your location is shared with your passenger until the trip ends.',
        notificationColor: brand.navy,
      },
    });
  }
  return true;
}

export async function stopBackgroundTracking(): Promise<void> {
  if (!backgroundTrackingSupported) return;
  if (await Location.hasStartedLocationUpdatesAsync(TRIP_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(TRIP_LOCATION_TASK);
  }
}
