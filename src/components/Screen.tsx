import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { neutral, space } from '../theme/tokens';

/** Standard padded screen on the Paper background. */
export function Screen({
  scroll = false,
  style,
  children,
  ...rest
}: ViewProps & { scroll?: boolean }) {
  const Inner = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Inner
        style={scroll ? undefined : [styles.body, style]}
        contentContainerStyle={scroll ? [styles.body, style] : undefined}
        {...(rest as object)}
      >
        {children}
      </Inner>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.paper },
  body: { flexGrow: 1, padding: space.xl, gap: space.lg },
});
