import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { brand, neutral, radius, space } from '../theme/tokens';
import { type } from '../theme/typography';

/** How long the button must be held before it fires. */
export const PANIC_HOLD_MS = 1500;

type Props = {
  onFire: () => void;
  /** Shown under the label — comes from country config, never hardcoded. */
  emergencyLabel?: string;
  testID?: string;
};

/**
 * The panic button — Proposal §2.6, both personas.
 *
 * Long-press, not tap, and deliberately so: a tap in a pocket dispatches
 * emergency services, while a tap that opens a confirmation dialog costs
 * seconds a passenger in trouble does not have. Press-and-hold with a visible
 * progress fill resolves both.
 *
 * The only Alert Coral fill in the product.
 *
 * NOTE: the progress fill uses the Animated API with `useNativeDriver` rather
 * than NativeWind classes. Style resolution during render is the wrong tool in
 * a path where a dropped frame is genuinely unacceptable.
 */
export function PanicButton({ onFire, emergencyLabel, testID }: Props) {
  // useMemo, not useRef: `interpolate` reads this during render, and a ref
  // read during render is exactly what the react-hooks/refs rule forbids.
  const progress = useMemo(() => new Animated.Value(0), []);
  const [isHolding, setIsHolding] = useState(false);
  const firedRef = useRef(false);

  const reset = useCallback(() => {
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    setIsHolding(false);
  }, [progress]);

  const handlePressIn = useCallback(() => {
    firedRef.current = false;
    setIsHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    Animated.timing(progress, {
      toValue: 1,
      duration: PANIC_HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished || firedRef.current) return;
      firedRef.current = true;
      // Confirm physically BEFORE any network work — the user must know it
      // fired even if every transport is about to fail.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onFire();
      reset();
    });
  }, [onFire, progress, reset]);

  useEffect(() => () => progress.stopAnimation(), [progress]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable
      testID={testID}
      onPressIn={handlePressIn}
      onPressOut={reset}
      accessibilityRole="button"
      accessibilityLabel="Emergency panic button"
      accessibilityHint={`Press and hold for ${PANIC_HOLD_MS / 1000} seconds to alert Waypoint Safety${
        emergencyLabel ? ` and ${emergencyLabel}` : ''
      }.`}
      style={styles.wrapper}
    >
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: fillWidth }]} />
        <View style={styles.content} pointerEvents="none">
          <View style={styles.sosBadge}>
            <Text style={styles.sosText}>SOS</Text>
          </View>
          <View style={styles.copy}>
            <Text style={[type.button, styles.label]}>
              {isHolding ? 'Keep holding…' : 'Hold for emergency'}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              Alerts Waypoint Safety{emergencyLabel ? ` & ${emergencyLabel}` : ''}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'stretch' },
  track: {
    minHeight: 64,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: brand.coral,
    backgroundColor: '#FBEDED',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: brand.coral,
    opacity: 0.22,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  sosBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: brand.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    color: neutral.surface,
    fontSize: 13,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  copy: { flex: 1, gap: 2 },
  label: { color: '#8E2B2B' },
  sub: { ...type.caption, color: '#A14343' },
});
