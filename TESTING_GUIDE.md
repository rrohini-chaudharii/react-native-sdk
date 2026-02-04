# Testing Guide: Iterable iOS Static Linkage Fix

This guide walks you through testing the iOS static linkage changes and the new Expo config plugin.

---

## Prerequisites

Before starting, ensure you have the following installed:

```bash
# Check Node.js (v18+ recommended)
node --version

# Check Yarn
yarn --version

# Check Ruby (for CocoaPods)
ruby --version

# Check CocoaPods
pod --version

# Check Xcode CLI tools
xcode-select -p
```

If missing any, install them:

```bash
# Install Node.js via Homebrew
brew install node

# Install Yarn
npm install -g yarn

# Install CocoaPods
sudo gem install cocoapods

# Install Xcode CLI tools (if not installed)
xcode-select --install
```

---

## Part 1: Test the React Native SDK Example App

### Step 1: Navigate to the React Native SDK

```bash
cd /Users/joao.dordio/dev/repos/codereview/ReactNativeStatic/react-native-sdk
```

### Step 2: Install Dependencies

```bash
yarn install
```

### Step 3: Build the SDK (includes plugin)

```bash
yarn build
```

This will:
- Build the React Native SDK with `react-native-builder-bob`
- Compile the Expo config plugin TypeScript to `plugin/build/`

### Step 4: Verify Plugin Build

```bash
ls -la plugin/build/
```

You should see:
```
index.js
index.d.ts
withIterableAutolinking.js
withIterableAutolinking.d.ts
withIterablePodfile.js
withIterablePodfile.d.ts
```

### Step 5: Navigate to Example App

```bash
cd example
```

### Step 6: Install Example App Dependencies

```bash
yarn install
```

### Step 7: Install iOS Pods

```bash
cd ios
pod install --repo-update
cd ..
```

**Expected output**: Pod installation completes without errors. Look for:
- `Iterable-iOS-SDK` being installed
- `Iterable-React-Native-SDK` being installed
- No "transitive dependencies" errors

### Step 8: Build and Run iOS App

**Option A: Using Yarn (recommended)**
```bash
yarn ios
```

**Option B: Using Xcode**
```bash
open ios/ReactNativeSdkExample.xcworkspace
```
Then in Xcode:
1. Select a simulator (e.g., iPhone 15)
2. Press `Cmd + B` to build
3. Press `Cmd + R` to run

### Step 9: Verify Build Success

The build should complete without these errors:
- ❌ `'Iterable_React_Native_SDK-Swift.h' file not found`
- ❌ `transitive dependencies include statically linked binaries`
- ❌ Duplicate pod declaration errors

If the app launches in the simulator, the fix is working.

---

## Part 2: Test the Expo Config Plugin

### Step 1: Run Plugin Unit Tests

```bash
# From the react-native-sdk root
cd /Users/joao.dordio/dev/repos/codereview/ReactNativeStatic/react-native-sdk

yarn test:plugin
```

**Expected output**: All tests pass:
```
PASS  __tests__/plugin.test.ts
  withIterableAutolinking
    disableAutolinking
      ✓ should add @iterable/react-native-sdk to autolinking exclude list
      ✓ should preserve existing exclude entries
      ✓ should be idempotent - not duplicate entries
  withIterablePodfile
    ensureStaticLinkage
      ✓ should keep existing static linkage unchanged
      ✓ should convert dynamic linkage to static
      ✓ should convert bare use_frameworks! to static linkage
    injectIterablePods
      ✓ should inject Iterable pods after use_expo_modules!
      ...
```

### Step 2: Create a Test Expo App (Optional - Full Integration Test)

```bash
# Create a new directory for testing
cd /tmp
npx create-expo-app@latest iterable-expo-test --template blank
cd iterable-expo-test
```

### Step 3: Link Local SDK to Test App

```bash
# Add the local SDK as a dependency
yarn add /Users/joao.dordio/dev/repos/codereview/ReactNativeStatic/react-native-sdk
```

### Step 4: Configure the Plugin

