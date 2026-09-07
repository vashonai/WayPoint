import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, DynamicForm, Screen } from '../../../src/components';
import { useDocumentSpec } from '../../../src/features/country/CountryProvider';
import { space } from '../../../src/theme/tokens';
import { type } from '../../../src/theme/typography';

/**
 * ONE screen for every driver document, in every market.
 *
 * Proposal §2.8 promises new markets can be switched on without rebuilding the
 * core app. This route is where that promise is kept: it renders whatever
 * DocumentSpec the country config supplies and derives its own validation from
 * the same field list. Adding Trinidad & Tobago is a config row.
 */
export default function DocumentCapture() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const spec = useDocumentSpec(slug ?? '');

  if (!spec) {
    return (
      <Screen>
        <Text style={type.h2}>Document not found</Text>
        <Text style={type.body}>
          &ldquo;{slug}&rdquo; isn&rsquo;t required in your market. Go back to see the documents you
          need.
        </Text>
        <Button label="Back to checklist" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text style={type.eyebrow}>Verification</Text>
      </View>
      <DynamicForm spec={spec} onSubmit={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: space.xs },
});
