import { StyleSheet, View, type ViewProps } from 'react-native';

import { elevation, neutral, radius, space } from '../theme/tokens';

/**
 * The base surface. Brand & Style Guide §4.2: 16px radius, soft low-opacity
 * shadow. Hard drop shadows do not appear anywhere in the product.
 */
export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: neutral.surface,
    borderRadius: radius.card,
    padding: space.lg,
    ...elevation.card,
  },
});
