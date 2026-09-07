import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, Screen } from '../../../src/components';
import { brand, neutral, radius, space } from '../../../src/theme/tokens';
import { type } from '../../../src/theme/typography';

/**
 * In-app deviation evidence — Proposal 2.3.
 *
 * Drivers submit evidence directly in the app rather than contacting support
 * with photos for every deviation, which does not scale. GPS and timestamp are
 * attached automatically.
 *
 * Two things worth keeping in mind when this is wired to a backend:
 *
 *   - The stopped-vehicle gate is a safety requirement, not a form nicety.
 *   - Client-attached GPS and timestamps are ATTESTATIONS, not proof. The
 *     server must stamp its own receipt time and cross-check the claimed
 *     position against the trip trace. The client should never be the only
 *     witness to its own evidence.
 */
export default function EvidenceCapture() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [photo, setPhoto] = useState(false);
  const [stopped, setStopped] = useState(false);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={type.eyebrow}>Trip {tripId}</Text>
        <Text style={type.h1}>Add evidence</Text>
        <Text style={type.body}>
          A photo helps us confirm the road condition quickly. You can also do this after the trip
          ends.
        </Text>
      </View>

      <Pressable
        style={[styles.photoBox, photo ? styles.photoBoxFilled : null]}
        onPress={() => setPhoto((p) => !p)}
        accessibilityRole="button"
        accessibilityLabel={photo ? 'Photo captured, tap to retake' : 'Take photo'}
      >
        <Ionicons
          name={photo ? 'checkmark-circle' : 'camera-outline'}
          size={30}
          color={photo ? brand.green : neutral.inkSoft}
        />
        <Text style={type.caption}>{photo ? 'Photo captured' : 'Take photo'}</Text>
      </Pressable>

      <Card>
        {[
          'GPS location attached automatically',
          'Timestamp attached automatically',
          'Reviewed by a person only if a fare is disputed',
        ].map((line) => (
          <View key={line} style={styles.autoItem}>
            <Ionicons name="ellipse" size={7} color={brand.navy} />
            <Text style={type.caption}>{line}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.gate}>
        <View style={styles.gateRow}>
          <View style={styles.gateBody}>
            <Text style={type.bodyMedium}>My vehicle is safely stopped</Text>
            <Text style={type.caption}>Never take photos while driving.</Text>
          </View>
          <Switch
            value={stopped}
            onValueChange={setStopped}
            trackColor={{ false: neutral.line, true: brand.green }}
            accessibilityLabel="Confirm my vehicle is safely stopped"
          />
        </View>
      </Card>

      <Button label="Submit evidence" onPress={() => router.back()} disabled={!stopped} />
      <Button label="Do this after the trip" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.xs },
  photoBox: {
    minHeight: 140,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: neutral.line,
    borderRadius: radius.card,
    backgroundColor: neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  photoBoxFilled: { borderStyle: 'solid', borderColor: brand.green, backgroundColor: '#F2F8F6' },
  autoItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  gate: { borderWidth: 1.5, borderColor: neutral.line },
  gateRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  gateBody: { flex: 1, gap: 2 },
});
