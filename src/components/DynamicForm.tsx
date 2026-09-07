import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { DocumentSpec, FieldSpec } from '../features/country/types';
import { brand, neutral, radius, space, HIT_SLOP_MIN } from '../theme/tokens';
import { type } from '../theme/typography';
import { Button } from './Button';

export type FormValues = Record<string, string>;

/**
 * Renders a document capture form from a DocumentSpec.
 *
 * This is the mechanism that makes Proposal §2.8 real. There is one screen for
 * every driver document in every market — `(onboarding)/documents/[slug]` —
 * and adding Trinidad & Tobago in Phase 4 is a config row rather than a pull
 * request. If a market-specific screen ever gets written by hand, the
 * expansion promise is already broken.
 *
 * Validation is derived from the same `fields` array, so a required field
 * cannot drift out of sync with its own form.
 */
export function DynamicForm({
  spec,
  onSubmit,
  submitting = false,
}: {
  spec: DocumentSpec;
  onSubmit: (values: FormValues) => void;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<FormValues>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => validate(spec.fields, values), [spec.fields, values]);
  const isValid = Object.keys(errors).length === 0;

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));
  const touch = (name: string) => setTouched((t) => ({ ...t, [name]: true }));

  const handleSubmit = () => {
    setTouched(Object.fromEntries(spec.fields.map((f) => [f.name, true])));
    if (isValid) onSubmit(values);
  };

  return (
    <View style={styles.form}>
      <View style={styles.header}>
        <Text style={type.h2}>{spec.label}</Text>
        <Text style={type.caption}>{spec.helpText}</Text>
      </View>

      {spec.fields.map((field) => {
        const error = touched[field.name] ? errors[field.name] : undefined;
        return (
          <Field
            key={field.name}
            field={field}
            value={values[field.name] ?? ''}
            error={error}
            onChange={(v) => set(field.name, v)}
            onBlur={() => touch(field.name)}
          />
        );
      })}

      <Button
        label={submitting ? 'Submitting…' : 'Submit document'}
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        testID="dynamic-form-submit"
      />
    </View>
  );
}

function Field({
  field,
  value,
  error,
  onChange,
  onBlur,
}: {
  field: FieldSpec;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const labelNode = (
    <Text style={styles.label}>
      {field.label}
      {field.required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );

  if (field.kind === 'photo') {
    return (
      <View style={styles.field}>
        {labelNode}
        <Pressable
          testID={`field-${field.name}`}
          onPress={() => {
            // Frontend scaffold: the camera flow lands with EvidenceCapture.
            onChange(value ? '' : `captured://${field.name}`);
            onBlur();
          }}
          accessibilityRole="button"
          accessibilityLabel={`${field.label}. ${value ? 'Photo captured' : 'No photo yet'}.`}
          style={[styles.photoBox, value ? styles.photoBoxFilled : null]}
        >
          <Ionicons
            name={value ? 'checkmark-circle' : 'camera-outline'}
            size={26}
            color={value ? brand.green : neutral.inkSoft}
          />
          <Text style={styles.photoText}>{value ? 'Photo added — tap to retake' : 'Take photo'}</Text>
        </Pressable>
        {field.hint ? <Text style={type.caption}>{field.hint}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  if (field.kind === 'select') {
    return (
      <View style={styles.field}>
        {labelNode}
        <View style={styles.options}>
          {field.options.map((opt) => {
            const selected = value === opt.value;
            return (
              <Pressable
                key={opt.value}
                testID={`field-${field.name}-${opt.value}`}
                onPress={() => {
                  onChange(opt.value);
                  onBlur();
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      {labelNode}
      <TextInput
        testID={`field-${field.name}`}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={field.kind === 'date' ? 'YYYY-MM-DD' : field.placeholder}
        placeholderTextColor={neutral.inkSoft}
        maxLength={field.kind === 'text' ? field.maxLength : 10}
        keyboardType={field.kind === 'date' ? 'numbers-and-punctuation' : 'default'}
        accessibilityLabel={field.label}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/**
 * Derives validation from the spec itself.
 *
 * Errors say what is wrong AND how to fix it — no apologies, no vagueness.
 */
export function validate(fields: FieldSpec[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const raw = (values[field.name] ?? '').trim();

    if (field.required && raw.length === 0) {
      errors[field.name] =
        field.kind === 'photo' ? 'Add a photo to continue.' : `Enter your ${field.label.toLowerCase()}.`;
      continue;
    }

    if (raw.length === 0) continue;

    if (field.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      errors[field.name] = 'Use the format YYYY-MM-DD, for example 2027-03-14.';
    }

    if (field.kind === 'select' && !field.options.some((o) => o.value === raw)) {
      errors[field.name] = 'Choose one of the options above.';
    }
  }

  return errors;
}

const styles = StyleSheet.create({
  form: { gap: space.xl },
  header: { gap: space.xs },
  field: { gap: space.sm },
  label: { ...type.captionStrong, color: neutral.charcoal, fontSize: 13 },
  required: { color: brand.coral },
  input: {
    ...type.body,
    minHeight: HIT_SLOP_MIN,
    borderWidth: 1.5,
    borderColor: neutral.line,
    borderRadius: radius.control,
    backgroundColor: neutral.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  inputError: { borderColor: brand.coral },
  error: { ...type.caption, color: brand.coral },
  photoBox: {
    minHeight: 96,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: neutral.line,
    borderRadius: radius.control,
    backgroundColor: neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  photoBoxFilled: { borderStyle: 'solid', borderColor: brand.green, backgroundColor: '#F2F8F6' },
  photoText: { ...type.caption },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    minHeight: HIT_SLOP_MIN,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: neutral.line,
    borderRadius: radius.control,
    backgroundColor: neutral.surface,
    paddingHorizontal: space.lg,
  },
  optionSelected: { borderColor: brand.navy, backgroundColor: brand.navy },
  optionText: { ...type.bodyMedium, fontSize: 14 },
  optionTextSelected: { color: neutral.surface },
});
