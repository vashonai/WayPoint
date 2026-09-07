import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { brand } from '../theme/tokens';
import { fontFamily } from '../theme/typography';

/**
 * The Waypoint icon mark — a pin holding a waypoint dot, with a dotted route
 * passing beneath it. Brand & Style Guide §1.1.
 *
 * Minimum size 32px (guide §1.4): the pin outline and the dot both break down
 * below that, so `size` is clamped.
 */
export function LogoMark({ size = 40, tint = brand.navy }: { size?: number; tint?: string }) {
  const s = Math.max(32, size);
  return (
    <Svg width={s} height={s} viewBox="0 0 48 48" accessibilityLabel="Waypoint">
      <Path
        d="M24 5c-7.2 0-13 5.7-13 12.7C11 26.5 24 40 24 40s13-13.5 13-22.3C37 10.7 31.2 5 24 5Z"
        fill="none"
        stroke={tint}
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      <Circle cx={24} cy={17.5} r={5.4} fill={brand.gold} />
      {[9, 16, 23, 30, 37].map((cx, i) => (
        <Circle key={cx} cx={cx} cy={i === 0 || i === 4 ? 44 : 43.3} r={1.5} fill={brand.green} />
      ))}
    </Svg>
  );
}

/**
 * The wordmark — "Way" in Navy, "point" in Gold, with the i in Route Green so
 * it doubles as a pin marker. Guide §1.2.
 */
export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <Text style={[styles.wordmark, { fontSize: size }]} accessibilityLabel="Waypoint">
      <Text style={{ color: brand.navy }}>Way</Text>
      <Text style={{ color: brand.gold }}>po</Text>
      <Text style={{ color: brand.green }}>i</Text>
      <Text style={{ color: brand.gold }}>nt</Text>
    </Text>
  );
}

export function LogoLockup({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.lockup}>
      <LogoMark size={size} />
      <Wordmark size={size * 0.6} />
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: { fontFamily: fontFamily.display, letterSpacing: -0.5 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
