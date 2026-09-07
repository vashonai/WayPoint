import { useFonts as useExpoFonts } from 'expo-font';

/**
 * Brand typefaces — Brand & Style Guide §3.1.
 *
 * These are SUBPATH imports on purpose. Importing named weights from the
 * package root (`@expo-google-fonts/inter`) makes every weight in the package
 * reachable, and Metro then bundles all eighteen Inter files — roughly 3 MB of
 * fonts nobody asked for. Pulling each face from its own path ships only the
 * six we actually use.
 *
 * If you add a weight here, add it to `fontFamily` in typography.ts too.
 */
import Fraunces_600SemiBold from '@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf';
import Fraunces_700Bold from '@expo-google-fonts/fraunces/700Bold/Fraunces_700Bold.ttf';
import Inter_400Regular from '@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf';
import Inter_500Medium from '@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf';
import Inter_600SemiBold from '@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf';
import Inter_700Bold from '@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf';
import IBMPlexMono_400Regular from '@expo-google-fonts/ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf';
import IBMPlexMono_500Medium from '@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf';

/**
 * The root layout holds the splash screen until this resolves. A flash of
 * system font on the first screen reads as a broken app, and the guide's type
 * scale assumes these faces are present.
 */
export function useBrandFonts() {
  const [loaded, error] = useExpoFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  return { fontsLoaded: loaded, fontError: error };
}
