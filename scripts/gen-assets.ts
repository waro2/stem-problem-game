/**
 * Generates placeholder icon and splash PNG assets for Capacitor.
 * Run once with `npm run cap:gen-assets`, then replace assets/ with
 * production-quality artwork before publishing.
 *
 * Outputs:
 *   assets/icon-only.png  — 1024×1024  (icon foreground, transparent bg)
 *   assets/splash.png     — 2732×2732  (launch screen)
 */

import sharp from 'sharp';
import fs from 'node:fs';

async function main(): Promise<void> {

const BLUE = { r: 46, g: 117, b: 182, alpha: 1 };

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <text x="512" y="420" font-family="system-ui,sans-serif" font-size="320"
        font-weight="900" fill="white" text-anchor="middle" dominant-baseline="middle">∑</text>
  <text x="512" y="680" font-family="system-ui,sans-serif" font-size="130"
        font-weight="700" letter-spacing="18" fill="rgba(255,255,255,0.92)"
        text-anchor="middle">STEM</text>
</svg>`;

const SPLASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732">
  <text x="1366" y="1200" font-family="system-ui,sans-serif" font-size="600"
        font-weight="900" fill="white" text-anchor="middle" dominant-baseline="middle">∑</text>
  <text x="1366" y="1600" font-family="system-ui,sans-serif" font-size="220"
        font-weight="700" letter-spacing="30" fill="rgba(255,255,255,0.92)"
        text-anchor="middle">STEM</text>
  <text x="1366" y="1830" font-family="system-ui,sans-serif" font-size="110"
        font-weight="400" fill="rgba(255,255,255,0.70)"
        text-anchor="middle">Problem Game</text>
</svg>`;

fs.mkdirSync('assets', { recursive: true });

await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: BLUE },
})
  .composite([{ input: Buffer.from(ICON_SVG), blend: 'over' }])
  .png()
  .toFile('assets/icon-only.png');

console.log('✓  assets/icon-only.png  (1024×1024)');

await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: BLUE },
})
  .composite([{ input: Buffer.from(SPLASH_SVG), blend: 'over' }])
  .png()
  .toFile('assets/splash.png');

console.log('✓  assets/splash.png     (2732×2732)');
console.log('\nReplace these placeholders with production artwork before publishing.');

}

void main();
