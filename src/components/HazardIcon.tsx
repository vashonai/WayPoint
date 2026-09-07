import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { HAZARDS } from '../features/hazards/taxonomy';
import { neutral, radius } from '../theme/tokens';
import type { HazardType } from '../theme/tokens';

/**
 * Brand & Style Guide §4.1 — hazard and status icons sit inside a 30px white
 * circle with a 2px coloured ring matching their category. This ring-and-badge
 * treatment is consistent everywhere a status icon appears: the map, the
 * report picker, and the hazard detail sheet.
 */
export function HazardIcon({ type, size = 30 }: { type: HazardType; size?: number }) {
  const def = HAZARDS[type];
  const ringWidth = Math.max(2, Math.round(size / 15));

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          borderWidth: ringWidth,
          borderColor: def.color,
        },
      ]}
    >
      <Ionicons name={def.icon as never} size={Math.round(size * 0.5)} color={def.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    backgroundColor: neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
