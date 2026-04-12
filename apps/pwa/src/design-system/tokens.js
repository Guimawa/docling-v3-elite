/**
 * Design System Tokens — Obsidian Amber (clair) 2026
 *
 * Référence : docs/design/DESIGN-DIRECTION-LIGHT-2026.md
 * - Fond ivoire / cartes blanches, accent ambre
 * - Fonts: Sora (headings) + DM Sans (body)
 */

// ========================================
// COLORS — Palette claire (template Obsidian Amber)
// ========================================

export const colors = {
  primary: '#B45309',
  primaryMedium: '#D97706',
  primaryLight: '#F59E0B',
  primaryPale: '#FFFBEB',

  bgPrimary: '#FAFAF7',
  bgSecondary: '#F5F3EF',
  bgCard: '#FFFFFF',
  bgInput: '#F9F7F4',
  bgLight: '#FFFFFF',

  border: '#E5E2DC',
  borderMedium: '#D4D0C8',
  borderDark: '#A8A29E',

  textPrimary: '#1A1510',
  textSecondary: '#6B6560',
  textTertiary: '#9C9690',
  textDisabled: '#B8B3AB',
  textInverse: '#FFFFFF',

  success: '#059669',
  successBg: '#ECFDF5',
  successLight: '#34D399',

  warning: '#D97706',
  warningBg: '#FFFBEB',
  warningLight: '#FBBF24',

  error: '#DC2626',
  errorBg: '#FEF2F2',
  errorLight: '#F87171',

  info: '#2563EB',
  infoBg: '#EFF6FF',
  infoLight: '#60A5FA',

  gradientCoralPrimary: 'linear-gradient(135deg, #B45309 0%, #D97706 55%, #F59E0B 100%)',
  gradientCoralButton: 'linear-gradient(135deg, #B45309, #D97706)',
  gradientBeigeLight: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
  gradientBeigeCard: 'linear-gradient(135deg, #FFFFFF, #FAFAF7)',
  gradientSuccess: 'linear-gradient(to right, #059669, #34D399)',
  gradientWarning: 'linear-gradient(to right, #D97706, #FBBF24)',

  glassWhite15: 'rgba(255, 255, 255, 0.15)',
  glassWhite20: 'rgba(255, 255, 255, 0.20)',
  glassBlack70: 'rgba(0, 0, 0, 0.70)',
  glassBlack50: 'rgba(0, 0, 0, 0.50)',
}

// ========================================
// SPACING — 8px base grid
// ========================================

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
  '5xl': '8rem',   // 128px
}

// ========================================
// BORDER RADIUS — Arrondi moderne 2026
// ========================================

export const radius = {
  none: '0',
  sm: '0.5rem',    // 8px — Badges, small buttons
  md: '0.75rem',   // 12px — Buttons, inputs
  lg: '1rem',      // 16px — Cards
  xl: '1.125rem',  // 18px — Large cards
  '2xl': '1.375rem', // 22px — Upload zones, modals
  '3xl': '2rem',   // 32px — Hero sections arrondies
  full: '9999px',  // Pills, avatars
}

// ========================================
// SHADOWS — Élévation douce
// ========================================

export const shadows = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
  sm: '0 2px 8px rgba(0, 0, 0, 0.04)',
  md: '0 2px 10px rgba(0, 0, 0, 0.04)',
  lg: '0 2px 12px rgba(0, 0, 0, 0.05)',
  xl: '0 4px 20px rgba(180, 83, 9, 0.12)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.12)',

  coralSm: '0 2px 8px rgba(180, 83, 9, 0.12)',
  coralMd: '0 4px 12px rgba(180, 83, 9, 0.15)',
  coralLg: '0 0 24px rgba(180, 83, 9, 0.18)',
  coralXl: '0 0 30px rgba(5, 150, 105, 0.2)',
}

// ========================================
// TRANSITIONS — Timing cohérent
// ========================================

export const transitions = {
  fast: '150ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '400ms ease-in-out',

  // Timing functions
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
}

// ========================================
// Z-INDEX — Layers cohérents
// ========================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  navbar: 30,      // Navbar bottom fixe
  overlay: 40,
  modal: 50,
  statusBar: 60,   // Status bar iOS
  popover: 70,
  tooltip: 80,
  toast: 90,
}

// ========================================
// FONT FAMILIES — Sora + DM Sans
// ========================================

export const fontFamilies = {
  sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'], // Body text
  heading: ['Sora', 'DM Sans', 'system-ui', 'sans-serif'],       // Headings + stats
  mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],      // Code
}

// ========================================
// FONT SIZES — Type scale mobile-first
// ========================================

export const fontSizes = {
  '2xs': '0.625rem',  // 10px — Micro labels
  xs: '0.6875rem',    // 11px — Small labels, badges
  sm: '0.75rem',      // 12px — Body small, helper text
  base: '0.8125rem',  // 13px — Body normal
  md: '0.875rem',     // 14px — Body medium
  lg: '0.9375rem',    // 15px — Emphasized text
  xl: '1rem',         // 16px — Large text
  '2xl': '1.125rem',  // 18px — Stats, prices
  '3xl': '1.25rem',   // 20px — Stats values
  '4xl': '1.375rem',  // 22px — Hero titles
  '5xl': '1.5rem',    // 24px — Large hero
  '6xl': '1.625rem',  // 26px — Extra large
}

// ========================================
// FONT WEIGHTS — Sora + DM Sans range
// ========================================

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,  // Sora uniquement (stats, titres impactants)
}

// ========================================
// LINE HEIGHTS
// ========================================

export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
}

// ========================================
// LETTER SPACING
// ========================================

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
}

// ========================================
// BACKDROP BLUR — Glassmorphism 2026
// ========================================

export const backdropBlur = {
  none: 'blur(0)',
  sm: 'blur(4px)',
  md: 'blur(6px)',
  lg: 'blur(8px)',
  xl: 'blur(12px)',
  '2xl': 'blur(20px)',
}

// ========================================
// EXPORTS GROUPÉS
// ========================================

export const tokens = {
  colors,
  spacing,
  radius,
  shadows,
  transitions,
  zIndex,
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  backdropBlur,
}

export default tokens
