#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 *
 * This script generates PNG icons from the SVG logo for PWA support.
 *
 * Prerequisites:
 *   npm install -D sharp
 *
 * Usage:
 *   node scripts/generate-icons.js
 *
 * Or add to package.json scripts:
 *   "generate-icons": "node scripts/generate-icons.js"
 */

import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_SVG = join(__dirname, '../public/pennywise-cash.svg');
const OUTPUT_DIR = join(__dirname, '../public/icons');

async function generateIcons() {
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const svgBuffer = readFileSync(INPUT_SVG);

  console.log('🎨 Generating PWA icons...\n');

  for (const size of SIZES) {
    const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);

    console.log(`  ✓ icon-${size}x${size}.png`);
  }

  console.log('\n✅ All icons generated successfully!');
  console.log(`   Output directory: ${OUTPUT_DIR}`);
}

generateIcons().catch(console.error);
