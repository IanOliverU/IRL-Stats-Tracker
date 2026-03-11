type BackdropIntensity = 'default' | 'strong';

function hexToRgb(hexColor: string): { r: number; g: number; b: number } | null {
  const normalized = hexColor.replace('#', '');
  const sixDigit =
    normalized.length === 3
      ? normalized
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : normalized;

  if (sixDigit.length !== 6) return null;

  const r = Number.parseInt(sixDigit.slice(0, 2), 16);
  const g = Number.parseInt(sixDigit.slice(2, 4), 16);
  const b = Number.parseInt(sixDigit.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

export function getModalBackdropColor(
  themeBackground: string,
  isDarkTheme: boolean,
  intensity: BackdropIntensity = 'default'
): string {
  const alpha = isDarkTheme
    ? intensity === 'strong'
      ? 0.66
      : 0.56
    : intensity === 'strong'
      ? 0.42
      : 0.28;
  const rgb = hexToRgb(themeBackground);

  if (!rgb) return `rgba(0,0,0,${alpha})`;

  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}
