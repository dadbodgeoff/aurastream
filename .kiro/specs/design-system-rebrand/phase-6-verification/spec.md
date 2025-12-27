# Phase 6: Final Verification and Cleanup

## Objective
Comprehensive verification that the design system rebrand is complete and consistent across all platforms.

## Verification Checklist

### 1. Token Files
- [ ] colors.ts has no purple (#8B5CF6, #a855f7, #9333ea, #7c3aed, #6b21a8, #581c87)
- [ ] colors.ts has no cyan (#00D9FF, #06b6d4, #22d3ee, #0891b2)
- [ ] shadows.ts has no glow effects
- [ ] typography.ts has no display font

### 2. Tailwind Config
- [ ] No glow-primary or glow-accent shadows
- [ ] No display font family
- [ ] interactive and neutral color scales added
- [ ] info semantic color added

### 3. Global CSS
- [ ] --background is #0F172A
- [ ] --foreground is #F8FAFC
- [ ] Scrollbar colors use slate palette

### 4. Mobile Constants
- [ ] Imports from @streamer-studio/ui/tokens
- [ ] No hardcoded purple/cyan colors

### 5. Web Pages
- [ ] No bg-gradient-* with primary/accent
- [ ] No shadow-glow-* classes
- [ ] No hardcoded purple hex in UI elements
- [ ] No hardcoded cyan hex in UI elements

### 6. Mobile Components
- [ ] No avatarGlow or iconGlow styles
- [ ] No hardcoded purple hex
- [ ] No hardcoded cyan hex
- [ ] All colors reference constants

## Color Audit Commands

```bash
# Check for purple colors across entire tsx folder
grep -r "#8B5CF6\|#a855f7\|#9333ea\|#7c3aed\|#6b21a8" tsx/

# Check for cyan colors
grep -r "#00D9FF\|#06b6d4\|#22d3ee\|#0891b2" tsx/

# Check for glow references
grep -r "glow" tsx/packages/ui/src/
grep -r "shadow-glow" tsx/apps/web/src/
grep -r "avatarGlow\|iconGlow" tsx/apps/mobile/src/

# Check for gradient with primary/accent
grep -r "bg-gradient.*primary\|bg-gradient.*accent" tsx/apps/web/src/
```

## Expected Results

### Allowed Purple/Cyan
- User-selectable brand presets (e.g., "Royal Purple" palette option)
- Twitch branding (#9146FF) - platform-specific requirement

### Not Allowed
- UI elements (buttons, backgrounds, text, borders)
- Token definitions
- Default/fallback colors

## Final Build Verification

```bash
# UI package
cd tsx/packages/ui && npx tsc --noEmit

# Web app
cd tsx/apps/web && npx tsc --noEmit

# Mobile app (may have pre-existing errors)
cd tsx/apps/mobile && npx tsc --noEmit
```

## Documentation Update
Update the design.md spec to mark completion status.
