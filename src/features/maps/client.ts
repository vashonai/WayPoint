import Constants from 'expo-constants';
import { Platform } from 'react-native';

type GoogleMapsExtra = {
  androidKey: string | null;
  iosKey: string | null;
  androidCertSha1: string | null;
};

const TIMEOUT_MS = 10_000;

function googleExtra(): GoogleMapsExtra | undefined {
  return Constants.expoConfig?.extra?.googleMaps as GoogleMapsExtra | undefined;
}

/** The platform's Google Maps Platform key, from app.config.js. Null when unset. */
export function mapsApiKey(): string | null {
  const g = googleExtra();
  return (Platform.OS === 'ios' ? g?.iosKey : g?.androidKey) || null;
}

export class MapsApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Google's status string (e.g. PERMISSION_DENIED), or ours: NO_KEY, NO_ROUTE. */
    readonly reason?: string,
  ) {
    super(message);
    this.name = 'MapsApiError';
  }
}

/**
 * One authenticated call to a Google Maps Platform web service.
 *
 * Sends the app-identity headers Google checks when a key is restricted to an
 * Android or iOS app. Without them, restricting the key — which it must be,
 * since it ships in the binary — would break every Routes and Places call.
 */
export async function googleRequest<T>(
  url: string,
  {
    method = 'POST',
    body,
    fieldMask,
    signal,
  }: { method?: 'GET' | 'POST'; body?: unknown; fieldMask?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const key = mapsApiKey();
  if (!key) throw new MapsApiError(0, 'Google Maps key is not configured', 'NO_KEY');

  const headers: Record<string, string> = { 'X-Goog-Api-Key': key };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (fieldMask) headers['X-Goog-FieldMask'] = fieldMask;

  if (Platform.OS === 'ios') {
    const bundleId = Constants.expoConfig?.ios?.bundleIdentifier;
    if (bundleId) headers['X-Ios-Bundle-Identifier'] = bundleId;
  } else if (Platform.OS === 'android') {
    const pkg = Constants.expoConfig?.android?.package;
    if (pkg) headers['X-Android-Package'] = pkg;
    const cert = googleExtra()?.androidCertSha1;
    if (cert) headers['X-Android-Cert'] = cert.replace(/:/g, '').toUpperCase();
  }

  // A request the caller abandons (a newer keystroke, a closed screen) or that
  // hangs on a weak signal is cancelled rather than left to resolve late.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = (json as { error?: { message?: string; status?: string } }).error;
      throw new MapsApiError(res.status, err?.message ?? `HTTP ${res.status}`, err?.status);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
