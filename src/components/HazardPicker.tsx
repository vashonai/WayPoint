import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCountry } from '../features/country/CountryProvider';
import { HAZARDS, HAZARD_PICKER_ORDER } from '../features/hazards/taxonomy';
import { neutral, radius, space } from '../theme/tokens';
import type { HazardType } from '../theme/tokens';
import { type } from '../theme/typography';
import { HazardIcon } from './HazardIcon';

type Props = {
  value: HazardType | null;
  onChange: (type: HazardType) => void;
};

/**
 * The 3x3 report grid from Figure 2 (left) — "What are you reporting?"
 *
 * Colour and icon come from the hazard taxonomy; the LABEL comes from the
 * active country config. That split matters: the enforcement label in
 * particular is regulator-reviewed and differs per market, so it must never
 * be written in a component.
 */
export function HazardPicker({ value, onChange }: Props) {
  const { hazardLabels } = useCountry();

  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {HAZARD_PICKER_ORDER.map((hazardType) => {
        const def = HAZARDS[hazardType];
        const label = hazardLabels[hazardType] ?? hazardType;
        const selected = value === hazardType;

        return (
          <Pressable
            key={hazardType}
            testID={`hazard-option-${hazardType}`}
            onPress={() => onChange(hazardType)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            style={({ pressed }) => [
              styles.tile,
              { borderColor: selected ? def.color : neutral.line },
              selected && { backgroundColor: tint(def.color) },
              pressed && styles.pressed,
            ]}
          >
            <HazardIcon type={hazardType} size={30} />
            <Text style={styles.label} numberOfLines={2}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A very light wash of the category colour, per the Figure 2 selected state. */
function tint(hex: string): string {
  return `${hex}14`;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm + 2,
  },
  tile: {
    // Three per row, accounting for the 10px gaps.
    width: '31.5%',
    minHeight: 92,
    borderWidth: 1.5,
    borderRadius: radius.control,
    backgroundColor: neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.xs,
    paddingVertical: space.md,
  },
  pressed: { opacity: 0.75 },
  label: {
    ...type.caption,
    color: neutral.charcoal,
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 14,
  },
});
