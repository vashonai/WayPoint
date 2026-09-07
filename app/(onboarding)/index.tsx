import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, DocumentCard, Screen } from '../../src/components';
import type { DocumentStatus } from '../../src/components';
import { useCountry } from '../../src/features/country/CountryProvider';
import { useSessionStore } from '../../src/store/session.store';
import { neutral, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

/**
 * Driver verification, layers 1-3 — Proposal §2.5.
 *
 * The checklist is generated from the active country config. Jamaica's list
 * includes the police record; Trinidad's substitutes a Certificate of
 * Character. Neither is written in this file, and that is the point: adding a
 * market must never mean adding a screen.
 */
export default function OnboardingChecklist() {
  const country = useCountry();
  const setDriverVerified = useSessionStore((s) => s.setDriverVerified);

  // Scaffold statuses. Real values come from the verification query.
  const statuses: Record<string, DocumentStatus> = {
    'government-id': 'verified',
    'drivers-licence': 'pending',
    'drivers-permit': 'pending',
    'police-record': 'missing',
    'certificate-of-character': 'missing',
    insurance: 'expiring',
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={type.eyebrow}>Verification · {country.name}</Text>
        <Text style={type.h1}>Before you drive</Text>
        <Text style={styles.intro}>
          Waypoint verifies every driver before they can accept a trip. Submit each document below —
          we&rsquo;ll review them and let you know within two business days.
        </Text>
      </View>

      <View style={styles.list}>
        {country.driverDocuments.map((doc) => (
          <DocumentCard
            key={doc.slug}
            label={doc.label}
            status={statuses[doc.slug] ?? 'missing'}
            detail={doc.expires ? `Renewal reminder ${doc.renewalNoticeDays} days before expiry` : undefined}
            onPress={() => router.push(`/(onboarding)/documents/${doc.slug}`)}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={type.caption}>
          Layers 1&ndash;3 of {country.name}&rsquo;s six-layer safety check. Live driver-match
          confirmation and ongoing trip monitoring follow once you are active.
        </Text>
        <Button
          label="Skip for now (scaffold)"
          variant="ghost"
          onPress={() => setDriverVerified(true)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm },
  intro: { ...type.body, color: neutral.inkSoft },
  list: { gap: space.md },
  footer: { gap: space.md, marginTop: 'auto' },
});
