import { ConfigPlugin, createRunOncePlugin, withPlugins } from '@expo/config-plugins';
import { withIterableAutolinkingDisable } from './withIterableAutolinking';
import { withIterablePodfile } from './withIterablePodfile';

const pkg = require('../../package.json');

/**
 * Expo Config Plugin for Iterable React Native SDK
 *
 * This plugin handles the complex iOS build configuration required for
 * Iterable SDK integration with Expo managed workflows:
 *
 * 1. Disables iOS autolinking for @iterable/react-native-sdk to prevent
 *    duplicate Podfile entries
 *
 * 2. Adds dynamic framework linkage for Iterable pods while keeping
 *    React Native statically linked (Expo requirement)
 *
 * 3. Optionally adds IterableNotifications target for push notification
 *    service extension
 */

export interface IterablePluginProps {
  /**
   * Whether to add the IterableNotifications target for push notification
   * service extension. Defaults to false.
   */
  enableNotificationExtension?: boolean;

  /**
   * Custom name for the notification extension target.
   * Defaults to 'IterableNotifications'.
   */
  notificationExtensionTargetName?: string;
}

const withIterable: ConfigPlugin<IterablePluginProps | void> = (config, props) => {
  const pluginProps: IterablePluginProps = props ?? {};

  return withPlugins(config, [
    [withIterableAutolinkingDisable, pluginProps],
    [withIterablePodfile, pluginProps],
  ]);
};

export default createRunOncePlugin(withIterable, pkg.name, pkg.version);

export { withIterableAutolinkingDisable } from './withIterableAutolinking';
export { withIterablePodfile } from './withIterablePodfile';
