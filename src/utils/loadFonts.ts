import { buildFontHref, CURATED_FONTS, EMOJI_FONT, EMOJI_RE } from '../constants/fonts'

const injected = new Set<string>()

/** Inject a Google Fonts <link> for the given googleFamily string (idempotent). */
function injectLink(googleFamily: string): void {
  if (injected.has(googleFamily)) return
  injected.add(googleFamily)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = buildFontHref(googleFamily)
  document.head.appendChild(link)
}

/**
 * Ensure the given CSS font family is loaded.
 * Injects its Google Fonts stylesheet (idempotent) and waits for the
 * browser's FontFace to be ready at the given size before resolving.
 * Safe to call concurrently; the same family will only inject one <link>.
 */
export async function loadFont(family: string, sizeHint = 16): Promise<void> {
  const entry = CURATED_FONTS.find((f) => f.family === family) ??
    (family === EMOJI_FONT.family ? EMOJI_FONT : null)
  if (!entry) return
  injectLink(entry.googleFamily)
  try {
    await document.fonts.load(`${sizeHint}px "${family}"`)
  } catch {
    // font load errors are non-fatal — fall back to system font
  }
}

/**
 * Kick off loading for all curated readable fonts (excluding the emoji fallback).
 * Called when the font dropdown opens so previews render correctly.
 */
export function prefetchAllFonts(): void {
  for (const { family } of CURATED_FONTS) {
    loadFont(family)
  }
}

/** Load the emoji fallback font if `content` contains any emoji codepoints. */
export function loadEmojiIfNeeded(content: string): void {
  if (EMOJI_RE.test(content)) {
    loadFont(EMOJI_FONT.family)
  }
}
