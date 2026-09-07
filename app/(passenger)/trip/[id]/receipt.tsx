import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Button, FareBreakdown, Screen } from '../../../../src/components';
import { useCountry } from '../../../../src/features/country/CountryProvider';
import { presentFare } from '../../../../src/features/fare/presentFare';
import { DEMO_FINAL_FARE, DEMO_QUOTE } from '../../../../src/mocks/fixtures';
import { type } from '../../../../src/theme/typography';

/**
 * The receipt — where §2.4's transparency promise is either kept or broken.
 *
 * Every figure was computed server-side. When the total exceeds the estimate,
 * `presentFare` produces a mandatory explanation block; a silent overage is
 * exactly the surprise the proposal forbids.
 */
export default function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const country = useCountry();
  const fare = presentFare(DEMO_QUOTE, DEMO_FINAL_FARE, country);

  return (
    <Screen scroll>
      <Text style={type.eyebrow}>Trip {id}</Text>
      <Text style={type.h1}>Your receipt</Text>

      <FareBreakdown fare={fare} />

      {!fare.withinEstimate ? (
        <Button label="Ask us to review this fare" variant="secondary" onPress={() => {}} />
      ) : null}
      <Button label="Done" onPress={() => router.replace('/(passenger)')} />
    </Screen>
  );
}
