import { router } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Card, PanicButton, Screen } from '../../src/components';
import { useCountry } from '../../src/features/country/CountryProvider';
import { firePanic } from '../../src/features/safety/firePanic';
import { useSafetyStore } from '../../src/store/safety.store';
import { brand, neutral, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function PassengerSafety() {
  const country = useCountry();
  const isSharing = useSafetyStore((s) => s.isSharing);
  const stopSharing = useSafetyStore((s) => s.stopSharing);

  return (
    <Screen scroll>
      <Text style={type.h1}>Safety</Text>

      <Card>
        <Text style={type.eyebrow}>Share My Ride</Text>
        <View style={styles.row}>
          <View style={styles.rowBody}>
            <Text style={type.bodyMedium}>Share this trip</Text>
            <Text style={type.caption}>
              Off by default. Nobody can see your trip unless you turn this on.
            </Text>
          </View>
          <Switch
            value={isSharing}
            onValueChange={(v) => (v ? router.push('/(modals)/share-ride') : stopSharing())}
            trackColor={{ false: neutral.line, true: brand.green }}
            accessibilityLabel="Share this trip"
          />
        </View>
      </Card>

      <Card>
        <Text style={type.eyebrow}>What we verify</Text>
        {[
          'Government-issued identity for every driver',
          'Valid licence and transport authorisation',
          'Police record, required in Jamaica',
          'Vehicle registration, insurance and photographs',
          'Ongoing trip-behaviour monitoring',
        ].map((line) => (
          <Text key={line} style={styles.bullet}>
            · {line}
          </Text>
        ))}
      </Card>

      <PanicButton
        onFire={() => firePanic({ tripId: '', role: 'passenger' }, country)}
        emergencyLabel={country.emergency.label}
      />
      <Text style={type.caption}>
        Alerts Waypoint Safety and offers a direct call to {country.emergency.label} on{' '}
        {country.emergency.police}.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  rowBody: { flex: 1, gap: 2 },
  bullet: { ...type.body, color: neutral.inkSoft, marginTop: space.xs },
});
