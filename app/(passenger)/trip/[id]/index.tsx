import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  DEMO_HAZARD_PINS,
  LiveMap,
  PanicButton,
  TripSheet,
  VerifiedBadge,
} from '../../../../src/components';
import { useCountry } from '../../../../src/features/country/CountryProvider';
import { firePanic } from '../../../../src/features/safety/firePanic';
import { PHASE_COPY, showsLiveMap, showsSafetyControls } from '../../../../src/features/trip';
import {
  DEMO_DESTINATION,
  DEMO_DRIVER,
  DEMO_PICKUP,
  DEMO_ROUTE,
} from '../../../../src/mocks/fixtures';
import { useSafetyStore } from '../../../../src/store/safety.store';
import { useLiveTracking } from '../../../../src/store/tracking.store';
import { useTripStore } from '../../../../src/store/trip.store';
import { brand, neutral, radius, space } from '../../../../src/theme/tokens';
import { type } from '../../../../src/theme/typography';

/**
 * The live trip surface.
 *
 * Safety controls are always reachable here — never behind a menu — and the
 * panic button sits in the thumb arc of the bottom third, per §2.6.
 */
export default function LiveTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const country = useCountry();
  const phase = useTripStore((s) => s.phase);
  const send = useTripStore((s) => s.send);
  const isSharing = useSafetyStore((s) => s.isSharing);
  const [sheetHeight, setSheetHeight] = useState(0);

  // Stands in for joining the trip room and receiving `driver_location`
  // broadcasts. Live only while the trip is — the stream stops, and the
  // position is cleared, the moment the phase leaves the live set.
  useLiveTracking({ route: DEMO_ROUTE, source: 'simulated', enabled: showsLiveMap(phase) });

  // Stands in for the trip channel's phase broadcasts.
  useEffect(() => {
    const t1 = setTimeout(() => send({ type: 'DRIVER_MATCHED' }), 900);
    const t2 = setTimeout(() => send({ type: 'DRIVER_EN_ROUTE' }), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [send]);

  const copy = PHASE_COPY[phase];

  return (
    <View style={styles.root}>
      <LiveMap
        route={DEMO_ROUTE}
        pickup={DEMO_PICKUP}
        destination={DEMO_DESTINATION}
        defaultCamera="overview"
        bottomInset={sheetHeight}
        hazards={DEMO_HAZARD_PINS}
        showsUserLocation
      />

      <View
        style={styles.sheetWrap}
        onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
      >
        <TripSheet eyebrow={`Trip ${id}`} title={copy.title} detail={copy.detail}>
          <View style={styles.driverRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>MB</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={type.bodyMedium}>{DEMO_DRIVER.name}</Text>
              <Text style={type.caption}>
                {DEMO_DRIVER.vehicle} · {DEMO_DRIVER.plate}
              </Text>
              <VerifiedBadge label="Verified driver" />
            </View>
            <View style={styles.eta}>
              <Text style={styles.etaNum}>{DEMO_DRIVER.etaMinutes}</Text>
              <Text style={type.caption}>min</Text>
            </View>
          </View>

          <Pressable
            style={styles.shareRow}
            onPress={() => router.push('/(modals)/share-ride')}
            accessibilityRole="button"
            accessibilityLabel="Share my ride settings"
          >
            <Ionicons
              name={isSharing ? 'eye' : 'eye-off-outline'}
              size={18}
              color={isSharing ? brand.green : neutral.inkSoft}
            />
            <Text style={styles.shareText}>
              {isSharing ? 'Sharing this trip' : 'Share My Ride — off'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={neutral.inkSoft} />
          </Pressable>

          <Pressable
            style={styles.reportRow}
            onPress={() => router.push('/(modals)/report-hazard')}
            accessibilityRole="button"
          >
            <Ionicons name="warning-outline" size={18} color={neutral.inkSoft} />
            <Text style={styles.shareText}>Report a road condition</Text>
            <Ionicons name="chevron-forward" size={16} color={neutral.inkSoft} />
          </Pressable>

          {showsSafetyControls(phase) ? (
            <PanicButton
              onFire={() => firePanic({ tripId: id ?? '', role: 'passenger' }, country)}
              emergencyLabel={country.emergency.label}
              testID="passenger-panic"
            />
          ) : null}
        </TripSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral.paper },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: neutral.surface, fontSize: 15, fontWeight: '700' },
  driverInfo: { flex: 1, gap: 3 },
  eta: { alignItems: 'center' },
  etaNum: { ...type.moneyLarge, fontSize: 24 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: neutral.line,
    paddingTop: space.md,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
  },
  shareText: { ...type.body, flex: 1 },
});
