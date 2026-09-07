import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, PanicButton, Screen } from '../../src/components';
import { useCountry } from '../../src/features/country/CountryProvider';
import { firePanic } from '../../src/features/safety/firePanic';
import { DEMO_CONTACT } from '../../src/mocks/fixtures';
import { useSafetyStore, type ShareDuration } from '../../src/store/safety.store';
import { brand, neutral, radius, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

const DURATIONS: { value: ShareDuration; label: string }[] = [
  { value: 'this_trip', label: 'This trip only' },
  { value: 'until_i_stop', label: 'Until I stop it' },
  { value: 'time_limit', label: 'Set a time limit' },
];

/**
 * "Share My Ride" — Figure 2, right, and Proposal 2.1.
 *
 * OFF BY DEFAULT, PASSENGER-CONTROLLED. This feature never activates on its
 * own, and the proposal is explicit that the safety feature must never itself
 * become a privacy risk. Three things follow, and all three are visible here:
 *
 *   - The toggle defaults to off and is not persisted as a preference that
 *     silently re-arms next trip.
 *   - Revocation is optimistic and immediate. Waiting on a round trip to
 *     confirm a privacy revocation is the wrong default.
 *   - Access expires automatically when the ride ends unless the passenger
 *     explicitly chose otherwise.
 */
export default function ShareRide() {
  const country = useCountry();
  const isSharing = useSafetyStore((s) => s.isSharing);
  const shareDuration = useSafetyStore((s) => s.shareDuration);
  const contact = useSafetyStore((s) => s.trustedContact);
  const startSharing = useSafetyStore((s) => s.startSharing);
  const stopSharing = useSafetyStore((s) => s.stopSharing);
  const setShareDuration = useSafetyStore((s) => s.setShareDuration);

  const activeContact = contact ?? DEMO_CONTACT;

  const toggle = (on: boolean) => {
    if (on) startSharing(activeContact, shareDuration);
    else stopSharing();
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={type.eyebrow}>Optional — off by default</Text>
        <Text style={type.h1}>Share My Ride</Text>
      </View>

      <Card>
        <View style={styles.toggleRow}>
          <View style={styles.toggleBody}>
            <Text style={type.bodyMedium}>Share this trip</Text>
            <Text style={type.caption}>Nobody can see your trip unless you turn this on.</Text>
          </View>
          <Switch
            value={isSharing}
            onValueChange={toggle}
            trackColor={{ false: neutral.line, true: brand.green }}
            accessibilityLabel="Share this trip"
            testID="share-toggle"
          />
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={type.h2}>Trusted contact</Text>
        <Card style={[styles.contactCard, isSharing && styles.contactCardActive]}>
          <View style={styles.contactRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{activeContact.initials}</Text>
            </View>
            <View style={styles.contactBody}>
              <Text style={type.bodyMedium}>
                {activeContact.name} — {activeContact.relationship}
              </Text>
              <Text style={type.caption}>Will receive a live tracking link</Text>
            </View>
            <Text style={styles.change}>Change</Text>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={type.h2}>Access duration</Text>
        <View style={styles.durations}>
          {DURATIONS.map((d) => {
            const selected = shareDuration === d.value;
            return (
              <Pressable
                key={d.value}
                onPress={() => setShareDuration(d.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.duration, selected && styles.durationSelected]}
              >
                <Text style={[styles.durationText, selected && styles.durationTextSelected]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={type.h2}>What they will see</Text>
        {[
          'Live location and trip progress',
          'Vehicle and driver details',
          'Estimated arrival time',
        ].map((line) => (
          <View key={line} style={styles.seeItem}>
            <Ionicons name="ellipse" size={8} color={brand.navy} />
            <Text style={type.body}>{line}</Text>
          </View>
        ))}
      </View>

      {isSharing ? (
        <Button label="Stop sharing instantly" variant="danger" onPress={stopSharing} />
      ) : null}

      <PanicButton
        onFire={() => firePanic({ tripId: '', role: 'passenger' }, country)}
        emergencyLabel={country.emergency.label}
      />

      <Text style={type.caption}>
        Access expires automatically when the ride ends unless you chose to keep it on.
      </Text>

      <Button label="Done" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.xs },
  section: { gap: space.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  toggleBody: { flex: 1, gap: 2 },
  contactCard: { borderWidth: 1.5, borderColor: neutral.line },
  contactCardActive: { borderColor: brand.navy },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: neutral.surface, fontSize: 13, fontWeight: '700' },
  contactBody: { flex: 1, gap: 2 },
  change: { ...type.captionStrong, color: brand.navy },
  durations: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  duration: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: neutral.line,
    borderRadius: radius.control,
    backgroundColor: neutral.surface,
    paddingHorizontal: space.lg,
  },
  durationSelected: { backgroundColor: brand.navy, borderColor: brand.navy },
  durationText: { ...type.bodyMedium, fontSize: 14 },
  durationTextSelected: { color: neutral.surface },
  seeItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
