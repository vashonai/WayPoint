import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { brand, neutral, radius, space, HIT_SLOP_MIN } from '../theme/tokens';
import { type } from '../theme/typography';

/**
 * Brand & Style Guide §4.3.
 *   Primary   — Waypoint Navy fill, white text.
 *   Secondary — outline in Navy, Navy text, transparent fill.
 *   Danger    — Alert Coral. Destructive actions only, never decorative.
 *
 * There is deliberately no `gold` variant: Pin Gold fails WCAG AA as text
 * (2.3:1) and the guide restricts it to fills and large bold display.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  accessibilityHint,
  testID,
}: Props) {
  const isDisabled = disabled || loading;
  const palette = VARIANTS[variant];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && { backgroundColor: palette.pressedBg },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          <Text style={[type.button, { color: palette.fg }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<ButtonVariant, { bg: string; pressedBg: string; fg: string; border: string }> = {
  primary: {
    bg: brand.navy,
    pressedBg: '#0A1729',
    fg: neutral.surface,
    border: brand.navy,
  },
  secondary: {
    bg: 'transparent',
    pressedBg: '#E4E9EF',
    fg: brand.navy,
    border: brand.navy,
  },
  danger: {
    bg: brand.coral,
    pressedBg: '#B93A3A',
    fg: neutral.surface,
    border: brand.coral,
  },
  ghost: {
    bg: 'transparent',
    pressedBg: neutral.line,
    fg: neutral.inkSoft,
    border: 'transparent',
  },
};

const styles = StyleSheet.create({
  base: {
    minHeight: HIT_SLOP_MIN,
    borderRadius: radius.control,
    borderWidth: 1.5,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  disabled: { opacity: 0.45 },
});
