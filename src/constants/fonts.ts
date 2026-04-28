export const DEFAULT_FONT_FAMILY = 'Patrick Hand'

/** Curated Google Fonts available in the text tool. */
export const CURATED_FONTS = [
  { family: 'Patrick Hand',           googleFamily: 'Patrick+Hand' },
  { family: 'Plus Jakarta Sans',      googleFamily: 'Plus+Jakarta+Sans:wght@400' },
  { family: 'Varela Round',           googleFamily: 'Varela+Round' },
  { family: 'Comic Neue',             googleFamily: 'Comic+Neue:wght@400' },
  { family: 'Permanent Marker',       googleFamily: 'Permanent+Marker' },
  { family: 'Shadows Into Light Two', googleFamily: 'Shadows+Into+Light+Two' },
  { family: 'Playwrite US Trad',      googleFamily: 'Playwrite+US+Trad:wght@400' },
] as const

export type CuratedFontFamily = (typeof CURATED_FONTS)[number]['family']

/** Build a Google Fonts CSS URL for a single family entry. */
export function buildFontHref(googleFamily: string): string {
  return `https://fonts.googleapis.com/css2?family=${googleFamily}&display=swap`
}

/** The emoji fallback font — loaded lazily when emoji detected in content. */
export const EMOJI_FONT = {
  family: 'Noto Color Emoji',
  googleFamily: 'Noto+Color+Emoji',
} as const

/** Regex that matches at least one Extended Pictographic (emoji) codepoint. */
export const EMOJI_RE = /\p{Extended_Pictographic}/u
