/** Metro resolves font imports to an asset id, which expo-font's useFonts accepts. */
declare module '*.ttf' {
  const asset: number;
  export default asset;
}
