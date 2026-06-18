// lib/svg/commitClock.ts
// Renders a 24-segment polar clock showing real commit frequency by hour of day.

import type { BadgeParams, StreakStats } from '../../types';
import { sanitizeHexColor, escapeXML } from './sanitizer';
import { truncateUsername, getSizeScale } from './generator';

const SVG_W = 460;
const SVG_H = 300;
const CX = 160;
const CY = 150;
const INNER_R = 52;
const OUTER_R = 118;
const LABEL_R = 134;

const HOUR_LABELS: Record<number, string> = {
  0: '12a',
  6: '6a',
  12: '12p',
  18: '6p',
};

export function generateCommitClockSVG(
  hourCounts: number[],
  stats: StreakStats,
  params: BadgeParams
): string {
  const sf = getSizeScale(params.size);
  const safeUser = escapeXML(truncateUsername(params.user || 'GitHub User'));
  const bg = `#${sanitizeHexColor(params.bg, '0d1117')}`;
  const rawAccent = Array.isArray(params.accent)
    ? params.accent[params.accent.length - 1]
    : params.accent;
  const accent = `#${sanitizeHexColor(rawAccent, '58a6ff')}`;
  const text = `#${sanitizeHexColor(params.text, 'c9d1d9')}`;

  const W = Math.round(SVG_W * sf);
  const H = Math.round(SVG_H * sf);
  const cx = Math.round(CX * sf);
  const cy = Math.round(CY * sf);
  const innerR = Math.round(INNER_R * sf);
  const outerR = Math.round(OUTER_R * sf);
  const labelR = Math.round(LABEL_R * sf);

  const max = Math.max(...hourCounts, 1);

  // Build 24 arc segments
  let segments = '';
  const segAngle = (2 * Math.PI) / 24;

  for (let h = 0; h < 24; h++) {
    const ratio = hourCounts[h] / max;
    if (ratio === 0) continue;

    // Start angle: top (12 o'clock) = -PI/2, clockwise
    const startAngle = -Math.PI / 2 + h * segAngle;
    const endAngle = startAngle + segAngle * 0.88; // small gap between segments

    const r = innerR + (outerR - innerR) * ratio;
    const opacity = 0.3 + 0.7 * ratio;

    const x1 = cx + innerR * Math.cos(startAngle);
    const y1 = cy + innerR * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(startAngle);
    const y2 = cy + r * Math.sin(startAngle);
    const x3 = cx + r * Math.cos(endAngle);
    const y3 = cy + r * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(endAngle);
    const y4 = cy + innerR * Math.sin(endAngle);

    const rnd = (n: number) => Math.round(n * 10) / 10;

    segments += `<path d="M${rnd(x1)} ${rnd(y1)} L${rnd(x2)} ${rnd(y2)} A${r} ${r} 0 0 1 ${rnd(x3)} ${rnd(y3)} L${rnd(x4)} ${rnd(y4)} A${innerR} ${innerR} 0 0 0 ${rnd(x1)} ${rnd(y1)} Z" fill="${accent}" fill-opacity="${opacity.toFixed(2)}" />\n`;
  }

  // Hour labels at 0, 6, 12, 18
  let labels = '';
  for (const [hStr, label] of Object.entries(HOUR_LABELS)) {
    const h = Number(hStr);
    const angle = -Math.PI / 2 + h * segAngle;
    const lx = Math.round(cx + labelR * Math.cos(angle));
    const ly = Math.round(cy + labelR * Math.sin(angle));
    labels += `<text x="${lx}" y="${ly}" fill="${text}" font-family="'Roboto', sans-serif" font-size="${Math.round(9 * sf)}px" text-anchor="middle" dominant-baseline="central" opacity="0.5">${label}</text>\n`;
  }

  // Peak hour annotation
  const peakHour = hourCounts.indexOf(max);
  const peakLabel =
    peakHour < 12
      ? `${peakHour === 0 ? 12 : peakHour}am`
      : `${peakHour === 12 ? 12 : peakHour - 12}pm`;

  // Inner circle ring
  const innerCircle = `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="${text}" stroke-width="0.5" stroke-opacity="0.15" />\n`;
  const outerCircle = `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="${text}" stroke-width="0.5" stroke-opacity="0.08" />\n`;

  // Stats panel (right side)
  const statX = Math.round(310 * sf);
  const fs = (n: number) => Math.round(n * sf * 10) / 10;

  const totalCommits = hourCounts.reduce((a, b) => a + b, 0);

  const statsPanel = `
  <g transform="translate(${statX}, ${Math.round(55 * sf)})">
    <text fill="${text}" font-family="'Roboto', sans-serif" font-size="${fs(9)}px" font-weight="700" letter-spacing="1.5" opacity="0.5">COMMIT CLOCK</text>
    <text y="${fs(32)}" fill="${accent}" font-family="'Space Grotesk', sans-serif" font-size="${fs(28)}px" font-weight="600">${totalCommits}</text>
    <text y="${fs(50)}" fill="${text}" font-family="'Roboto', sans-serif" font-size="${fs(9)}px" opacity="0.5" letter-spacing="1">TOTAL COMMITS</text>

    <g transform="translate(0, ${fs(78)})">
      <text fill="${text}" font-family="'Roboto', sans-serif" font-size="${fs(9)}px" opacity="0.5" letter-spacing="1">PEAK HOUR</text>
      <text y="${fs(18)}" fill="${accent}" font-family="'Space Grotesk', sans-serif" font-size="${fs(18)}px" font-weight="600">${peakLabel}</text>
    </g>

    <g transform="translate(0, ${fs(140)})">
      <text fill="${text}" font-family="'Roboto', sans-serif" font-size="${fs(9)}px" opacity="0.5" letter-spacing="1">CUR. STREAK</text>
      <text y="${fs(18)}" fill="${text}" font-family="'Space Grotesk', sans-serif" font-size="${fs(18)}px" font-weight="500">${stats.currentStreak}d</text>
    </g>

    <g transform="translate(0, ${fs(185)})">
      <text fill="${text}" font-family="'Roboto', sans-serif" font-size="${fs(9)}px" opacity="0.5" letter-spacing="1">PEAK STREAK</text>
      <text y="${fs(18)}" fill="${text}" font-family="'Space Grotesk', sans-serif" font-size="${fs(18)}px" font-weight="500">${stats.longestStreak}d</text>
    </g>
  </g>`;

  const safeId = safeUser.replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase();
  const borderAttr = params.border ? `stroke="#${params.border}" stroke-width="2"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-labelledby="cp-clock-title-${safeId}" aria-describedby="cp-clock-desc-${safeId}">
  <title id="cp-clock-title-${safeId}">CommitPulse Commit Clock for ${safeUser}</title>
  <desc id="cp-clock-desc-${safeId}">A 24-hour polar ring showing ${safeUser}'s real commit frequency by hour of day. Peak hour: ${peakLabel}. Total sampled commits: ${totalCommits}.</desc>
  <style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&amp;display=swap');
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>
  <rect width="${W}" height="${H}" rx="${Math.round(8 * sf)}" fill="${params.hideBackground ? 'transparent' : bg}" ${borderAttr} />
  <text x="${cx}" y="${Math.round(22 * sf)}" text-anchor="middle" fill="${text}" font-family="'Space Grotesk', sans-serif" font-size="${fs(11)}px" font-weight="600" letter-spacing="2" opacity="0.7">${safeUser.toUpperCase()}</text>
  ${outerCircle}${innerCircle}${segments}${labels}
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="${accent}" font-family="'Space Grotesk', sans-serif" font-size="${fs(11)}px" font-weight="600" opacity="0.9">24h</text>
  ${statsPanel}
</svg>`;
}
