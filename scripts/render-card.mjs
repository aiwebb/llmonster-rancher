#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Each type defines a full color palette for the card
const TYPE_THEMES = {
  fire: {
    primary: '#e24b4a', mid: '#c0392b', accent: '#f5a623', accentFaint: 'rgba(245,166,35,0.15)',
    border: '#8b2020', cardBg: '#1e0c0a', cardDeep: '#150807',
    glowBg: 'rgba(226,75,74,0.14)', glowBg2: 'rgba(245,166,35,0.10)',
    textPrimary: '#f0d4c4', textMuted: '#ba8a7a', textDim: '#8a5a4a', divider: '#381510',
  },
  water: {
    primary: '#3b82f6', mid: '#2563eb', accent: '#67e8f9', accentFaint: 'rgba(103,232,249,0.15)',
    border: '#1e3a5f', cardBg: '#0a101e', cardDeep: '#070b15',
    glowBg: 'rgba(59,130,246,0.14)', glowBg2: 'rgba(103,232,249,0.08)',
    textPrimary: '#c4d4f0', textMuted: '#7a8aba', textDim: '#4a5a8a', divider: '#101538',
  },
  lightning: {
    primary: '#eab308', mid: '#ca9a06', accent: '#fef08a', accentFaint: 'rgba(254,240,138,0.15)',
    border: '#854d0e', cardBg: '#1a160a', cardDeep: '#120f07',
    glowBg: 'rgba(234,179,8,0.14)', glowBg2: 'rgba(254,240,138,0.08)',
    textPrimary: '#f0e8c4', textMuted: '#baa87a', textDim: '#8a784a', divider: '#38300e',
  },
  plant: {
    primary: '#22c55e', mid: '#16a34a', accent: '#86efac', accentFaint: 'rgba(134,239,172,0.15)',
    border: '#166534', cardBg: '#0a1e0e', cardDeep: '#07150a',
    glowBg: 'rgba(34,197,94,0.14)', glowBg2: 'rgba(134,239,172,0.08)',
    textPrimary: '#c4f0d0', textMuted: '#7aba8a', textDim: '#4a8a5a', divider: '#10381a',
  },
  shadow: {
    primary: '#8b5cf6', mid: '#7c3aed', accent: '#c4b5fd', accentFaint: 'rgba(196,181,253,0.15)',
    border: '#4c1d95', cardBg: '#110b1e', cardDeep: '#0d0818',
    glowBg: 'rgba(139,92,246,0.14)', glowBg2: 'rgba(196,181,253,0.08)',
    textPrimary: '#d4c4f0', textMuted: '#9a8aba', textDim: '#6a5a8a', divider: '#221538',
  },
  light: {
    primary: '#f9d72c', mid: '#e6c320', accent: '#fef9c3', accentFaint: 'rgba(254,249,195,0.15)',
    border: '#a38516', cardBg: '#1e1c0f', cardDeep: '#15130a',
    glowBg: 'rgba(249,215,44,0.14)', glowBg2: 'rgba(254,249,195,0.08)',
    textPrimary: '#f0ecd4', textMuted: '#bab47a', textDim: '#8a844a', divider: '#383210',
  },
  digital: {
    primary: '#06b6d4', mid: '#0891b2', accent: '#a5f3fc', accentFaint: 'rgba(165,243,252,0.15)',
    border: '#164e63', cardBg: '#0a161e', cardDeep: '#070f15',
    glowBg: 'rgba(6,182,212,0.14)', glowBg2: 'rgba(165,243,252,0.08)',
    textPrimary: '#c4ecf0', textMuted: '#7ababa', textDim: '#4a8a8a', divider: '#103038',
  },
  psychic: {
    primary: '#ec4899', mid: '#db2777', accent: '#f9a8d4', accentFaint: 'rgba(249,168,212,0.15)',
    border: '#831843', cardBg: '#1e0a14', cardDeep: '#15070d',
    glowBg: 'rgba(236,72,153,0.14)', glowBg2: 'rgba(249,168,212,0.08)',
    textPrimary: '#f0c4d8', textMuted: '#ba7a9a', textDim: '#8a4a6a', divider: '#381028',
  },
  earth: {
    primary: '#d97706', mid: '#b45309', accent: '#fbbf24', accentFaint: 'rgba(251,191,36,0.15)',
    border: '#713f12', cardBg: '#1a130a', cardDeep: '#120d07',
    glowBg: 'rgba(217,119,6,0.14)', glowBg2: 'rgba(251,191,36,0.08)',
    textPrimary: '#f0e0c4', textMuted: '#ba9a7a', textDim: '#8a6a4a', divider: '#382810',
  },
  wind: {
    primary: '#84cc16', mid: '#65a30d', accent: '#d9f99d', accentFaint: 'rgba(217,249,157,0.15)',
    border: '#3f6212', cardBg: '#111a0a', cardDeep: '#0d1207',
    glowBg: 'rgba(132,204,22,0.14)', glowBg2: 'rgba(217,249,157,0.08)',
    textPrimary: '#e0f0c4', textMuted: '#9aba7a', textDim: '#6a8a4a', divider: '#223810',
  },
  metal: {
    primary: '#94a3b8', mid: '#64748b', accent: '#e2e8f0', accentFaint: 'rgba(226,232,240,0.15)',
    border: '#475569', cardBg: '#12141a', cardDeep: '#0c0e13',
    glowBg: 'rgba(148,163,184,0.12)', glowBg2: 'rgba(226,232,240,0.06)',
    textPrimary: '#e0e4f0', textMuted: '#9aa0ba', textDim: '#6a708a', divider: '#222838',
  },
  chaos: {
    primary: '#f43f5e', mid: '#e11d48', accent: '#fb923c', accentFaint: 'rgba(251,146,60,0.15)',
    border: '#6b1030', cardBg: '#1e0a10', cardDeep: '#15070b',
    glowBg: 'rgba(244,63,94,0.14)', glowBg2: 'rgba(251,146,60,0.10)',
    textPrimary: '#f0c4cc', textMuted: '#ba7a88', textDim: '#8a4a58', divider: '#381018',
  },
};

