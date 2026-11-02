import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Button,
  Card,
  DEMO_HAZARD_PINS,
  LiveMap,
  PanicButton,
  TripSheet,
} from '../../../src/components';
import { useCountry } from '../../../src/features/country/CountryProvider';
import { firePanic } from '../../../src/features/safety/firePanic';
import {
  beginTripTrace,
  endTripTrace,
  publishLiveFix,
  recordFixes,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../../../src/features/tracking';
import { DEMO_DESTINATION, DEMO_PICKUP, DEMO_ROUTE } from '../../../src/mocks/fixtures';
import { useLiveTracking } from '../../../src/store/tracking.store';
import { brand, neutral, radius, space } from '../../../src/theme/tokens';
import { type } from '../../../src/theme/typography';

const DEVIATION_REASONS = [
  'Construction',
  'Accident',
  'Flooding',
  'Road closure',
  'Unsafe road',
  'Other',
];

/**
 * The driver trip surface, and the host for the route-deviation prompt.
 *
 * Proposal 2.3 and 2.7: a deviation is FLAGGED FOR REVIEW, never treated as
 * guilt. GPS fails, passengers change their minds, roads close without notice.
 * So the prompt asks a question rather than issuing an accusation, and the
 * driver answers in one tap. Evidence capture requires the vehicle to be
 * stopped, which the evidence modal enforces.
 */
export default function DriverTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const country = useCountry();
  const [showPrompt, setShowPrompt] = useState(true);
  const [sheetHeight, setSheetHeight] = useState(0);

  const [backgroundOn, setBackgroundOn] = useState(false);

  // Evidence path. The background task records the trace for the whole trip,
  // whether or not this screen is visible, and uploads it in batches.
  useEffect(() => {
    if (!id) return;
    let ended = false;
    beginTripTrace(id);
    startBackgroundTracking()
      .then((ok) => !ended && setBackgroundOn(ok))
      .catch(() => {});
    return () => {
      ended = true;
      stopBackgroundTracking().catch(() => {});
      endTripTrace().catch(() => {});
    };
  }, [id]);

  // Live path: this map, and the broadcast that moves the passenger's car.
  // 'simulated' until routes come from the server — the phone's real GPS would
  // sit nowhere near the fixture route. Switch to 'device' to drive it for real.
  useLiveTracking({
    route: DEMO_ROUTE,
    source: 'simulated',
    onAccepted: (fix) => {
      publishLiveFix(id ?? '', fix);
      // No background task (Expo Go, or "Always" declined): record the trace
      // from the foreground so it at least covers time on this screen.
      if (!backgroundOn) recordFixes([fix]).catch(() => {});
    },
  });

  return (
    <View style={styles.root}>
      <LiveMap
        route={DEMO_ROUTE}
        pickup={DEMO_PICKUP}
        destination={DEMO_DESTINATION}
        defaultCamera="follow"
        bottomInset={sheetHeight}
        hazards={DEMO_HAZARD_PINS}
      />

      <View
        style={styles.sheetWrap}
        onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
      >
        <TripSheet eyebrow={`Trip ${id}`} title="On the way" detail="Route verified by Waypoint.">
          {showPrompt ? (
            <Card style={styles.prompt}>
              <View style={styles.promptHead}>
                <Ionicons name="git-branch-outline" size={18} color={brand.navy} />
                <Text style={type.h3}>Different route detected</Text>
              </View>
              <Text style={type.caption}>
                You appear to be taking a different route. Is there a road condition affecting your
                journey? This is a question, not a penalty.
              </Text>

              <View style={styles.reasons}>
                {DEVIATION_REASONS.map((reason) => (
                  <Text
                    key={reason}
                    style={styles.reasonChip}
                    accessibilityRole="button"
                    onPress={() => {
                      setShowPrompt(false);
                      router.push(`/(modals)/evidence/${id}`);
                    }}
                  >
                    {reason}
                  </Text>
                ))}
              </View>

              <Button
                label="No, continuing as normal"
                variant="ghost"
                onPress={() => setShowPrompt(false)}
              />
            </Card>
          ) : null}

          <PanicButton
            onFire={() => firePanic({ tripId: id ?? '', role: 'driver' }, country)}
            emergencyLabel={country.emergency.label}
            testID="driver-panic"
          />
        </TripSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral.paper },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  prompt: { gap: space.sm, borderWidth: 1.5, borderColor: neutral.line },
  promptHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  reasonChip: {
    ...type.caption,
    color: brand.navy,
    borderWidth: 1.5,
    borderColor: neutral.line,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    overflow: 'hidden',
  },
});
