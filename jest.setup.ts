/**
 * The boring part that makes everything else possible.
 *
 * The map is mocked out entirely — you do not unit-test a map. What these
 * tests protect is money, trust and offline behaviour, all of which runs
 * fast in Node.
 */

jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6, Balanced: 3 },
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 18.0179, longitude: -76.8099, accuracy: 5 },
    timestamp: Date.now(),
  })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => {}),
  hideAsync: jest.fn(async () => {}),
}));
