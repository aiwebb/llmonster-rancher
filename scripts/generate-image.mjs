#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';

async function generateImage(creatureJsonPath, outputPath) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is required.');
    console.error('Get an API key at https://aistudio.google.com/apikey');
    process.exit(1);
  }

  const creature = JSON.parse(await readFile(creatureJsonPath, 'utf-8'));
  const prompt = creature.avatarPrompt;

  if (!prompt) {
    console.error('Error: creature JSON is missing "avatarPrompt" field.');
    process.exit(1);
  }

  console.log(`Generating avatar for "${creature.name}" using ${GEMINI_MODEL}...`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error (${response.status}):`, errorText);
    process.exit(1);
  }

  const data = await response.json();

  // Find the image part in the response
  const candidates = data.candidates || [];
  let imageData = null;

  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = part.inlineData.data;
        break;
      }
    }
    if (imageData) break;
  }

  if (!imageData) {
    console.error('Error: No image data in Gemini response.');
    console.error('Response:', JSON.stringify(data, null, 2).slice(0, 500));
    process.exit(1);
  }

  const buffer = Buffer.from(imageData, 'base64');
  await writeFile(outputPath, buffer);
  console.log(`Avatar saved to ${outputPath}`);
}

// CLI entry point
const [creatureJson, output] = process.argv.slice(2);
if (!creatureJson || !output) {
  console.error('Usage: node generate-image.mjs <creature.json> <output-avatar.png>');
  process.exit(1);
}

generateImage(
  resolve(process.cwd(), creatureJson),
  resolve(process.cwd(), output),
).catch(err => {
  console.error('Error generating image:', err.message);
  process.exit(1);
});
