import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen } from '../../src/components';
import { formatCurrency, useCountry } from '../../src/features/country/CountryProvider';
import { neutral, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

const WEEK = [
  { day: 'Saturday', trips: 9, amount: 11240 },
  { day: 'Friday', trips: 8, amount: 9860 },
  { day: 'Thursday', trips: 6, amount: 6980 },
  { day: 'Wednesday', trips: 5, amount: 5720 },
  { day: 'Tuesday', trips: 4, amount: 4620 },
];

export default function Earnings() {
  const country = useCountry();
  const total = WEEK.reduce((sum, row) => sum + row.amount, 0);
  const trips = WEEK.reduce((sum, row) => sum + row.trips, 0);

  return (
    <Screen scroll>
      <Text style={type.h1}>Earnings</Text>

      <Card>
        <Text style={type.eyebrow}>This week</Text>
        <Text style={type.moneyLarge}>{formatCurrency(total, country)}</Text>
        <Text style={type.caption}>{trips} trips over 5 days online</Text>
      </Card>

      {WEEK.map((row) => (
        <View key={row.day} style={styles.row}>
          <View style={styles.rowBody}>
            <Text style={type.bodyMedium}>{row.day}</Text>
            <Text style={type.caption}>{row.trips} trips</Text>
          </View>
          <Text style={type.money}>{formatCurrency(row.amount, country)}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: neutral.line,
  },
  rowBody: { gap: 2 },
});
