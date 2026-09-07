import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Card,
  DEMO_HAZARDS,
  DEMO_SEGMENTS,
  MapCanvas,
  TripSheet,
} from '../../src/components';
import { formatCurrency, useCountry } from '../../src/features/country/CountryProvider';
import { DEMO_TRIP_ID } from '../../src/mocks/fixtures';
import { brand, neutral, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

/**
 * The driver home. Going online is what starts background location tracking,
 * so the location permission is requested HERE, contextually — never at launch.
 * That is both the right UX and what keeps the iOS review defensible.
 */
export default function DriverHome() {
  const country = useCountry();
  const [online, setOnline] = useState(false);

  return (
    <View style={styles.root}>
      <MapCanvas hazards={DEMO_HAZARDS} segments={DEMO_SEGMENTS} showRoute={false} />

      <View style={styles.sheetWrap}>
        <TripSheet
          eyebrow={online ? 'Online · Kingston' : 'Offline'}
          title={online ? 'Waiting for requests' : 'You’re offline'}
          detail={
            online
              ? 'You’ll see requests here as they come in.'
              : 'Go online to start receiving trip requests.'
          }
        >
          <View style={styles.toggleRow}>
            <Text style={type.bodyMedium}>{online ? 'Online' : 'Go online'}</Text>
            <Switch
              value={online}
              onValueChange={setOnline}
              trackColor={{ false: neutral.line, true: brand.green }}
              accessibilityLabel="Go online to accept trips"
            />
          </View>

          {online ? (
            <Pressable
              onPress={() => router.push(`/(driver)/trip/${DEMO_TRIP_ID}`)}
              accessibilityRole="button"
              accessibilityLabel="Incoming trip request from Half Way Tree"
            >
              <Card style={styles.request}>
                <Text style={type.eyebrow}>New request · 4 min away</Text>
                <Text style={type.h3}>Half Way Tree &rarr; New Kingston</Text>
                <Text style={type.money}>{formatCurrency(1050, country)} estimated</Text>
              </Card>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.reportRow}
            onPress={() => router.push('/(modals)/report-hazard')}
            accessibilityRole="button"
          >
            <Ionicons name="warning-outline" size={18} color={neutral.inkSoft} />
            <Text style={styles.reportText}>Report a road condition</Text>
            <Ionicons name="chevron-forward" size={16} color={neutral.inkSoft} />
          </Pressable>
        </TripSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral.paper },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  request: { borderWidth: 1.5, borderColor: brand.navy, gap: space.xs },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 },
  reportText: { ...type.body, flex: 1 },
});
