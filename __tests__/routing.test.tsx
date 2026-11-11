import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import AuthLayout from '../app/(auth)/_layout';
import DriverLayout from '../app/(driver)/_layout';
import PassengerLayout from '../app/(passenger)/_layout';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { useSessionStore, type AppMode } from '../src/store/session.store';

/**
 * Sign-in and sign-out swap which route group is visible. Every group has an
 * index at "/", so a guard that doesn't say where to go lands on "Unmatched
 * Route" — the bug these tests pin down. The real navigator and group layouts
 * are mounted; only the screens are stubs.
 */

const page = (label: string) =>
  function Page() {
    return <Text>{label}</Text>;
  };
const plainStack = () => <Stack screenOptions={{ headerShown: false }} />;

const routes = {
  _layout: RootNavigator,
  '(auth)/_layout': AuthLayout,
  '(auth)/index': page('sign-in'),
  '(passenger)/_layout': PassengerLayout,
  '(passenger)/index': page('passenger-home'),
  '(passenger)/activity': page('activity'),
  '(passenger)/safety': page('safety'),
  '(passenger)/account': page('account'),
  '(passenger)/search': page('search'),
  '(passenger)/quote': page('quote'),
  '(passenger)/trip/[id]/index': page('trip'),
  '(passenger)/trip/[id]/receipt': page('receipt'),
  '(driver)/_layout': DriverLayout,
  '(driver)/index': page('driver-home'),
  '(driver)/earnings': page('earnings'),
  '(driver)/documents': page('documents'),
  '(driver)/account': page('driver-account'),
  '(driver)/trip/[id]': page('driver-trip'),
  '(onboarding)/_layout': plainStack,
  '(onboarding)/index': page('onboarding'),
  '(onboarding)/documents/[slug]': page('document'),
  '(modals)/_layout': plainStack,
  '(modals)/report-hazard': page('report-hazard'),
  '(modals)/share-ride': page('share-ride'),
  '(modals)/evidence/[tripId]': page('evidence'),
};

/** Updates the session the way the sign-in screen does, then lets the redirect run. */
async function sessionChange(change: () => void) {
  await act(async () => change());
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
}

const signInAs = (mode: AppMode, verified = false) =>
  sessionChange(() => {
    const s = useSessionStore.getState();
    s.signIn({ userId: 'u', displayName: 'T', phone: '1' });
    s.setMode(mode);
    s.setDriverVerified(verified);
  });

describe('sign-in routing', () => {
  beforeEach(async () => {
    useSessionStore.getState().signOut();
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByText('sign-in')).toBeTruthy();
  });

  it('lands a passenger on the passenger home', async () => {
    await signInAs('passenger');
    expect(screen.getByText('passenger-home')).toBeTruthy();
  });

  it('lands a verified driver on the driver home', async () => {
    await signInAs('driver', true);
    expect(screen.getByText('driver-home')).toBeTruthy();
  });

  it('sends an unverified driver to onboarding', async () => {
    await signInAs('driver', false);
    expect(screen.getByText('onboarding')).toBeTruthy();
  });

  it('returns to sign-in on sign-out', async () => {
    await signInAs('passenger');
    await sessionChange(() => useSessionStore.getState().signOut());
    expect(screen.getByText('sign-in')).toBeTruthy();
  });
});
