import { ConfigPlugin } from '@expo/config-plugins';
import { IterablePluginProps } from './index';

/**
 * Disables iOS autolinking for @iterable/react-native-sdk.
 *
 * This prevents duplicate Podfile entries since we manually inject
 * the Iterable pods with custom linkage configuration.
 */
export const withIterableAutolinkingDisable: ConfigPlugin<IterablePluginProps> = (
  config,
  _props
) => {
  return disableAutolinking(config);
};

/**
 * Modifies the Expo config to exclude @iterable/react-native-sdk from
 * iOS autolinking.
 *
 * Note: autolinking is not in the base ExpoConfig type but is supported at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function disableAutolinking<T>(config: T): T {
  // Cast to any for dynamic property access (autolinking not in ExpoConfig types)
  const cfg = config as any;

  // Initialize autolinking config if not present
  cfg.autolinking = cfg.autolinking ?? {};
  cfg.autolinking.ios = cfg.autolinking.ios ?? {};
  cfg.autolinking.ios.exclude = cfg.autolinking.ios.exclude ?? [];

  const sdkPackageName = '@iterable/react-native-sdk';

  // Only add if not already excluded (idempotency)
  if (!cfg.autolinking.ios.exclude.includes(sdkPackageName)) {
    cfg.autolinking.ios.exclude.push(sdkPackageName);
  }

  return config;
}
