import { Stack, type Href } from 'expo-router';

import { useSessionStore } from '../store/session.store';
import { neutral } from '../theme/tokens';

/**
 * Role-gated route groups.
 *
 * `mode` is a MODE, not an account type — drivers take rides too, and the
 * Phase 3 dispute view needs both sides of a trip in one record.
 *
 * Every guard redirects to `home`: the root of the one group this session can
 * see. It must be explicit. Signing in hides the screen you are on, and the
 * router's own fallback is a bare "/" — which all four groups claim with their
 * own index, so it resolves to none of them and shows "Unmatched Route".
 */
export function RootNavigator() {
  const session = useSessionStore((s) => s.session);
  const mode = useSessionStore((s) => s.mode);
  const isDriverVerified = useSessionStore((s) => s.isDriverVerified);

  const signedIn = !!session;
  const isDriver = mode === 'driver';
  const home: Href = !signedIn
    ? '/(auth)'
    : !isDriver
      ? '/(passenger)'
      : isDriverVerified
        ? '/(driver)'
        : '/(onboarding)';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: neutral.paper },
      }}
    >
      <Stack.Protected guard={!signedIn} redirectTo={home}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && isDriver && !isDriverVerified} redirectTo={home}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !isDriver} redirectTo={home}>
        <Stack.Screen name="(passenger)" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && isDriver && isDriverVerified} redirectTo={home}>
        <Stack.Screen name="(driver)" />
      </Stack.Protected>

      <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
