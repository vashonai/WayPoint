import { CountryConfig } from './types';

/**
 * Jamaica — the launch market (Proposal §2.5, §2.8).
 *
 * In production these rows come from the server so a market can be switched on
 * without shipping a binary. They are inlined here because this is the frontend
 * scaffold and there is no backend yet; the shape is identical either way.
 */
export const JM: CountryConfig = {
  code: 'JM',
  name: 'Jamaica',
  currency: { code: 'JMD', symbol: 'J$', decimals: 0 },
  emergency: { police: '119', ambulance: '110', label: 'Jamaica Constabulary Force' },
  driverDocuments: [
    {
      slug: 'government-id',
      label: 'Government-issued ID',
      helpText: 'A valid national ID, passport, or driver’s licence showing your full name and date of birth.',
      expires: true,
      renewalNoticeDays: 60,
      fields: [
        { kind: 'text', name: 'idNumber', label: 'ID number', required: true, maxLength: 32 },
        { kind: 'date', name: 'expiryDate', label: 'Expiry date', required: true },
        { kind: 'photo', name: 'front', label: 'Front of ID', required: true },
        { kind: 'photo', name: 'back', label: 'Back of ID', required: true },
      ],
    },
    {
      slug: 'drivers-licence',
      label: 'Driver’s licence',
      helpText: 'Your current Jamaican driver’s licence. General class or higher.',
      expires: true,
      renewalNoticeDays: 45,
      fields: [
        { kind: 'text', name: 'licenceNumber', label: 'Licence number', required: true },
        {
          kind: 'select',
          name: 'class',
          label: 'Licence class',
          required: true,
          options: [
            { value: 'general', label: 'General' },
            { value: 'public_passenger', label: 'Public Passenger Vehicle' },
          ],
        },
        { kind: 'date', name: 'expiryDate', label: 'Expiry date', required: true },
        { kind: 'photo', name: 'front', label: 'Photo of licence', required: true },
      ],
    },
    {
      /**
       * Proposal §2.5 — Jamaica requires a valid police record at onboarding.
       * A deliberately higher barrier to entry, in support of the Verified
       * Safety promise. This document exists in the JM config only.
       */
      slug: 'police-record',
      label: 'Police Record',
      helpText:
        'A valid police record from the Jamaica Constabulary Force, issued within the last 6 months. Required before you can accept trips.',
      expires: true,
      renewalNoticeDays: 90,
      fields: [
        { kind: 'date', name: 'issuedDate', label: 'Date issued', required: true },
        { kind: 'photo', name: 'document', label: 'Photo of police record', required: true, hint: 'All four corners must be visible and the text readable.' },
      ],
    },
    {
      slug: 'insurance',
      label: 'Vehicle insurance',
      helpText: 'Current certificate of insurance covering the vehicle you will drive.',
      expires: true,
      renewalNoticeDays: 30,
      fields: [
        { kind: 'text', name: 'policyNumber', label: 'Policy number', required: true },
        { kind: 'text', name: 'insurer', label: 'Insurer', required: true },
        { kind: 'date', name: 'expiryDate', label: 'Expiry date', required: true },
        { kind: 'photo', name: 'certificate', label: 'Photo of certificate', required: true },
      ],
    },
  ],
  vehicleRules: {
    maxAgeYears: 12,
    requiredPhotos: ['front', 'rear', 'left', 'right', 'interior', 'plate'],
  },
  hazardLabels: {
    pothole: 'Pothole',
    construction: 'Construction',
    accident: 'Accident',
    roadblock: 'Roadblock',
    flooding: 'Flooding',
    fallenTree: 'Fallen Tree',
    brokenDown: 'Broken-Down Vehicle',
    closure: 'Road Closure',
    /**
     * Proposal §2.2 — framed strictly as road awareness, never as evasion
     * guidance. This wording is regulator-reviewed. Do not edit it in code.
     */
    enforcement: 'Traffic Enforcement Reported',
  },
  payments: ['cash', 'card'],
  locale: 'en-JM',
  // Kingston.
  map: { center: [-76.7936, 18.0179], searchRadiusMeters: 50_000 },
};

/**
 * Trinidad & Tobago — a second market, present from Phase 1 as a TEST FIXTURE.
 *
 * Its only job right now is to fail the build the moment somebody hardcodes
 * "J$", "119", or the Jamaican document set. A suite that only exercises JM
 * will not catch those, and Phase 4 is the worst time to find them.
 */
export const TT: CountryConfig = {
  code: 'TT',
  name: 'Trinidad & Tobago',
  currency: { code: 'TTD', symbol: 'TT$', decimals: 2 },
  emergency: { police: '999', ambulance: '811', label: 'Trinidad and Tobago Police Service' },
  driverDocuments: [
    {
      slug: 'government-id',
      label: 'National ID',
      helpText: 'A valid Trinidad and Tobago national identification card.',
      expires: true,
      renewalNoticeDays: 60,
      fields: [
        { kind: 'text', name: 'idNumber', label: 'ID number', required: true },
        { kind: 'date', name: 'expiryDate', label: 'Expiry date', required: true },
        { kind: 'photo', name: 'front', label: 'Front of ID', required: true },
      ],
    },
    {
      slug: 'drivers-permit',
      label: 'Driver’s Permit',
      helpText: 'Your current Trinidad and Tobago driver’s permit.',
      expires: true,
      renewalNoticeDays: 45,
      fields: [
        { kind: 'text', name: 'permitNumber', label: 'Permit number', required: true },
        { kind: 'date', name: 'expiryDate', label: 'Expiry date', required: true },
        { kind: 'photo', name: 'front', label: 'Photo of permit', required: true },
      ],
    },
    {
      slug: 'certificate-of-character',
      label: 'Certificate of Character',
      helpText: 'Issued by the Trinidad and Tobago Police Service within the last 6 months.',
      expires: true,
      renewalNoticeDays: 90,
      fields: [
        { kind: 'date', name: 'issuedDate', label: 'Date issued', required: true },
        { kind: 'photo', name: 'document', label: 'Photo of certificate', required: true },
      ],
    },
  ],
  vehicleRules: {
    maxAgeYears: 10,
    requiredPhotos: ['front', 'rear', 'plate'],
  },
  hazardLabels: {
    pothole: 'Pothole',
    construction: 'Road Works',
    accident: 'Accident',
    roadblock: 'Roadblock',
    flooding: 'Flooding',
    fallenTree: 'Fallen Tree',
    brokenDown: 'Broken-Down Vehicle',
    closure: 'Road Closure',
    enforcement: 'Police Activity Reported',
  },
  payments: ['cash', 'card', 'mobile_money'],
  locale: 'en-TT',
  // Port of Spain.
  map: { center: [-61.519, 10.6549], searchRadiusMeters: 50_000 },
};

export const COUNTRY_CONFIGS = { JM, TT } as const;

export const DEFAULT_COUNTRY = 'JM' as const;
