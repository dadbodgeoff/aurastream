# React Native / Expo Upgrade Path

## Current State
- **Expo SDK:** 50.0.0
- **React Native:** 0.73.0 (via Expo managed workflow)
- **React:** 18.2.0
- **Expo Router:** 3.4.0

## Target State
- Expo SDK 54+
- React Native New Architecture enabled (0.80+)
- React Compiler enabled
- React 19 (when stable with Expo)

## Benefits of Upgrade

### React Native New Architecture (0.80+)
- **Synchronous Native Modules**: Direct JS-to-native calls without bridge
- **Concurrent Rendering**: Better UI responsiveness
- **Improved Memory Management**: Reduced memory footprint
- **Fabric Renderer**: More efficient UI updates
- **TurboModules**: Lazy-loaded native modules for faster startup

### React Compiler (Expo SDK 54+)
- **Automatic Memoization**: No more manual useMemo/useCallback
- **Reduced Re-renders**: Compiler optimizes component updates
- **Smaller Bundle**: Dead code elimination
- **Better Performance**: 10-30% improvement in typical apps

### Expo SDK 54 Benefits
- Latest React Native version support
- Improved EAS Build performance
- Better TypeScript support
- Enhanced development tools

## Upgrade Checklist

### Pre-Upgrade
- [ ] Audit all native modules for New Architecture compatibility
- [ ] Review third-party libraries for compatibility:
  - [ ] `react-native-safe-area-context` (4.8.2 → check compatibility)
  - [ ] `react-native-screens` (3.29.0 → check compatibility)
  - [ ] `@tanstack/react-query` (5.0.0 → should be compatible)
  - [ ] `zustand` (4.5.0 → should be compatible)
- [ ] Set up performance baseline metrics
- [ ] Create rollback plan
- [ ] Test on physical devices (iOS and Android)

### Phase 1: Expo SDK 51 (Incremental)
```bash
# Update Expo SDK
npx expo install expo@~51.0.0

# Fix dependencies
npx expo install --fix

# Clear cache and test
npx expo start --clear
```

- [ ] Update `app.json` version
- [ ] Run `npx expo install --fix` to update dependencies
- [ ] Test all screens and features
- [ ] Verify native module functionality
- [ ] Test on both iOS and Android simulators
- [ ] Test on physical devices

### Phase 2: Expo SDK 52-53 (Incremental)
Repeat the process for each SDK version:
```bash
npx expo install expo@~52.0.0
npx expo install --fix
npx expo start --clear
```

### Phase 3: Expo SDK 54 (Target)
```bash
npx expo install expo@~54.0.0
npx expo install --fix
```

### Phase 4: Enable New Architecture
- [ ] Add to `app.json`:
  ```json
  {
    "expo": {
      "experiments": {
        "typedRoutes": true,
        "reactNativeNewArchEnabled": true
      }
    }
  }
  ```
- [ ] Test thoroughly on both iOS and Android
- [ ] Monitor for crashes or performance regressions
- [ ] Run performance benchmarks
- [ ] Test all navigation flows
- [ ] Verify animations and gestures

### Phase 5: Enable React Compiler
- [ ] Install babel plugin:
  ```bash
  npx expo install babel-plugin-react-compiler
  ```
- [ ] Update `babel.config.js`:
  ```javascript
  module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        ['babel-plugin-react-compiler', { target: '18' }],
      ],
    };
  };
  ```
- [ ] Remove manual memoization (useMemo, useCallback, React.memo) - optional but recommended
- [ ] Test for any behavioral changes
- [ ] Run full test suite

## Breaking Changes to Watch

### Expo SDK 51-54
- Check Expo changelog for each version
- Review deprecated APIs
- Metro bundler configuration changes
- EAS Build configuration updates

### New Architecture
- Native modules must support TurboModules
- Some community packages may not be compatible
- Animated API changes (Reanimated compatibility)
- Gesture Handler updates may be required

### React Compiler
- Some patterns may not optimize well:
  - Refs used in render
  - Mutable objects in dependencies
- Custom hooks with side effects need review
- `useEffect` dependency arrays are auto-managed

## AuraStream-Specific Considerations

### Shared Packages
The following shared packages need compatibility verification:
- `@aurastream/ui` - UI components
- `@aurastream/api-client` - API client hooks
- `@aurastream/shared` - Shared utilities

### API Client Hooks
TanStack Query hooks should work without changes, but verify:
- Query invalidation behavior
- Mutation callbacks
- Optimistic updates

### State Management
Zustand stores should be compatible, but test:
- Store subscriptions
- Selector performance
- Persist middleware (if used)

## Rollback Plan

### Quick Rollback
1. Revert `app.json` changes
2. Revert `package.json` to previous versions
3. Run `npm install` or `yarn install`
4. Clear Metro cache: `npx expo start --clear`
5. Clear Watchman: `watchman watch-del-all`

### Full Rollback
```bash
# Restore from git
git checkout HEAD~1 -- tsx/apps/mobile/package.json
git checkout HEAD~1 -- tsx/apps/mobile/app.json
git checkout HEAD~1 -- tsx/apps/mobile/babel.config.js

# Clean install
rm -rf tsx/apps/mobile/node_modules
cd tsx && npm install
cd apps/mobile && npx expo start --clear
```

## Timeline Recommendation

| Quarter | Milestone | Risk Level |
|---------|-----------|------------|
| Q1 2026 | Audit and preparation, SDK 51 | Low |
| Q2 2026 | Upgrade to Expo SDK 52-53 | Medium |
| Q3 2026 | Upgrade to Expo SDK 54, Enable New Architecture | Medium-High |
| Q4 2026 | Enable React Compiler, Performance optimization | Medium |

## Performance Benchmarks to Track

Before and after each upgrade phase, measure:
- [ ] App startup time (cold start)
- [ ] Time to interactive
- [ ] Memory usage (baseline and peak)
- [ ] Frame rate during animations
- [ ] Bundle size
- [ ] API response handling time

## Resources
- [Expo SDK Changelog](https://expo.dev/changelog)
- [Expo SDK 54 Release Notes](https://expo.dev/changelog/2024)
- [React Native New Architecture](https://reactnative.dev/docs/new-architecture-intro)
- [React Native New Architecture Working Group](https://github.com/reactwg/react-native-new-architecture)
- [React Compiler](https://react.dev/learn/react-compiler)
- [Expo New Architecture Guide](https://docs.expo.dev/guides/new-architecture/)
