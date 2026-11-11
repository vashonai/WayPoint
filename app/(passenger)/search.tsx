import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../../src/components';
import { useCountry } from '../../src/features/country';
import {
  fetchPlace,
  locatePickup,
  newSessionToken,
  usePlaceSuggestions,
  type Place,
  type PlaceSuggestion,
} from '../../src/features/maps';
import { useBookingStore } from '../../src/store/booking.store';
import { brand, HIT_SLOP_MIN, neutral, radius, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

type Field = 'pickup' | 'destination';

/**
 * Pickup and destination search — Google Places, limited to the active market.
 *
 * Pickup defaults to where the passenger is standing. This screen is the
 * contextual moment to ask for location: the passenger has just said they
 * want a ride. Refusing is fine — they type a pickup instead.
 */
export default function SearchScreen() {
  const country = useCountry();
  const pickup = useBookingStore((s) => s.pickup);
  const destination = useBookingStore((s) => s.destination);
  const setPickup = useBookingStore((s) => s.setPickup);
  const setDestination = useBookingStore((s) => s.setDestination);

  const [field, setField] = useState<Field>('destination');
  const [text, setText] = useState('');
  const [sessionToken, setSessionToken] = useState(newSessionToken);
  const [locating, setLocating] = useState(pickup === null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (pickup) return;
    let cancelled = false;
    locatePickup()
      .then((place) => {
        if (!cancelled && place) setPickup(place);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLocating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickup, setPickup]);

  const suggestions = usePlaceSuggestions({
    input: text,
    sessionToken,
    country,
    origin: pickup?.coord ?? null,
  });

  const edit = (next: Field) => {
    setField(next);
    setText('');
    setFailed(false);
  };

  /** Fills the active field, then moves on: to the other field, or to the quote once both are set. */
  const commit = (place: Place) => {
    const other = field === 'pickup' ? destination : pickup;
    (field === 'pickup' ? setPickup : setDestination)(place);
    setText('');
    if (other) router.push('/(passenger)/quote');
    else setField(field === 'pickup' ? 'destination' : 'pickup');
  };

  const choose = async (s: PlaceSuggestion) => {
    setResolving(s.placeId);
    setFailed(false);
    try {
      const place = await fetchPlace(s.placeId, sessionToken);
      // The details call ends this billing session; the next search starts another.
      setSessionToken(newSessionToken());
      commit(place);
    } catch {
      setFailed(true);
    } finally {
      setResolving(null);
    }
  };

  const locateMe = async () => {
    setLocating(true);
    const place = await locatePickup().catch(() => null);
    setLocating(false);
    if (place) commit(place);
    else setFailed(true);
  };

  const query = text.trim();

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={brand.navy} />
        </Pressable>
        <Text style={type.h2}>Plan your ride</Text>
      </View>

      <View style={styles.fields}>
        <FieldRow
          kind="pickup"
          active={field === 'pickup'}
          value={pickup}
          placeholder={locating ? 'Finding your location…' : 'Pickup location'}
          text={text}
          onText={setText}
          onActivate={() => edit('pickup')}
        />
        <FieldRow
          kind="destination"
          active={field === 'destination'}
          value={destination}
          placeholder="Where to?"
          text={text}
          onText={setText}
          onActivate={() => edit('destination')}
        />
      </View>

      {failed ? (
        <Text style={styles.notice}>
          {field === 'pickup' && query.length < 2
            ? 'We couldn’t find your location. Type your pickup instead.'
            : 'That didn’t load. Check your connection and try again.'}
        </Text>
      ) : null}

      {query.length < 2 ? (
        field === 'pickup' ? (
          <Pressable
            style={styles.row}
            onPress={locateMe}
            disabled={locating}
            accessibilityRole="button"
          >
            <Ionicons name="locate" size={20} color={brand.navy} />
            <Text style={[type.bodyMedium, styles.rowText]}>Use my current location</Text>
            {locating ? <ActivityIndicator color={brand.navy} /> : null}
          </Pressable>
        ) : (
          <Text style={styles.notice}>Search for a place, street or landmark.</Text>
        )
      ) : suggestions.isError ? (
        <Text style={styles.notice}>
          Search is unavailable right now. Check your connection and try again.
        </Text>
      ) : !suggestions.data ? (
        <ActivityIndicator style={styles.loading} color={brand.navy} />
      ) : (
        <FlatList
          data={suggestions.data}
          keyExtractor={(s) => s.placeId}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.notice}>No matches in {country.name}.</Text>}
          ListFooterComponent={
            suggestions.data.length > 0 ? (
              <Text style={styles.attribution}>Powered by Google</Text>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => choose(item)}
              disabled={resolving !== null}
              accessibilityRole="button"
              accessibilityLabel={`${item.primary}, ${item.secondary}`}
            >
              <Ionicons name="location-outline" size={20} color={neutral.inkSoft} />
              <View style={styles.rowText}>
                <Text style={type.bodyMedium} numberOfLines={1}>
                  {item.primary}
                </Text>
                {item.secondary ? (
                  <Text style={type.caption} numberOfLines={1}>
                    {item.secondary}
                  </Text>
                ) : null}
              </View>
              {resolving === item.placeId ? (
                <ActivityIndicator color={brand.navy} />
              ) : item.distanceMeters !== null ? (
                <Text style={type.caption}>{formatDistance(item.distanceMeters)}</Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function FieldRow({
  kind,
  active,
  value,
  placeholder,
  text,
  onText,
  onActivate,
}: {
  kind: Field;
  active: boolean;
  value: Place | null;
  placeholder: string;
  text: string;
  onText: (t: string) => void;
  onActivate: () => void;
}) {
  const icon =
    kind === 'pickup' ? (
      <Ionicons name="ellipse" size={11} color={brand.green} />
    ) : (
      <Ionicons name="location" size={14} color={brand.gold} />
    );

  if (active) {
    return (
      <View style={[styles.field, styles.fieldActive]}>
        {icon}
        <TextInput
          value={text}
          onChangeText={onText}
          placeholder={value?.name ?? placeholder}
          placeholderTextColor={neutral.inkSoft}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={kind === 'pickup' ? 'Pickup' : 'Destination'}
          style={styles.input}
        />
      </View>
    );
  }

  return (
    <Pressable
      style={styles.field}
      onPress={onActivate}
      accessibilityRole="button"
      accessibilityLabel={`${kind === 'pickup' ? 'Pickup' : 'Destination'}: ${value?.name ?? placeholder}`}
    >
      {icon}
      <View style={styles.rowText}>
        <Text style={value ? type.bodyMedium : styles.placeholder} numberOfLines={1}>
          {value?.name ?? placeholder}
        </Text>
        {value?.address ? (
          <Text style={type.caption} numberOfLines={1}>
            {value.address}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

const styles = StyleSheet.create({
  screen: { gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: {
    width: HIT_SLOP_MIN,
    height: HIT_SLOP_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -space.sm,
  },
  fields: { gap: space.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: neutral.line,
    borderRadius: radius.control,
    backgroundColor: neutral.surface,
    paddingHorizontal: space.lg,
  },
  fieldActive: { borderColor: brand.navy },
  input: { ...type.body, flex: 1, minHeight: 50 },
  placeholder: { ...type.body, color: neutral.inkSoft },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: neutral.line,
  },
  rowText: { flex: 1, gap: 2 },
  notice: { ...type.body, color: neutral.inkSoft, paddingVertical: space.md },
  loading: { marginTop: space.xl },
  attribution: { ...type.caption, textAlign: 'right', paddingVertical: space.md },
});
