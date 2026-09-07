import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card, Screen } from '../../src/components';
import { formatCurrency, useCountry } from '../../src/features/country/CountryProvider';
import { DEMO_TRIP_HISTORY } from '../../src/mocks/fixtures';
import { brand, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function Activity() {
  const country = useCountry();

  return (
    <Screen scroll>
      <Text style={type.h1}>Activity</Text>

      {DEMO_TRIP_HISTORY.map((trip) => (
        <Pressable
          key={trip.id}
          onPress={() => router.push(`/(passenger)/trip/${trip.id}/receipt`)}
          accessibilityRole="button"
          accessibilityLabel={`Trip from ${trip.from} to ${trip.to}, ${trip.date}`}
        >
          <Card>
            <View style={styles.row}>
              <View style={styles.body}>
                <Text style={type.bodyMedium}>
                  {trip.from} &rarr; {trip.to}
                </Text>
                <Text style={type.caption}>{trip.date}</Text>
                {trip.disputed ? (
                  <View style={styles.flag}>
                    <Ionicons name="time-outline" size={12} color={brand.navy} />
                    <Text style={styles.flagText}>Under review — flagged, not charged</Text>
                  </View>
                ) : null}
              </View>
              <Text style={type.money}>{formatCurrency(trip.fare, country)}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.lg },
  body: { flex: 1, gap: 3 },
  flag: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  flagText: { ...type.caption, fontSize: 11, color: brand.navy },
});
