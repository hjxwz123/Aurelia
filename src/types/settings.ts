export type ThemePref = 'light' | 'dark' | 'system'
export type DensityPref = 'cozy' | 'comfortable'
export type FontSizePref = 'sm' | 'md' | 'lg'
export type AccentPref = 'violet' | 'lagoon' | 'ember' | 'moss' | 'indigo' | 'rose' | 'mono'
/** Body typeface preset. 'default' = Geist (brand); the rest override --font-sans. */
export type FontPref = 'default' | 'inter' | 'system' | 'serif'
/** Chat content width preset, picked on a snapping slider. 'comfortable' =
 *  centered editorial column (default); 'full' = the whole chat pane, keeping
 *  only a safe gutter; 'narrow'/'wide' sit either side of the default. */
export type ChatWidthPref = 'narrow' | 'comfortable' | 'wide' | 'full'

export const ACCENT_PRESETS: readonly AccentPref[] = ['violet', 'lagoon', 'ember', 'moss', 'indigo', 'rose', 'mono']
export const FONT_PRESETS: readonly FontPref[] = ['default', 'inter', 'system', 'serif']

export interface AppearanceSettings {
  theme: ThemePref
  density: DensityPref
  fontSize: FontSizePref
  font: FontPref
  chatWidth: ChatWidthPref
  /** When true, user-authored message bubbles render through the same markdown pipeline as assistant messages. */
  userMessageMarkdown: boolean
}

export interface ModelSettings {
  defaultModelId: string
  customInstructions: string
  responseLength: 'concise' | 'balanced' | 'detailed'
}

export interface PrivacySettings {
  trainingOptOut: boolean
  retainHistory: boolean
  memoriesEnabled: boolean
}
