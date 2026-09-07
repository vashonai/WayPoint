import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  DEMO_HAZARDS,
  DEMO_SEGMENTS,
  MapCanvas,
  TripSheet,
  VerifiedBadge,
} from '../../src/components';
import { neutral, radius, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

/**
 * The passenger home — map first, sheet over it.
 *
 * MapCanvas is memoised and mounted once at route level. Nothing that
 * re-renders on a timer or a location update may wrap it.
 */
export default function PassengerHome() {
  return (
    <View style={styles.root}>
      <MapCanvas hazards={DEMO_HAZARDS} segments={DEMO_SEGMENTS} showRoute={false} />

      <View style={styles.sheetWrap}>
        <TripSheet
          eyebrow="New Kingston"
          title="Where to?"
          detail="Set your destination to see a fare estimate before you book."
        >
          <Pressable
            style={styles.searchBox}
            onPress={() => router.push('/(passenger)/quote')}
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
