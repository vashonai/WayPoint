import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { PresentedFare } from '../features/fare/presentFare';
import { brand, neutral, radius, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Card } from './Card';

/**
 * The final-fare receipt — Proposal §2.4.
 *
 * Every figure here was computed by the server. This component formats and
 * explains; it never derives an amount. When the fare exceeds the estimate,
 * the explanation block is mandatory: "Passengers are never surprised without
 * an explanation."
 */
export function FareBreakdown({ fare }: { fare: PresentedFare }) {
  return (
    <Card>
      <Text style={type.eyebrow}>Final fare</Text>
      <Text style={[type.moneyLarge, styles.total]}>{fare.total}</Text>

      <View style={styles.estimateRow}>
        <Text style={type.caption}>Estimated {fare.estimateRange}</Text>
        {fare.withinEstimate ? (
          <View style={styles.withinPill}>
            <Ionicons name="checkmark-circle" size={13} color={brand.green} />
            <Text style={styles.withinText}>Within estimate</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      {fare.lines.map((line, i) => (
        <View key={`${line.kind}-${i}`} style={styles.line}>
          <View style={styles.lineLeft}>
            <Text style={type.body}>{line.label}</Text>
            {line.reason ? <Text style={styles.reason}>{line.reason}</Text> : null}
            {line.verified ? (
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={11} color={brand.green} />
                <Text style={styles.verifiedText}>Verified by GPS &amp; community reports</Text>
              </View>
            ) : null}
          </View>
          <Text style={type.money}>{line.amount}</Text>
        </View>
      ))}

      {fare.explanation ? (
        <View style={styles.explanation}>
          <Ionicons name="information-circle" size={16} color={brand.navy} />
          <Text style={styles.explanationText}>{fare.explanation}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  total: { marginTop: space.xs },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
    gap: space.sm,
  },
  withinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: '#E3F0EC',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  withinText: { ...type.caption, color: brand.green, fontSize: 11 },
  divider: {
    height: 1,
    backgroundColor: neutral.line,
    marginVertical: space.lg,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.lg,
    paddingVertical: space.sm,
  },
  lineLeft: { flex: 1, gap: 2 },
  reason: { ...type.caption, fontSize: 11.5 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 2 },
  verifiedText: { ...type.caption, fontSize: 10.5, color: brand.green },
  explanation: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: '#EDF1F6',
    borderRadius: radius.control,
    padding: space.md,
    marginTop: space.md,
  },
  explanationText: { ...type.caption, flex: 1, color: neutral.charcoal, lineHeight: 18 },
});
