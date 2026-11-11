import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AreaMap, TripSheet, VerifiedBadge } from '../../src/components';
import { useCountry } from '../../src/features/country';
import { DEMO_HAZARD_PINS } from '../../src/mocks/fixtures';
import { neutral, radius, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

/**
 * The passenger home — map first, sheet over it.
 *
 * AreaMap is memoised and mounted once at route level. Nothing that
 * re-renders on a timer or a location update may wrap it.
 *
 * Location is not requested here. The map shows the passenger's position only
 * if they have already allowed it; the ask happens when they choose a pickup.
 */
export default function PassengerHome() {
  const country = useCountry();
  const [permission] = Location.useForegroundPermissions();
  const [sheetHeight, setSheetHeight] = useState(0);

  return (
    <View style={styles.root}>
      <AreaMap
        hazards={DEMO_HAZARD_PINS}
        bottomInset={sheetHeight}
        showsUserLocation={permission?.granted ?? false}
      />

      <View
        style={styles.sheetWrap}
        onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
      >
        <TripSheet
          eyebrow={country.name}
          title="Where to?"
          detail="Set your destination to see a fare estimate before you book."
        >
          <Pressable
            style={styles.searchBox}
            onPress={() => router.push('/(passenger)/search')}
            accessibilityRole="button"
            accessibilityLabel="Choose destination"
          >
            <Ionicons name="search" size={18} color={neutral.inkSoft} />
            <Text style={styles.searchText}>Choose destination</Text>
          </Pressable>

          <View style={styles.assurance}>
            <VerifiedBadge label="Verified drivers only" />
            <Text style={type.caption}>
              Every driver is identity-checked, licence-checked and police-record verified.
            </Text>
          </View>
        </TripSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral.paper },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 52,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: neutral.line,
    backgroundColor: neutral.paper,
    paddingHorizontal: space.lg,
  },
  searchText: { ...type.body, color: neutral.inkSoft },
  assurance: { gap: space.sm },
});
