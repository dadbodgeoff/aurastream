'use client';

import { SectionCard, SectionHeader, ToneSelector, TagInput, SaveButton } from '../shared';
import { MicIcon } from '../icons';
import { BRAND_KIT_LIMITS, type BrandVoiceInput, type ExtendedToneType } from '@aurastream/api-client';
import type { VoicePanelProps } from '../types';

export function VoicePanel({ voice, onChange, onSave, isSaving }: VoicePanelProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SectionCard>
        <SectionHeader
          icon={<MicIcon />}
          title="Brand Tone"
          description="The overall feeling of your brand communication"
          optional
          action={<SaveButton onClick={onSave} isSaving={isSaving} label="Save Voice" />}
        />
        <ToneSelector 
          value={voice.tone} 
          onChange={(t) => onChange({ ...voice, tone: t as ExtendedToneType })} 
        />
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<MicIcon />}
          title="Personality Traits"
          description={`3-5 adjectives that describe your brand personality (${voice.personalityTraits.length}/${BRAND_KIT_LIMITS.voice.personalityTraitsMax})`}
          optional
        />
        <TagInput
          tags={voice.personalityTraits}
          onChange={(traits) => onChange({ ...voice, personalityTraits: traits })}
          placeholder="Type a trait and press Enter (e.g., Bold, Energetic, Authentic)"
          maxTags={BRAND_KIT_LIMITS.voice.personalityTraitsMax}
          maxLength={BRAND_KIT_LIMITS.voice.personalityTraitMaxLength}
        />
        <p className="text-xs text-text-muted mt-2">
          Press Enter to add • Max {BRAND_KIT_LIMITS.voice.personalityTraitMaxLength} characters each
        </p>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<MicIcon />}
          title="Tagline"
          description="Your brand's memorable catchphrase"
          optional
        />
        <input
          type="text"
          value={voice.tagline || ''}
          onChange={(e) => onChange({ ...voice, tagline: e.target.value.slice(0, BRAND_KIT_LIMITS.voice.taglineMaxLength) })}
          maxLength={BRAND_KIT_LIMITS.voice.taglineMaxLength}
          className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 transition-colors text-lg"
          placeholder="Level Up Your Stream (optional)"
        />
        <p className="text-xs text-text-muted mt-2">
          {(voice.tagline || '').length}/{BRAND_KIT_LIMITS.voice.taglineMaxLength} characters
        </p>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<MicIcon />}
          title="Catchphrases"
          description={`Common phrases or sayings you use (${voice.catchphrases.length}/${BRAND_KIT_LIMITS.voice.catchphrasesMax})`}
          optional
        />
        <TagInput
          tags={voice.catchphrases}
          onChange={(phrases) => onChange({ ...voice, catchphrases: phrases })}
          placeholder="Type a catchphrase and press Enter (e.g., Let's gooo!, GG everyone)"
          maxTags={BRAND_KIT_LIMITS.voice.catchphrasesMax}
          maxLength={BRAND_KIT_LIMITS.voice.catchphraseMaxLength}
        />
        <p className="text-xs text-text-muted mt-2">
          Press Enter to add • Max {BRAND_KIT_LIMITS.voice.catchphraseMaxLength} characters each
        </p>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<MicIcon />}
          title="Content Themes"
          description={`Main topics your content focuses on (${voice.contentThemes.length}/${BRAND_KIT_LIMITS.voice.contentThemesMax})`}
          optional
        />
        <TagInput
          tags={voice.contentThemes}
          onChange={(themes) => onChange({ ...voice, contentThemes: themes })}
          placeholder="Type a theme and press Enter (e.g., Gaming, Tech Reviews, Community)"
          maxTags={BRAND_KIT_LIMITS.voice.contentThemesMax}
          maxLength={BRAND_KIT_LIMITS.voice.contentThemeMaxLength}
        />
        <p className="text-xs text-text-muted mt-2">
          Press Enter to add • Max {BRAND_KIT_LIMITS.voice.contentThemeMaxLength} characters each
        </p>
      </SectionCard>
    </div>
  );
}
