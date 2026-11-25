/**
 * Atalho - Check Catalog Integrity
 * Valida integridade do corpus importado
 * Rodar com: npm run check:catalog
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'public', 'data');

async function main() {
  console.log('🔍 Verificando integridade do catálogo...\n');

  const index = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'index.json'), 'utf-8'));
  const meta = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'meta.json'), 'utf-8'));

  // 1. Total count matches
  if (index.length !== meta.total) {
    throw new Error(`Count mismatch: index has ${index.length}, meta.total is ${meta.total}`);
  }
  console.log(`✅ Total prompts: ${index.length.toLocaleString('pt-BR')}`);

  // 2. Unique IDs
  const ids = new Set(index.map((r) => r.id));
  if (ids.size !== index.length) {
    throw new Error('Duplicate IDs found');
  }
  console.log('✅ Todos os IDs são únicos');

  // 3. Category counts match
  const catCounts = {};
  for (const r of index) {
    catCounts[r.category] = (catCounts[r.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(meta.categories)) {
    if (catCounts[cat] !== count) {
      throw new Error(`Category count mismatch for ${cat}: index has ${catCounts[cat]}, meta has ${count}`);
    }
  }
  console.log('✅ Contagens por categoria conferem');

  // 4. Sources valid
  const sourceIds = new Set(meta.sources.map((s) => s.id));
  const chunks = new Map();
  const hashes = new Set();
  const sourceCounts = {};

  for (const [position, row] of index.entries()) {
    const chunkId = row.chunk ?? Math.floor(position / 200);
    // Load chunk if needed
    if (!chunks.has(chunkId)) {
      const chunkData = JSON.parse(await fs.readFile(path.join(DATA_DIR, `prompts-${chunkId}.json`), 'utf-8'));
      chunks.set(chunkId, chunkData);
    }
    const chunk = chunks.get(chunkId);
    const prompt = chunk[row.id];

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error(`Missing or empty prompt for ${row.id}`);
    }

    // Check global deduplication
    const digest = crypto
      .createHash('sha256')
      .update(prompt.replace(/\s+/g, ' ').toLowerCase())
      .digest('hex');
    if (hashes.has(digest)) {
      throw new Error(`Duplicate prompt text: ${row.id}`);
    }
    hashes.add(digest);

    // Check provenance
    if (!row.origins || row.origins.length === 0) {
      throw new Error(`Missing provenance: ${row.id}`);
    }
    const promptSources = new Set();
    for (const origin of row.origins) {
      if (!sourceIds.has(origin.source)) {
        throw new Error(`Unknown source ${origin.source} in ${row.id}`);
      }
      if (origin.url && !origin.url.startsWith('https://')) {
        throw new Error(`Invalid URL in ${row.id}: ${origin.url}`);
      }
      promptSources.add(origin.source);
    }
    for (const source of promptSources) {
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    }
  }
  console.log('✅ Todos os prompts têm texto válido e proveniência');

  // 5. Source imported counts match
  for (const s of meta.sources) {
    if ((sourceCounts[s.id] || 0) !== s.imported) {
      throw new Error(`Source count mismatch for ${s.id}: computed ${sourceCounts[s.id] || 0}, meta has ${s.imported}`);
    }
  }
  console.log('✅ Contagens por fonte conferem');

  // 6. /albumcover is first and featured
  const album = index.find((r) => r.shortcut === '/albumcover');
  if (!album) throw new Error('/albumcover not found');
  if (!album.featured) throw new Error('/albumcover not featured');
  if (album.language !== 'pt') throw new Error('/albumcover not in Portuguese');
  if (index[0].id !== album.id) throw new Error('/albumcover not first in index');
  console.log('✅ /albumcover está em destaque e em primeiro');

  // 7. All categories have items
  for (const cat of ['imagens', 'escrita', 'estudos', 'programacao', 'negocios']) {
    if (!meta.categories[cat] || meta.categories[cat] === 0) {
      throw new Error(`Category ${cat} has zero items`);
    }
  }
  console.log('✅ Todas as categorias têm prompts');

  console.log(`\n🎉 OK: ${index.length.toLocaleString('pt-BR')} prompts distintos, ${chunks.size} chunks, proveniência e contagens consistentes.`);
}

main().catch((err) => {
  console.error('❌ Falha na verificação:', err);
  process.exit(1);
});