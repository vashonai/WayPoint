import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { brand, neutral, radius, space } from '../theme/tokens';
import { type } from '../theme/typography';

/**
 * Driver document status — Proposal §2.5 and the Phase 3 expiry tracking.
 *
 * Six states, all designed. `expiring` and `rejected` are the two most people
 * forget, and they are exactly the two that cost a driver a shift.
 */
export type DocumentStatus =
  | 'missing'
  | 'pending'
  | 'verified'
  | 'expiring'
  | 'expired'
  | 'rejected';

type Props = {
  label: string;
  status: DocumentStatus;
  /** e.g. "Expires 14 Mar 2027", or the rejection reason. */
  detail?: string;
  onPress?: () => void;
};

export function DocumentCard({ label, status, detail, onPress }: Props) {
  const s = STATUS[status];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${s.label}.${detail ? ` ${detail}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}
    >
      <View style={[styles.iconRing, { borderColor: s.color }]}>
        <Ionicons name={s.icon as never} size={16} color={s.color} />
      </View>

      <View style={styles.body}>
        <Text style={type.bodyMedium}>{label}</Text>
        <Text style={[styles.status, { color: s.color }]}>{s.label}</Text>
        {detail ? <Text style={type.caption}>{detail}</Text> : null}
      </View>

      {onPress ? <Ionicons name="chevron-forward" size={18} color={neutral.inkSoft} /> : null}
    </Pressable>
  );
}

const STATUS: Record<DocumentStatus, { label: string; color: string; icon: string }> = {
  missing: { label: 'Not submitted', color: neutral.inkSoft, icon: 'add-circle-outline' },
  pending: { label: 'Under review', color: brand.navy, icon: 'time-outline' },
  verified: { label: 'Verified', color: brand.green, icon: 'shield-checkmark' },
  // Gold as an ICON colour is correct here; it is never used as text on light.
  expiring: { label: 'Expiring soon', color: '#8A6106', icon: 'alert-circle-outline' },
  expired: { label: 'Expired', color: brand.coral, icon: 'close-circle-outline' },
  rejected: { label: 'Needs attention', color: brand.coral, icon: 'refresh-circle-outline' },
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: neutral.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: neutral.line,
    padding: space.lg,
  },
  pressed: { opacity: 0.7 },
  iconRing: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: neutral.surface,
  },
  body: { flex: 1, gap: 1 },
  status: { ...type.captionStrong, letterSpacing: 0.2 },
});
