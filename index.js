/**
 * App entry.
 *
 * The background location task must be defined before anything else runs:
 * when the OS relaunches the app headless to hand over locations, no screen
 * mounts, so a task defined inside the router tree would never be found.
 */
import './src/features/tracking/backgroundTask';
import 'expo-router/entry';
