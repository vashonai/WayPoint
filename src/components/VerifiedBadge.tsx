import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { brand, radius, space } from '../theme/tokens';
import { type } from '../theme/typography';

/**
 * Route Green — the guide's stated use for verified and success states.
 *
 * Deliberately NOT traffic.clear. The traffic palette earns its trust by
 * meaning exactly one thing on the map; reusing that green for a UI badge
 * erodes the signal a driver relies on at a glance.
 */
export function VerifiedBadge({ label = 'Verified' }: { label?: string }) {
  return (
    <View style={styles.badge} accessibilityRole="text" accessibilityLabel={`${label} by Waypoint`}>
      <Ionicons name="shield-checkmark" size={13} color={brand.green} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    backgroundColor: '#E3F0EC',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
  },
  label: { ...type.captionStrong, color: brand.green, letterSpacing: 0.2 },
});
