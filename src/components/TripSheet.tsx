import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { elevation, neutral, radius, space } from '../theme/tokens';
import { type } from '../theme/typography';

/**
 * The sheet that sits over the map on every trip surface.
 *
 * The single most-reused surface in the product — build it once and drive it
 * from the trip machine rather than re-implementing a card per phase.
 *
 * In production this wraps `@gorhom/bottom-sheet` with phase-driven snap
 * points. The critical constraint survives that swap: the MAP must not
 * re-render while the sheet is dragged, so the sheet owns its own animation
 * and never lifts gesture state into a parent the map subscribes to.
 */
export function TripSheet({
  title,
  detail,
  eyebrow,
  children,
  style,
}: {
  title: string;
  detail?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.sheet, style]}>
      <View style={styles.grabber} />
      {eyebrow ? <Text style={type.eyebrow}>{eyebrow}</Text> : null}
      <Text style={type.h2}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: neutral.surface,
    borderTopLeftRadius: radius.frame,
    borderTopRightRadius: radius.frame,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xxl,
    gap: space.xs,
    ...elevation.sheet,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral.line,
    marginBottom: space.md,
  },
  detail: { ...type.body, color: neutral.inkSoft },
  body: { marginTop: space.lg, gap: space.md },
});
