import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';
import { IterablePluginProps } from './index';

// Marker comment for idempotency checks
const ITERABLE_PODS_MARKER = '# Iterable SDK (Expo Managed Workflow)';

/**
 * Modifies the Podfile to add Iterable SDK pods with dynamic linkage.
 *
 * This plugin:
 * 1. Ensures use_frameworks! :linkage => :static is present (Expo requirement)
 * 2. Injects Iterable pods with :linkage => :dynamic override
 * 3. Optionally adds IterableNotifications target for push notification extension
 */
export const withIterablePodfile: ConfigPlugin<IterablePluginProps> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        throw new Error(`Podfile not found at ${podfilePath}`);
      }

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // Apply transformations
      contents = ensureStaticLinkage(contents);
      contents = injectIterablePods(contents);

      if (props?.enableNotificationExtension) {
        const targetName = props.notificationExtensionTargetName ?? 'IterableNotifications';
        contents = injectNotificationExtensionTarget(contents, targetName);
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

/**
 * Ensures the Podfile has use_frameworks! :linkage => :static.
 * This is required for Expo compatibility.
 */
export function ensureStaticLinkage(contents: string): string {
  // Check if static linkage is already configured
  if (contents.includes('use_frameworks! :linkage => :static')) {
    return contents;
  }

  // Replace dynamic linkage with static if present
  if (contents.includes('use_frameworks! :linkage => :dynamic')) {
    return contents.replace(
      /use_frameworks!\s*:linkage\s*=>\s*:dynamic/g,
      'use_frameworks! :linkage => :static'
    );
  }

  // Replace bare use_frameworks! with static linkage
  if (contents.match(/use_frameworks!\s*(?!\s*:linkage)/)) {
    return contents.replace(/use_frameworks!\s*(?!\s*:linkage)/, 'use_frameworks! :linkage => :static');
  }

  return contents;
}

/**
 * Injects Iterable SDK pods with dynamic linkage into the main target.
 * Uses marker comments for idempotency.
 */
export function injectIterablePods(contents: string): string {
  // Check if already injected (idempotency)
  if (contents.includes(ITERABLE_PODS_MARKER)) {
    return contents;
  }

  const iterablePods = `
  ${ITERABLE_PODS_MARKER}
  pod 'Iterable-React-Native-SDK', :path => '../node_modules/@iterable/react-native-sdk', :linkage => :dynamic
  pod 'Iterable-iOS-SDK', :linkage => :dynamic
`;

  // Try to inject after use_expo_modules! first (preferred location for Expo apps)
  if (contents.includes('use_expo_modules!')) {
    return contents.replace(
      /(use_expo_modules![^\n]*\n)/,
      `$1${iterablePods}`
    );
  }

  // Fallback: inject after use_react_native!
  if (contents.includes('use_react_native!')) {
    // Find the closing of use_react_native! block (handles multi-line)
    const useReactNativeRegex = /(use_react_native!\s*\([^)]*\))/s;
    const match = contents.match(useReactNativeRegex);

    if (match) {
      return contents.replace(useReactNativeRegex, `$1\n${iterablePods}`);
    }
  }

  // Last fallback: inject after use_native_modules!
  if (contents.includes('use_native_modules!')) {
    return contents.replace(
      /(use_native_modules![^\n]*\n)/,
      `$1${iterablePods}`
    );
  }

  // If no known markers found, inject at the end of the first target block
  const targetRegex = /(target\s+['"][^'"]+['"]\s+do\s*\n)/;
  if (contents.match(targetRegex)) {
    return contents.replace(targetRegex, `$1${iterablePods}`);
  }

  throw new Error(
    'Could not find a suitable location to inject Iterable pods. ' +
      'Please ensure your Podfile has a valid target block.'
  );
}

/**
 * Injects the IterableNotifications target for push notification service extension.
 */
export function injectNotificationExtensionTarget(contents: string, targetName: string): string {
  const targetMarker = `target '${targetName}'`;

  // Check if already injected (idempotency)
  if (contents.includes(targetMarker)) {
    return contents;
  }

  const notificationTarget = `
target '${targetName}' do
  use_frameworks! :linkage => :dynamic
  pod 'Iterable-iOS-AppExtensions'
end
`;

  // Append to the end of the file
  return contents.trimEnd() + '\n' + notificationTarget;
}
