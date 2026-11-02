/**
 * Dynamic config layered over app.json, for values that must not be committed.
 *
 * Google Maps keys come from the environment: `.env` locally (Expo CLI loads
 * it), EAS environment variables in CI. If `.env` holds them, `.easignore`
 * must not exclude it. Rebuild the dev client after changing a key.
 *
 * A missing key still builds: Android shows Google's blank grid, iOS falls
 * back to Apple Maps. See .env.example.
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
    },
  };
};
