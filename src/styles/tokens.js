export const colors = {
  bg: '#0a0a0f',
  bgDeep: '#050507',
  surface: '#1c1c22',
  surface2: '#26262e',
  surfaceElevated: '#32323c',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  gold: '#E8C96A',
  goldMuted: 'rgba(232,201,106,0.15)',
  blue: '#6EB5D4',
  blueMuted: 'rgba(110,181,212,0.15)',
  rose: '#E07B6A',
  roseMuted: 'rgba(224,123,106,0.15)',
  text: '#FFFFFF',
  textMuted: '#8E8E93',
  textFaint: '#48484A',
};

const cssVariableMap = {
  bg: '--bg',
  bgDeep: '--bg-deep',
  surface: '--surface',
  surface2: '--surface-2',
  surfaceElevated: '--surface-elevated',
  border: '--border',
  borderStrong: '--border-strong',
  gold: '--gold',
  goldMuted: '--gold-muted',
  blue: '--blue',
  blueMuted: '--blue-muted',
  rose: '--rose',
  roseMuted: '--rose-muted',
  text: '--text',
  textMuted: '--text-muted',
  textFaint: '--text-faint',
};

export function applyThemeTokens(root = document.documentElement) {
  Object.entries(cssVariableMap).forEach(([token, cssVar]) => {
    root.style.setProperty(cssVar, colors[token]);
  });
}
