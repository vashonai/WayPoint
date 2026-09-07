import { Text } from 'react-native';

import { DocumentCard, Screen } from '../../src/components';
import type { DocumentStatus } from '../../src/components';
import { useCountry } from '../../src/features/country/CountryProvider';
import { type } from '../../src/theme/typography';

/** Document expiry tracking and renewal reminders. Proposal Phase 3. */
export default function DriverDocuments() {
  const country = useCountry();

  const statuses: Record<string, DocumentStatus> = {
    'government-id': 'verified',
    'drivers-licence': 'verified',
    'drivers-permit': 'verified',
    'police-record': 'verified',
    'certificate-of-character': 'verified',
    insurance: 'expiring',
  };

  return (
    <Screen scroll>
      <Text style={type.h1}>Documents</Text>
      <Text style={type.caption}>
        We remind you before anything expires, so a lapsed document never costs you a shift.
      </Text>

      {country.driverDocuments.map((doc) => {
        const status = statuses[doc.slug] ?? 'missing';
        return (
          <DocumentCard
            key={doc.slug}
            label={doc.label}
            status={status}
            detail={
              status === 'expiring'
                ? 'Expires in 21 days. Renew to keep driving.'
                : status === 'verified'
                  ? 'Valid'
                  : undefined
            }
            onPress={() => {}}
          />
        );
      })}
    </Screen>
  );
}
