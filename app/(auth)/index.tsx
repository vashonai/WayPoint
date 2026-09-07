import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, LogoMark, Screen, Wordmark } from '../../src/components';
import { useCountry } from '../../src/features/country/CountryProvider';
import { useSessionStore } from '../../src/store/session.store';
import { neutral, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

/**
 * Sign-in. Phone-first, because that is how the launch market signs up.
 *
 * The verification flow (phone + email, Proposal Phase 1) sits behind this;
 * this scaffold signs in directly so the rest of the app is reachable.
 */
export default function SignIn() {
  const country = useCountry();
  const signIn = useSessionStore((s) => s.signIn);
  const setMode = useSessionStore((s) => s.setMode);
  const setDriverVerified = useSessionStore((s) => s.setDriverVerified);
  const [busy, setBusy] = useState<string | null>(null);

  const enter = (mode: 'passenger' | 'driver', verified: boolean) => {
    setBusy(mode);
    signIn({ userId: 'u_demo', displayName: 'Allekay T.', phone: '+1 876 555 0142' });
    setMode(mode);
    setDriverVerified(verified);
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <LogoMark size={64} />
        <Wordmark size={34} />
        <Text style={styles.tagline}>Know the way. Know you&rsquo;re safe.</Text>
      </View>

      <View style={styles.actions}>
        <Text style={type.eyebrow}>Continue as</Text>
        <Button
          label="Passenger"
          onPress={() => enter('passenger', false)}
          loading={busy === 'passenger'}
          accessibilityHint="Book a ride and see live road conditions."
        />
        <Button
          label="Driver — verified"
          variant="secondary"
          onPress={() => enter('driver', true)}
          accessibilityHint="Go online and accept trips."
        />
        <Button
          label="Driver — start verification"
          variant="ghost"
          onPress={() => enter('driver', false)}
          accessibilityHint="Submit your documents to begin driving."
        />
      </View>

      <Text style={styles.market}>
        {country.name} · {country.currency.code} · Emergency {country.emergency.police}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  hero: { alignItems: 'center', gap: space.md, marginTop: space.xxxl },
  tagline: { ...type.body, color: neutral.inkSoft, textAlign: 'center' },
  actions: { gap: space.md },
  market: { ...type.caption, textAlign: 'center' },
});
