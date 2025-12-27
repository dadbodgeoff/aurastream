# Design System Rebrand - Tasks

## Task 1: Update Color Tokens ✅ COMPLETE
- [x] Replace `tsx/packages/ui/src/tokens/colors.ts` with new enterprise palette
- [x] Remove all purple/violet colors
- [x] Remove all cyan/neon colors
- [x] Add primary (navy), interactive (blue), accent (amber) scales
- [x] Update neutral scale to slate-based
- [x] Update semantic colors (added info)
- [x] Update background tokens
- [x] Update text tokens
- [x] Update border tokens
- [x] Update color tests

## Task 2: Update Typography Tokens ✅ COMPLETE
- [x] Remove display font (Cal Sans)
- [x] Keep Inter as sole UI font
- [x] Keep JetBrains Mono for code
- [x] Add letter-spacing tokens
- [x] Add typography presets (h1-h6, body, caption, etc.)
- [x] Export preset types

## Task 3: Update Spacing Tokens ✅ COMPLETE
- [x] Expand spacing scale with half-steps (0.5, 1.5, 2.5, etc.)
- [x] Add component spacing standards
- [x] Add layout spacing standards

## Task 4: Update Shadow Tokens ✅ COMPLETE
- [x] Remove all glow effects
- [x] Keep only subtle elevation shadows
- [x] Add focus ring tokens
- [x] Update shadow types

## Task 5: Add Component Tokens ✅ COMPLETE
- [x] Component spacing added to spacing.ts
- [x] Button, input, card standards defined

## Task 6: Update Tailwind Config ✅ COMPLETE
- [x] Update `tsx/apps/web/tailwind.config.ts`
- [x] Map all new color tokens (interactive, neutral, info)
- [x] Remove glow utilities
- [x] Add focus ring utilities
- [x] Remove display font

## Task 7: Create React Native Theme ✅ COMPLETE
- [x] Create `tsx/packages/ui/src/tokens/native.ts`
- [x] Export colors as flat object for StyleSheet
- [x] Export typography presets for React Native
- [x] Export spacing as numeric values

## Task 8: Migrate Mobile Constants ✅ COMPLETE
- [x] Update `tsx/apps/mobile/src/components/coach/constants.ts` to import from shared tokens
- [x] Update `tsx/apps/mobile/__mocks__/@streamer-studio/ui.ts`
- [x] Remove hardcoded purple/cyan colors

## Task 9: Update Web Components ✅ COMPLETE
- [x] Audit all web components for old color classes
- [x] Replace purple/violet classes with interactive
- [x] Replace cyan classes with accent
- [x] Remove gradient classes
- [x] Remove glow classes
- [x] Update focus states
- [x] Fix invalid accent-primary references

## Task 10: Update Mobile Components ✅ COMPLETE
- [x] Update coach components to use shared tokens
- [x] Remove hardcoded hex values
- [x] Remove glow effects (avatarGlow, iconGlow)
- [x] Verify all StyleSheet colors reference tokens

## Task 11: Update Token Index ✅ COMPLETE
- [x] Update `tsx/packages/ui/src/tokens/index.ts`
- [x] Export native tokens
- [x] Update `generateCSSVariables()` function
- [x] Update combined tokens object

## Task 12: Verification & Testing ✅ COMPLETE
- [x] Token files compile without errors
- [x] Web app compiles without errors
- [x] Coach component tests pass (32/32)
- [x] No purple hex codes in UI elements
- [x] No cyan hex codes in UI elements
- [x] No glow effects
- [x] No gradients with primary/accent

## Summary

All 12 tasks completed successfully. The design system has been fully rebranded from gaming/AI aesthetic (purple, cyan, gradients, glows) to professional enterprise (navy blue, amber accent, slate neutrals, no gradients/glows).

### Key Changes:
- Primary color: Purple → Navy Blue (#1E3A5F)
- Interactive color: Purple → Blue (#2563EB)
- Accent color: Cyan → Amber (#D97706)
- Backgrounds: Zinc → Slate
- Removed: All glow effects, gradients, display font

### Files Modified:
- 7 token files in tsx/packages/ui/src/tokens/
- 2 config files (tailwind.config.ts, globals.css)
- 17+ web pages and components
- 20+ mobile screens and components
- 2 mock files

### Exceptions (Intentional):
- User-selectable "Royal Purple" brand preset in brand kit editor
- Twitch purple (#9146FF) for Twitch branding
