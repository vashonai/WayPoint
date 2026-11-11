/**
 * Dynamic config layered over app.json, for values that must not be committed.
 *
 * Google Maps keys come from the environment: `.env` locally (Expo CLI loads
 * it), EAS environment variables in CI. If `.env` holds them, `.easignore`
 * must not exclude it. Rebuild the dev client after changing a key.
 *
 * The same key serves the native map SDK and the web services the app calls
 * (Routes, Places). It ships inside the binary either way, so it MUST be
 * restricted in Google Cloud — see .env.example.
 *
 * A missing key still builds: Android shows Google's blank grid, iOS falls
 * back to Apple Maps, and routing falls back to fixtures.
 */
module.exports = ({ config }) => {
  const androidKey = process.env.GMAPS_ANDROID_KEY;
  const iosKey = process.env.GMAPS_IOS_KEY;

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', { androidGoogleMapsApiKey: androidKey, iosGoogleMapsApiKey: iosKey }],
    ],
    extra: {
      ...config.extra,
      // LiveMap only asks for the Google provider on iOS when the SDK is in the build.
      iosGoogleMaps: Boolean(iosKey),
      googleMaps: {
        androidKey: androidKey ?? null,
        iosKey: iosKey ?? null,
        // Sent as X-Android-Cert so an Android-restricted key also works for
        // Routes and Places. The SHA-1 from expo.dev → Credentials.
        androidCertSha1: process.env.GMAPS_ANDROID_CERT_SHA1 ?? null,
      },
    },
  };
};
