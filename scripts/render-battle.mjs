#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TYPE_THEMES = {
  fire:      { primary: '#e24b4a', accent: '#f5a623' },
  water:     { primary: '#3b82f6', accent: '#67e8f9' },
  lightning: { primary: '#eab308', accent: '#fef08a' },
  plant:     { primary: '#22c55e', accent: '#86efac' },
  shadow:    { primary: '#8b5cf6', accent: '#c4b5fd' },
  light:     { primary: '#f9d72c', accent: '#fef9c3' },
  digital:   { primary: '#06b6d4', accent: '#a5f3fc' },
  psychic:   { primary: '#ec4899', accent: '#f9a8d4' },
  earth:     { primary: '#d97706', accent: '#fbbf24' },
  wind:      { primary: '#84cc16', accent: '#d9f99d' },
  metal:     { primary: '#94a3b8', accent: '#e2e8f0' },
  chaos:     { primary: '#f43f5e', accent: '#fb923c' },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTurnsHtml(turns) {
  return turns.map(t => {
    const attacker = t.attacker;
    const target = t.target || (attacker === 'creature1' ? 'creature2' : 'creature1');

    let resultBadge = '';
    if (t.damage > 0) {
      resultBadge = `<div class="turn-damage">-${t.damage} HP</div>`;
    } else if (t.damage < 0) {
      resultBadge = `<div class="turn-damage heal">+${Math.abs(t.damage)} HP</div>`;
    } else if (t.effect) {
      resultBadge = `<div class="turn-damage effect">${escapeHtml(t.effect)}</div>`;
    }

    const isSelfTarget = target === attacker;

    const inlineResult = isSelfTarget && resultBadge
      ? `<div class="turn-inline-result">${resultBadge}</div>` : '';

    const abilityHtml = `
      <div class="turn-content">
        <div class="turn-ability">${escapeHtml(t.ability)}</div>
        <div class="turn-desc">${escapeHtml(t.description)}</div>
        ${inlineResult}
      </div>`;

    const crossResult = !isSelfTarget && resultBadge
      ? `<div class="turn-result">${resultBadge}</div>` : '';

    let leftContent = '', rightContent = '';
    let leftClasses = 'turn-col left', rightClasses = 'turn-col right';

    if (attacker === 'creature1') {
      leftContent = abilityHtml;
      leftClasses += ' active';
      if (!isSelfTarget) {
        rightContent = crossResult;
        rightClasses += ' active';
      }
    } else {
      rightContent = abilityHtml;
      rightClasses += ' active';
      if (!isSelfTarget) {
        leftContent = crossResult;
        leftClasses += ' active';
      }
    }

    return `
        <div class="turn-row">
          <div class="${leftClasses}">${leftContent}</div>
          <div class="turn-divider"><div class="turn-number">${t.turn}</div></div>
          <div class="${rightClasses}">${rightContent}</div>
        </div>`;
  }).join('\n');
}

async function renderBattle(battleJsonPath, battleImagePath, c1CardPath, c2CardPath, outputPath) {
  const battle = JSON.parse(await readFile(battleJsonPath, 'utf-8'));
  const templatePath = resolve(__dirname, 'templates', 'battle.html');
  let html = await readFile(templatePath, 'utf-8');

  const c1 = battle.creature1;
  const c2 = battle.creature2;
  const t1 = TYPE_THEMES[c1.type.toLowerCase()] || TYPE_THEMES.chaos;
  const t2 = TYPE_THEMES[c2.type.toLowerCase()] || TYPE_THEMES.chaos;

  const loadImage = async (p) => {
    const buf = await readFile(p);
    return `data:image/png;base64,${buf.toString('base64')}`;
  };

  const [c1Card, c2Card, battleImage] = await Promise.all([
    loadImage(c1CardPath),
    loadImage(c2CardPath),
    loadImage(battleImagePath),
  ]);

  const result = battle.result;
  const c1FinalHp = result.finalHp.creature1;
  const c2FinalHp = result.finalHp.creature2;

  const today = new Date().toISOString().split('T')[0];

  const replacements = {
    '{{BATTLE_NAME}}': escapeHtml(battle.battleName),
    '{{BATTLE_DATE}}': today,
    '{{BATTLE_IMAGE}}': battleImage,
    '{{BATTLE_SCENE_CAPTION}}': escapeHtml(battle.battleSceneCaption || ''),

    '{{C1_NAME}}': escapeHtml(c1.name),
    '{{C1_CARD}}': c1Card,
    '{{C1_PRIMARY}}': t1.primary,
    '{{C1_ACCENT}}': t1.accent,
    '{{C1_FINAL_HP}}': String(c1FinalHp),
    '{{C1_FINAL_HP_CLASS}}': c1FinalHp <= 0 ? 'dead' : 'alive',

    '{{C2_NAME}}': escapeHtml(c2.name),
    '{{C2_CARD}}': c2Card,
    '{{C2_PRIMARY}}': t2.primary,
    '{{C2_ACCENT}}': t2.accent,
    '{{C2_FINAL_HP}}': String(c2FinalHp),
    '{{C2_FINAL_HP_CLASS}}': c2FinalHp <= 0 ? 'dead' : 'alive',

    '{{WINNER_NAME}}': escapeHtml(result.winnerName),
    '{{WINNER_GLOW}}': result.winner === 'creature1'
      ? `rgba(${hexToRgb(t1.primary)},0.15)`
      : `rgba(${hexToRgb(t2.primary)},0.15)`,
    '{{RESULT_SUMMARY}}': escapeHtml(result.summary),

    '{{TURNS_HTML}}': buildTurnsHtml(battle.narrative),
  };

  for (const [token, value] of Object.entries(replacements)) {
    html = html.replaceAll(token, value);
  }

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 940, height: 1400, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const card = await page.$('.battle-card');
    await card.screenshot({ path: outputPath, type: 'png' });
    console.log(`Battle card saved to ${outputPath}`);
  } finally {
    await browser.close();
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)].join(',');
}

// CLI entry point
const [battleJson, battleImage, c1Card, c2Card, output] = process.argv.slice(2);
if (!battleJson || !battleImage || !c1Card || !c2Card || !output) {
  console.error('Usage: node render-battle.mjs <battle.json> <battle-scene.png> <c1-card.png> <c2-card.png> <output.png>');
  process.exit(1);
}

renderBattle(
  resolve(process.cwd(), battleJson),
  resolve(process.cwd(), battleImage),
  resolve(process.cwd(), c1Card),
  resolve(process.cwd(), c2Card),
  resolve(process.cwd(), output),
).catch(err => {
  console.error('Error rendering battle card:', err.message);
  process.exit(1);
});