function buildAbilitiesHtml(abilities, theme) {
  return abilities.map(a => `
      <div class="ability">
        <div class="ability-dot"></div>
        <div class="ability-content">
          <div class="ability-name">${escapeHtml(a.name)}</div>
          <div class="ability-desc">${escapeHtml(a.description)}</div>
        </div>
        <div class="ability-cost">${a.cost} MP</div>
      </div>`).join('\n');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateCardNumber(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash) % 10000).padStart(4, '0');
}

function generateSubtitle(creature) {
  // No auto-generation — subtitle should come from the JSON or be empty
  return '';
}

function generateTypePattern(type) {
  const patterns = {
    fire: `
      repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(226,75,74,0.4) 12px, rgba(226,75,74,0.4) 13px),
      repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(245,166,35,0.3) 20px, rgba(245,166,35,0.3) 21px)`,
    water: `
      radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.4) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 30%, rgba(103,232,249,0.3) 0%, transparent 40%),
      repeating-linear-gradient(170deg, transparent, transparent 8px, rgba(59,130,246,0.2) 8px, rgba(59,130,246,0.2) 10px)`,
    lightning: `
      repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(234,179,8,0.5) 18px, rgba(234,179,8,0.5) 19px),
      repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(254,240,138,0.2) 30px, rgba(254,240,138,0.2) 31px)`,
    plant: `
      radial-gradient(circle at 15% 80%, rgba(34,197,94,0.4) 0%, transparent 25%),
      radial-gradient(circle at 85% 20%, rgba(134,239,172,0.3) 0%, transparent 20%),
      repeating-linear-gradient(60deg, transparent, transparent 14px, rgba(34,197,94,0.2) 14px, rgba(34,197,94,0.2) 15px)`,
    shadow: `
      radial-gradient(circle at 50% 50%, rgba(139,92,246,0.3) 0%, transparent 40%),
      repeating-conic-gradient(from 0deg, transparent 0deg, transparent 8deg, rgba(196,181,253,0.15) 8deg, rgba(196,181,253,0.15) 10deg)`,
    light: `
      radial-gradient(circle at 30% 20%, rgba(249,215,44,0.5) 0%, transparent 30%),
      radial-gradient(circle at 70% 70%, rgba(254,249,195,0.3) 0%, transparent 25%),
      radial-gradient(circle at 50% 45%, rgba(249,215,44,0.2) 0%, transparent 50%)`,
    digital: `
      repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(6,182,212,0.3) 4px, rgba(6,182,212,0.3) 5px),
      repeating-linear-gradient(90deg, transparent, transparent 16px, rgba(165,243,252,0.25) 16px, rgba(165,243,252,0.25) 17px)`,
    psychic: `
      repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 15deg, rgba(236,72,153,0.2) 15deg, rgba(236,72,153,0.2) 18deg),
      radial-gradient(circle at 50% 50%, transparent 30%, rgba(249,168,212,0.15) 60%, transparent 70%)`,
    earth: `
      repeating-linear-gradient(30deg, transparent, transparent 10px, rgba(217,119,6,0.3) 10px, rgba(217,119,6,0.3) 12px),
      repeating-linear-gradient(-30deg, transparent, transparent 10px, rgba(251,191,36,0.2) 10px, rgba(251,191,36,0.2) 12px)`,
    wind: `
      repeating-linear-gradient(175deg, transparent, transparent 6px, rgba(132,204,22,0.25) 6px, transparent 8px),
      repeating-linear-gradient(170deg, transparent, transparent 14px, rgba(217,249,157,0.2) 14px, transparent 16px),
      repeating-linear-gradient(180deg, transparent, transparent 22px, rgba(132,204,22,0.15) 22px, transparent 24px)`,
    metal: `
      repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(148,163,184,0.25) 3px, rgba(148,163,184,0.25) 4px),
      repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(226,232,240,0.15) 3px, rgba(226,232,240,0.15) 4px)`,
    chaos: `
      repeating-linear-gradient(60deg, transparent, transparent 8px, rgba(244,63,94,0.3) 8px, rgba(244,63,94,0.3) 9px),
      repeating-linear-gradient(-30deg, transparent, transparent 12px, rgba(251,146,60,0.25) 12px, rgba(251,146,60,0.25) 13px),
      repeating-linear-gradient(120deg, transparent, transparent 18px, rgba(244,63,94,0.15) 18px, rgba(244,63,94,0.15) 19px)`,
  };
  return (patterns[type] || patterns.chaos).replace(/\n\s*/g, ' ').trim();
}

