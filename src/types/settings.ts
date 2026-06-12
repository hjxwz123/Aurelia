export type ThemePref = 'light' | 'dark' | 'system'
export type DensityPref = 'cozy' | 'comfortable'
export type FontSizePref = 'sm' | 'md' | 'lg'
export type AccentPref = 'violet' | 'lagoon' | 'ember' | 'moss' | 'indigo' | 'rose'

export const ACCENT_PRESETS: readonly AccentPref[] = ['violet', 'lagoon', 'ember', 'moss', 'indigo', 'rose']

export interface AppearanceSettings {
  theme: ThemePref
  density: DensityPref
  fontSize: FontSizePref
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
