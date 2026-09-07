import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, HazardPicker, Screen } from '../../src/components';
import { useCountry } from '../../src/features/country/CountryProvider';
import { canSubmitReport, useReportStore } from '../../src/store/report.store';
import { brand, neutral, radius, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

/**
 * "Report a Road Condition" — Figure 2, left.
 *
 * Two constraints from the proposal shape this screen:
 *
 *   - 2.3: drivers are NEVER encouraged to take photos while driving. Submit
 *     is gated on an explicit stopped-vehicle confirmation.
 *   - 2.2: labels come from country config because the wording (especially for
 *     enforcement) is regulator-reviewed and differs per market.
 *
 * In production the submit is a paused-capable mutation, so a report captured
 * in a dead zone survives a kill and reaches the server on reconnect.
 */
export default function ReportHazard() {
  const country = useCountry();
  const { type: hazardType, photoUri, vehicleStopped } = useReportStore();
  const setType = useReportStore((s) => s.setType);
  const setPhoto = useReportStore((s) => s.setPhoto);
  const setVehicleStopped = useReportStore((s) => s.setVehicleStopped);
  const clear = useReportStore((s) => s.clear);

  const canSubmit = canSubmitReport({ type: hazardType, vehicleStopped });

  const submit = () => {
    clear();
    router.back();
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={type.eyebrow}>Help other drivers stay safe</Text>
        <Text style={type.h1}>Report a road condition</Text>
      </View>

      <Card>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={18} color={brand.gold} />
          <View style={styles.locationBody}>
            <Text style={type.captionStrong}>Your current location</Text>
            <Text style={type.body}>Constant Spring Road, Kingston</Text>
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={type.h2}>What are you reporting?</Text>
        <HazardPicker value={hazardType} onChange={setType} />
      </View>

      <View style={styles.section}>
        <Text style={type.h2}>Add evidence</Text>
        <Text style={type.caption}>Optional, but it speeds up confirmation.</Text>

        <View style={styles.evidenceRow}>
          <Pressable
            style={[styles.photoBox, photoUri ? styles.photoBoxFilled : null]}
            onPress={() => setPhoto(photoUri ? null : 'captured://hazard')}
            accessibilityRole="button"
            accessibilityLabel={photoUri ? 'Photo added, tap to remove' : 'Take photo'}
          >
            <Ionicons
              name={photoUri ? 'checkmark-circle' : 'camera-outline'}
              size={24}
              color={photoUri ? brand.green : neutral.inkSoft}
            />
            <Text style={type.caption}>{photoUri ? 'Photo added' : 'Take photo'}</Text>
          </Pressable>

          <View style={styles.autoList}>
            {['GPS location auto-attached', 'Timestamp auto-attached'].map((line) => (
              <View key={line} style={styles.autoItem}>
                <Ionicons name="ellipse" size={7} color={brand.navy} />
                <Text style={type.caption}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* The safety gate. Proposal 2.3. */}
      <Card style={styles.gate}>
        <View style={styles.gateRow}>
          <View style={styles.gateBody}>
            <Text style={type.bodyMedium}>My vehicle is safely stopped</Text>
            <Text style={type.caption}>
              Never report while driving. You can also finish this after the trip ends.
            </Text>
          </View>
          <Switch
            value={vehicleStopped}
            onValueChange={setVehicleStopped}
            trackColor={{ false: neutral.line, true: brand.green }}
            accessibilityLabel="Confirm my vehicle is safely stopped"
          />
        </View>
      </Card>

      <Button
        label="Submit report"
        onPress={submit}
        disabled={!canSubmit}
        testID="submit-report"
        accessibilityHint={
          canSubmit
            ? undefined
            : 'Choose what you are reporting and confirm your vehicle is stopped first.'
        }
      />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />

      <Text style={styles.footnote}>
        Reports are confirmed by GPS data and other drivers, and expire on their own.{' '}
        {country.hazardLabels.enforcement} is shown for road awareness only and never affects your
        route.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.xs },
  section: { gap: space.md },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  locationBody: { flex: 1, gap: 2 },
  evidenceRow: { flexDirection: 'row', gap: space.md },
  photoBox: {
    width: 128,
    height: 96,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: neutral.line,
    borderRadius: radius.control,
    backgroundColor: neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  photoBoxFilled: { borderStyle: 'solid', borderColor: brand.green, backgroundColor: '#F2F8F6' },
  autoList: { flex: 1, justifyContent: 'center', gap: space.sm },
  autoItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  gate: { borderWidth: 1.5, borderColor: neutral.line },
  gateRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  gateBody: { flex: 1, gap: 2 },
  footnote: { ...type.caption, fontSize: 11 },
});
