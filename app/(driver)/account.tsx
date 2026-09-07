import { Text } from 'react-native';

import { Button, Card, Screen, VerifiedBadge } from '../../src/components';
import { useCountry } from '../../src/features/country/CountryProvider';
import { useSessionStore } from '../../src/store/session.store';
import { type } from '../../src/theme/typography';

export default function DriverAccount() {
  const country = useCountry();
  const session = useSessionStore((s) => s.session);
  const setMode = useSessionStore((s) => s.setMode);
  const signOut = useSessionStore((s) => s.signOut);

  return (
    <Screen scroll>
      <Text style={type.h1}>Account</Text>

      <Card>
        <Text style={type.h3}>{session?.displayName ?? 'Driver'}</Text>
        <Text style={type.caption}>
          {session?.phone} in {country.name}
        </Text>
        <VerifiedBadge label="Verified driver" />
      </Card>

      <Button
        label="Switch to passenger mode"
        variant="secondary"
        onPress={() => setMode('passenger')}
      />
      <Button label="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
