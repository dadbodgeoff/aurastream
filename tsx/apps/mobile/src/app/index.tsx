import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { colors as tokenColors } from '@aurastream/ui/tokens';
import { AURASTREAM_BRANDING } from '@aurastream/shared';

const colors = {
  backgroundBase: tokenColors.background.base,
  textPrimary: tokenColors.text.primary,
  textSecondary: tokenColors.text.secondary,
  primary: tokenColors.interactive[600],
  backgroundSurface: tokenColors.background.surface,
  border: tokenColors.border.default,
};

export default function Home() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={{ uri: AURASTREAM_BRANDING.logo.url }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>
          AI-powered streaming asset generation for content creators
        </Text>
        <View style={styles.buttonContainer}>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Learn More</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    width: AURASTREAM_BRANDING.logoSizes.lg.width,
    height: AURASTREAM_BRANDING.logoSizes.lg.height,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.backgroundSurface,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