Edit `app.json`:
```json
{
  "expo": {
    "name": "iterable-expo-test",
    "slug": "iterable-expo-test",
    "plugins": [
      ["@iterable/react-native-sdk", { "enableNotificationExtension": true }]
    ]
  }
}
```

### Step 5: Run Expo Prebuild

```bash
npx expo prebuild --clean
```

### Step 6: Verify Podfile Transformation

```bash
cat ios/Podfile
```

**Verify these entries exist:**

1. Static linkage is set:
   ```ruby
   use_frameworks! :linkage => :static
   ```

2. Iterable pods with dynamic override:
   ```ruby
   # Iterable SDK (Expo Managed Workflow)
   pod 'Iterable-React-Native-SDK', :path => '../node_modules/@iterable/react-native-sdk', :linkage => :dynamic
   pod 'Iterable-iOS-SDK', :linkage => :dynamic
   ```

3. Notification extension target (if enabled):
   ```ruby
   target 'IterableNotifications' do
     use_frameworks! :linkage => :dynamic
     pod 'Iterable-iOS-AppExtensions'
   end
   ```

### Step 7: Test Idempotency

```bash
# Run prebuild again without --clean
npx expo prebuild

# Check for duplicates
grep -c "Iterable-React-Native-SDK" ios/Podfile
```

**Expected**: Should output `1` (not duplicated)

### Step 8: Build the Expo App

```bash
npx expo run:ios
```

---

## Part 3: Verify iOS SDK Header Fix

### Step 1: Navigate to iOS SDK

```bash
cd /Users/joao.dordio/dev/repos/codereview/ReactNativeStatic/iterable-swift-sdk
```

### Step 2: Check Header Files Have C++ Guards

```bash
# Check IterableSDK.h
grep -A2 "__cplusplus" swift-sdk/IterableSDK.h
```

**Expected output:**
```c
#ifdef __cplusplus
extern "C" {
#endif
```

```bash
# Check IterableAppExtensions.h
grep -A2 "__cplusplus" notification-extension/IterableAppExtensions.h
```

**Expected output:**
```c
#ifdef __cplusplus
extern "C" {
#endif
```

### Step 3: Check Resource Bundle Name

```bash
grep "resource_bundles" Iterable-iOS-SDK.podspec
```

**Expected output:**
```ruby
s.resource_bundles = {'IterableSDKResources' => 'swift-sdk/Resources/**/*.{storyboard,xib,xcassets,xcdatamodeld}' }
```

---

## Troubleshooting

### Error: `'Iterable_React_Native_SDK-Swift.h' file not found`

This means the C++ linkage fix isn't being picked up. Ensure:
1. You're using the correct iOS SDK branch: `fix/SDK-290-Export-iOS-sdk-header-file`
2. Run `pod cache clean --all` and reinstall pods

### Error: Pod install fails with dependency errors

```bash
cd ios
pod deintegrate
pod cache clean --all
pod install --repo-update
```

### Error: Plugin build fails

```bash
# Rebuild the plugin
cd /Users/joao.dordio/dev/repos/codereview/ReactNativeStatic/react-native-sdk
rm -rf plugin/build
yarn build:plugin
```

### Error: Tests fail with module not found

```bash
# Install test dependencies
cd plugin
yarn add -D ts-jest @types/jest
```

---

## Quick Commands Reference

```bash
# Build everything
cd /Users/joao.dordio/dev/repos/codereview/ReactNativeStatic/react-native-sdk
yarn install && yarn build

# Run plugin tests
yarn test:plugin

# Run example app
cd example && yarn ios

# Clean rebuild
yarn clean && yarn build

# Check git diff of your changes
cd /Users/joao.dordio/dev/repos/codereview/ReactNativeStatic/react-native-sdk
git diff --stat
```

---

## Success Criteria

You've successfully tested the changes if:

1. ✅ `yarn build` completes without errors
2. ✅ `yarn test:plugin` - All tests pass
3. ✅ Example app builds and runs on iOS simulator
4. ✅ No Swift header file not found errors
5. ✅ Expo prebuild generates correct Podfile entries
6. ✅ Running prebuild twice doesn't duplicate entries
