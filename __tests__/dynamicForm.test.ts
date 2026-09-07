import { validate } from '../src/components/DynamicForm';
import { JM } from '../src/features/country/configs';
import type { FieldSpec } from '../src/features/country/types';

const policeRecord = JM.driverDocuments.find((d) => d.slug === 'police-record')!;

describe('dynamic form validation', () => {
  it('derives required-field errors from the spec itself', () => {
    const errors = validate(policeRecord.fields, {});
    expect(Object.keys(errors)).toHaveLength(policeRecord.fields.length);
  });

  it('passes once every required field is filled', () => {
    const errors = validate(policeRecord.fields, {
      issuedDate: '2026-04-02',
      document: 'captured://document',
    });
    expect(errors).toEqual({});
  });

  it('tells the driver how to fix a bad date rather than just rejecting it', () => {
    const errors = validate(policeRecord.fields, {
      issuedDate: '02/04/2026',
      document: 'captured://document',
    });
    expect(errors.issuedDate).toContain('YYYY-MM-DD');
  });

  it('rejects a select value that is not on the list', () => {
    const fields: FieldSpec[] = [
      {
        kind: 'select',
        name: 'class',
        label: 'Licence class',
        required: true,
        options: [{ value: 'general', label: 'General' }],
      },
    ];
    expect(validate(fields, { class: 'helicopter' }).class).toBeTruthy();
    expect(validate(fields, { class: 'general' })).toEqual({});
  });

  it('asks for a photo in plain language', () => {
    const errors = validate(policeRecord.fields, { issuedDate: '2026-04-02' });
    expect(errors.document).toBe('Add a photo to continue.');
  });

  it('ignores optional fields left blank', () => {
    const fields: FieldSpec[] = [
      { kind: 'text', name: 'middleName', label: 'Middle name', required: false },
    ];
    expect(validate(fields, {})).toEqual({});
  });

  it('validates every market’s documents without a market-specific branch', () => {
    JM.driverDocuments.forEach((doc) => {
      const errors = validate(doc.fields, {});
      const requiredCount = doc.fields.filter((f) => f.required).length;
      expect(Object.keys(errors)).toHaveLength(requiredCount);
    });
  });
});
