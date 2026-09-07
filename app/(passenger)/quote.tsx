import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, DEMO_HAZARDS, DEMO_SEGMENTS, MapCanvas, Screen } from '../../src/components';
import { useCountry } from '../../src/features/country/CountryProvider';
import { presentQuote } from '../../src/features/fare/presentFare';
import { DEMO_QUOTE, DEMO_TRIP_ID } from '../../src/mocks/fixtures';
import { useTripStore } from '../../src/store/trip.store';
import { brand, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

/**
 * The pre-booking estimate — Proposal §2.4.
 *
 * A RANGE, never a single number, and always with the plain-language caveat
 * that the final fare can move. The estimate itself is server-quoted; this
 * screen only formats it.
 */
export default function QuoteScreen() {
  const country = useCountry();
  const send = useTripStore((s) => s.send);
  const setActiveTrip = useTripStore((s) => s.setActiveTrip);

  const confirm = () => {
    send({ type: 'REQUEST_QUOTE' });
    send({ type: 'CONFIRM_RIDE' });
    setActiveTrip(DEMO_TRIP_ID);
    router.push(`/(passenger)/trip/${DEMO_TRIP_ID}`);
  };

  return (
    <Screen scroll>
      <Text style={type.h1}>Confirm your ride</Text>

      <View style={styles.mapFrame}>
        <MapCanvas hazards={DEMO_HAZARDS.slice(0, 4)} segments={DEMO_SEGMENTS} />
      </View>

      <Card>
        <Text style={type.eyebrow}>Estimated fare</Text>
        <Text style={styles.range}>{presentQuote(DEMO_QUOTE, country)}</Text>
        <View style={styles.caveat}>
          <Ionicons name="information-circle-outline" size={16} color={brand.navy} />
          <Text style={styles.caveatText}>
            Your final fare may change if traffic, waiting time or the route changes. We&rsquo;ll
            always show you exactly why.
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={type.eyebrow}>Route</Text>
        <View style={styles.leg}>
          <Ionicons name="ellipse" size={11} color={brand.green} />
          <Text style={type.body}>New Kingston</Text>
        </View>
        <View style={styles.leg}>
          <Ionicons name="location" size={13} color={brand.gold} />
          <Text style={type.body}>Half Way Tree</Text>
        </View>
        <Text style={type.caption}>7.4 km · about 22 min in current traffic</Text>
      </Card>

      <Button label="Confirm ride" onPress={confirm} />
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapFrame: { height: 200, borderRadius: 16, overflow: 'hidden' },
  range: { ...type.moneyLarge, marginTop: space.xs },
  caveat: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  caveatText: { ...type.caption, flex: 1, lineHeight: 18 },
  leg: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
});
