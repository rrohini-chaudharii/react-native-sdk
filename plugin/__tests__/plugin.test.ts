import { disableAutolinking } from '../src/withIterableAutolinking';
import {
  ensureStaticLinkage,
  injectIterablePods,
  injectNotificationExtensionTarget,
} from '../src/withIterablePodfile';

// Config type for testing
interface TestConfig {
  name: string;
  slug: string;
  autolinking?: {
    ios?: {
      exclude?: string[];
    };
  };
}

describe('withIterableAutolinking', () => {
  describe('disableAutolinking', () => {
    it('should add @iterable/react-native-sdk to autolinking exclude list', () => {
      const config: TestConfig = { name: 'test', slug: 'test' };
      const result = disableAutolinking(config);

      expect(result.autolinking?.ios?.exclude).toContain('@iterable/react-native-sdk');
    });

    it('should preserve existing exclude entries', () => {
      const config: TestConfig = {
        name: 'test',
        slug: 'test',
        autolinking: {
          ios: {
            exclude: ['some-other-package'],
          },
        },
      };
      const result = disableAutolinking(config);

      expect(result.autolinking?.ios?.exclude).toContain('some-other-package');
      expect(result.autolinking?.ios?.exclude).toContain('@iterable/react-native-sdk');
    });

    it('should be idempotent - not duplicate entries', () => {
      const config: TestConfig = { name: 'test', slug: 'test' };

      // Run twice
      let result = disableAutolinking(config);
      result = disableAutolinking(result);

      const excludeList = result.autolinking?.ios?.exclude ?? [];
      const iterableEntries = excludeList.filter((e) => e === '@iterable/react-native-sdk');
      expect(iterableEntries.length).toBe(1);
    });
  });
});

describe('withIterablePodfile', () => {
  describe('ensureStaticLinkage', () => {
    it('should keep existing static linkage unchanged', () => {
      const podfile = `
platform :ios, '13.0'
use_frameworks! :linkage => :static

target 'MyApp' do
  use_native_modules!
end
`;
      const result = ensureStaticLinkage(podfile);
      expect(result).toBe(podfile);
    });

    it('should convert dynamic linkage to static', () => {
      const podfile = `
platform :ios, '13.0'
use_frameworks! :linkage => :dynamic

target 'MyApp' do
  use_native_modules!
end
`;
      const result = ensureStaticLinkage(podfile);
      expect(result).toContain('use_frameworks! :linkage => :static');
      expect(result).not.toContain(':dynamic');
    });

    it('should convert bare use_frameworks! to static linkage', () => {
      const podfile = `
platform :ios, '13.0'
use_frameworks!

target 'MyApp' do
  use_native_modules!
end
`;
      const result = ensureStaticLinkage(podfile);
      expect(result).toContain('use_frameworks! :linkage => :static');
    });
  });

  describe('injectIterablePods', () => {
    const baseExpoPodfile = `
platform :ios, '13.0'
use_frameworks! :linkage => :static

target 'MyApp' do
  use_native_modules!
  use_expo_modules!
  use_react_native!(
    :path => config[:reactNativePath]
  )
end
`;

    it('should inject Iterable pods after use_expo_modules!', () => {
      const result = injectIterablePods(baseExpoPodfile);

      expect(result).toContain("pod 'Iterable-React-Native-SDK'");
      expect(result).toContain("pod 'Iterable-iOS-SDK'");
      expect(result).toContain(':linkage => :dynamic');
      expect(result).toContain('# Iterable SDK (Expo Managed Workflow)');
    });

    it('should inject after use_react_native! if use_expo_modules! is not present', () => {
      const podfile = `
platform :ios, '13.0'
use_frameworks! :linkage => :static

target 'MyApp' do
  use_native_modules!
  use_react_native!(
    :path => config[:reactNativePath]
  )
end
`;
      const result = injectIterablePods(podfile);

      expect(result).toContain("pod 'Iterable-React-Native-SDK'");
      expect(result).toContain("pod 'Iterable-iOS-SDK'");
    });

    it('should inject after use_native_modules! as last fallback', () => {
      const podfile = `
platform :ios, '13.0'
use_frameworks! :linkage => :static

target 'MyApp' do
  use_native_modules!
end
`;
      const result = injectIterablePods(podfile);

      expect(result).toContain("pod 'Iterable-React-Native-SDK'");
    });

    it('should be idempotent - not duplicate pods', () => {
      let result = injectIterablePods(baseExpoPodfile);
      result = injectIterablePods(result);

      const matches = result.match(/pod 'Iterable-React-Native-SDK'/g) ?? [];
      expect(matches.length).toBe(1);
    });

    it('should include correct path for local pod', () => {
      const result = injectIterablePods(baseExpoPodfile);

      expect(result).toContain(":path => '../node_modules/@iterable/react-native-sdk'");
    });
  });

  describe('injectNotificationExtensionTarget', () => {
    const basePodfile = `
platform :ios, '13.0'
use_frameworks! :linkage => :static

target 'MyApp' do
  use_native_modules!
end
`;

    it('should add IterableNotifications target', () => {
      const result = injectNotificationExtensionTarget(basePodfile, 'IterableNotifications');

      expect(result).toContain("target 'IterableNotifications' do");
      expect(result).toContain('use_frameworks! :linkage => :dynamic');
      expect(result).toContain("pod 'Iterable-iOS-AppExtensions'");
    });

    it('should use custom target name when provided', () => {
      const result = injectNotificationExtensionTarget(basePodfile, 'MyCustomNotifications');

      expect(result).toContain("target 'MyCustomNotifications' do");
    });

    it('should be idempotent - not duplicate target', () => {
      let result = injectNotificationExtensionTarget(basePodfile, 'IterableNotifications');
      result = injectNotificationExtensionTarget(result, 'IterableNotifications');

      const matches = result.match(/target 'IterableNotifications'/g) ?? [];
      expect(matches.length).toBe(1);
    });
  });
});

describe('Full Podfile Transformation', () => {
  it('should correctly transform a typical Expo Podfile', () => {
    const expoPodfile = `
require_relative '../node_modules/expo/scripts/autolinking'
require_relative '../node_modules/react-native/scripts/react_native_pods'

platform :ios, '13.4'
install! 'cocoapods', :deterministic_uuids => false

prepare_react_native_project!

target 'MyExpoApp' do
  use_expo_modules!

  config = use_native_modules!
  use_frameworks! :linkage => :static

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true
  )

  post_install do |installer|
    react_native_post_install(installer)
  end
end
`;

    let result = ensureStaticLinkage(expoPodfile);
    result = injectIterablePods(result);
    result = injectNotificationExtensionTarget(result, 'IterableNotifications');

    // Verify static linkage is preserved
    expect(result).toContain('use_frameworks! :linkage => :static');

    // Verify Iterable pods are injected with dynamic override
    expect(result).toContain("pod 'Iterable-React-Native-SDK'");
    expect(result).toContain("pod 'Iterable-iOS-SDK'");
    expect(result).toContain(':linkage => :dynamic');

    // Verify notification extension target is added
    expect(result).toContain("target 'IterableNotifications'");
    expect(result).toContain("pod 'Iterable-iOS-AppExtensions'");
  });
});