async function shortenUrl(url) {
  if (!url) return '';
  try {
    const resp = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
    if (resp.ok) return (await resp.text()).trim();
  } catch {}
  // Fallback: truncate the display URL
  try {
    const u = new URL(url);
    const path = u.pathname.length > 25 ? u.pathname.slice(0, 25) + '...' : u.pathname;
    return u.hostname + path;
  } catch {}
  return '';
}

function generateSpeciesLine(creature) {
  // No auto-generation — species line should come from the JSON or be empty
  return '';
}

async function renderCard(creatureJsonPath, avatarPath, outputPath) {
  const creature = JSON.parse(await readFile(creatureJsonPath, 'utf-8'));
  const templatePath = resolve(__dirname, 'templates', 'card.html');
  let html = await readFile(templatePath, 'utf-8');

  const type = creature.type.toLowerCase();
  const theme = TYPE_THEMES[type] || TYPE_THEMES.chaos;
  const rarityClass = `rarity-${creature.rarity.toLowerCase()}`;

  const avatarBuffer = await readFile(avatarPath);
  const avatarBase64 = avatarBuffer.toString('base64');
  const avatarDataUri = `data:image/png;base64,${avatarBase64}`;

  // Footer right: parentage for bred cards, short URL for generated cards
  let footerRight = '';
  if (creature.parents && creature.parents.length === 2) {
    footerRight = `${creature.parents[0]} × ${creature.parents[1]}`;
  } else if (creature.sourceUrl) {
    footerRight = await shortenUrl(creature.sourceUrl);
  }

  const replacements = {
    '{{RARITY_CLASS}}': rarityClass,
    '{{CARD_BG}}': theme.cardBg,
    '{{CARD_DEEP}}': theme.cardDeep,
    '{{TYPE_PRIMARY}}': theme.primary,
    '{{TYPE_MID}}': theme.mid,
    '{{TYPE_ACCENT}}': theme.accent,
    '{{TYPE_ACCENT_FAINT}}': theme.accentFaint,
    '{{TYPE_BORDER}}': theme.border,
    '{{TYPE_GLOW_BG}}': theme.glowBg,
    '{{TYPE_GLOW_BG2}}': theme.glowBg2,
    '{{TEXT_PRIMARY}}': theme.textPrimary,
    '{{TEXT_MUTED}}': theme.textMuted,
    '{{TEXT_DIM}}': theme.textDim,
    '{{DIVIDER}}': theme.divider,
    '{{RARITY}}': escapeHtml(creature.rarity),
    '{{HP}}': String(creature.hp),
    '{{AVATAR_SRC}}': avatarDataUri,
    '{{NAME}}': escapeHtml(creature.name),
    '{{SUBTITLE}}': escapeHtml(creature.subtitle || generateSubtitle(creature)),
    '{{TYPE}}': escapeHtml(creature.type.toUpperCase()),
    '{{SPECIES_LINE}}': escapeHtml(creature.speciesLine || generateSpeciesLine(creature)),
    '{{ATK}}': String(creature.stats.attack),
    '{{DEF}}': String(creature.stats.defense),
    '{{SPD}}': String(creature.stats.speed),
    '{{MAG}}': String(creature.stats.magic),
    '{{ABILITIES_HTML}}': buildAbilitiesHtml(creature.abilities, theme),
    '{{DESCRIPTION}}': escapeHtml(creature.description),
    '{{CARD_NUMBER}}': generateCardNumber(creature.name),
    '{{TYPE_PATTERN}}': generateTypePattern(type),
    '{{FOOTER_RIGHT}}': escapeHtml(footerRight),
  };

  for (const [token, value] of Object.entries(replacements)) {
    html = html.replaceAll(token, value);
  }

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 500, height: 800, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const card = await page.$('.trading-card');
    await card.screenshot({ path: outputPath, type: 'png' });
    console.log(`Card saved to ${outputPath}`);
  } finally {
    await browser.close();
  }
}

// CLI entry point
const [creatureJson, avatar, output] = process.argv.slice(2);
if (!creatureJson || !avatar || !output) {
  console.error('Usage: node render-card.mjs <creature.json> <avatar.png> <output.png>');
  process.exit(1);
}

renderCard(
  resolve(process.cwd(), creatureJson),
  resolve(process.cwd(), avatar),
  resolve(process.cwd(), output),
).catch(err => {
  console.error('Error rendering card:', err.message);
  process.exit(1);
});
