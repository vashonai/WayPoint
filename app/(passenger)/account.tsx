import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, VerifiedBadge } from '../../src/components';
import { useCountry, useSetCountry } from '../../src/features/country/CountryProvider';
import { useSessionStore } from '../../src/store/session.store';
import { space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function Account() {
  const country = useCountry();
  const setCountry = useSetCountry();
  const session = useSessionStore((s) => s.session);
  const setMode = useSessionStore((s) => s.setMode);
  const signOut = useSessionStore((s) => s.signOut);

  return (
    <Screen scroll>
      <Text style={type.h1}>Account</Text>

      <Card>
        <Text style={type.h3}>{session?.displayName ?? 'Guest'}</Text>
        <Text style={type.caption}>{session?.phone}</Text>
        <View style={styles.badge}>
          <VerifiedBadge label="Phone verified" />
        </View>
      </Card>

      <Card>
        <Text style={type.eyebrow}>Market</Text>
        <Text style={type.body}>
          {country.name} · {country.currency.code} ({country.currency.symbol})
        </Text>
        <Text style={type.caption}>
          Emergency {country.emergency.police} · {country.driverDocuments.length} driver documents
          required
        </Text>
        <View style={styles.actions}>
          <Button
            label="Switch to Jamaica"
            variant="ghost"
            onPress={() => setCountry('JM')}
            fullWidth={false}
          />
          <Button
            label="Switch to Trinidad &amp; Tobago"
            variant="ghost"
            onPress={() => setCountry('TT')}
            fullWidth={false}
          />
        </View>
        <Text style={type.caption}>
          Switching markets changes currency, emergency numbers, document requirements and hazard
          labels — with no app code involved.
        </Text>
      </Card>

      <Button label="Switch to driver mode" variant="secondary" onPress={() => setMode('driver')} />
      <Button label="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { marginTop: space.sm },
  actions: { gap: space.sm, marginTop: space.md, alignItems: 'flex-start' },
});
