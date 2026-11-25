/**
 * Atalho - Import Catalog Script
 * Reproduzível importação de fontes públicas para o formato Astro
 * Rodar com: npm run import
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { fetch } from 'undici';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.cache');
const DATA_DIR = path.join(ROOT, 'public', 'data');

await fs.mkdir(CACHE_DIR, { recursive: true });
await fs.mkdir(DATA_DIR, { recursive: true });

const records = [];
const sources = [];
const seen = new Map();

function fetchWithCache(url) {
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  const cacheFile = path.join(CACHE_DIR, `${hash}.txt`);

  return fs.readFile(cacheFile, 'utf-8').catch(async () => {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Atalho-Catalog/1.0' },
      timeout: 120000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const text = await res.text();
    await fs.writeFile(cacheFile, text);
    return text;
  });
}

function slugify(s) {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function normalizeText(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function add(source, key, title, body, category, extra = {}) {
  body = body.trim();
  if (!body) return false;

  const digest = crypto
    .createHash('sha256')
    .update(body.replace(/\s+/g, ' ').toLowerCase())
    .digest('hex');

  const provenance = { source, url: extra.url || '' };

  if (seen.has(digest)) {
    const existing = records[seen.get(digest)];
    if (!existing.origins.some((o) => o.source === provenance.source && o.url === provenance.url)) {
      existing.origins.push(provenance);
    }
    return false;
  }

  seen.set(digest, records.length);
  records.push({
    id: `${source}-${key}`,
    title,
    prompt: body,
    category,
    shortcut: extra.shortcut || '/' + (slugify(title) || key),
    origins: [provenance],
    ...extra,
  });
  return true;
}

function createSource(id, name, url, model, announced = null) {
  const s = { id, name, url, model, announced, imported: 0, extracted: 0 };
  sources.push(s);
  return s;
}

function categorize(title, dev = false, image = false) {
  const t = title.toLowerCase();
  if (image) return 'imagens';
  if (dev || /\b(code|program|develop|software|javascript|python|sql|linux|debug|engineer|api\b|react|database|terminal)\b/.test(t)) return 'programacao';
  if (/\b(teach|learn|stud|tutor|exam|quiz|math|research|science|history|language|education|lesson|professor)\b/.test(t)) return 'estudos';
  if (/\b(business|market|sales|financ|entrepreneur|startup|manager|product|recruit|career|invest|consult|brand|customer|seo|strategy|advertis)\b/.test(t)) return 'negocios';
  return 'escrita';
}

async function main() {
  console.log('🔄 Iniciando importação do catálogo...\n');

  // 1. Curated editorial
  console.log('📝 Carregando seleção editorial...');
  const curated = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts', 'curated.json'), 'utf-8'));
  const sEditorial = createSource('editorial', 'Atalho · seleção editorial', '', 'ChatGPT');
  for (const item of curated) {
    add('editorial', item.shortcut.slice(1), item.title, item.prompt, item.category, {
      shortcut: item.shortcut,
      description: item.description,
      language: 'pt',
      featured: true,
    });
  }
  sEditorial.extracted = curated.length;
  console.log(`   ${curated.length} prompts editoriais`);

  // 2. Mestre dos Prompts
  console.log('🎓 Carregando Mestre dos Prompts...');
  const sMaestro = createSource('maestro', 'Mestre dos Prompts', 'https://codigos.maestroprompts.chatgpt.site/', 'ChatGPT', 300);
  const maestroData = JSON.parse(await fetchWithCache(sMaestro.url + 'data.json?v=300-20261031'));
  for (const cat of maestroData.categories) {
    for (const item of cat.items) {
      const body = item.prompt || `Use a imagem enviada como referência, se houver. Aplique o atalho personalizado ${item.code}: ${item.description} Preserve as características reconhecíveis do assunto principal. Defina uma composição intencional, iluminação coerente e detalhes naturais. Entregue a imagem final em ${item.format || '4:5'}, sem marca-d'água.`;
      add('maestro', item.number, item.description.replace(/\.$/, ''), body, 'imagens', {
        shortcut: item.code,
        description: cat.name,
        language: 'pt',
        image: sMaestro.url + 'assets/thumbs/' + item.number + '.webp?v=300',
        url: sMaestro.url,
        featured: ['/albumcover', '/editorial', '/goldenhour', '/cinematic', '/product'].includes(item.code),
      });
      sMaestro.extracted++;
    }
  }
  console.log(`   ${sMaestro.extracted} prompts do Mestre`);

  // Simple CSV parser that handles quoted fields
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++; // Skip \r in \r\n
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  // Push last field/row if exists
  if (currentField || currentRow.length) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

// 3. prompts.chat
  console.log('💬 Carregando prompts.chat...');
  const sPromptsChat = createSource('prompts-chat', 'prompts.chat', 'https://github.com/f/prompts.chat', 'ChatGPT');
  const csvText = await fetchWithCache('https://raw.githubusercontent.com/f/prompts.chat/main/prompts.csv');
  const csvRows = parseCSV(csvText);
  const headers = csvRows[0];
  for (let i = 1; i < csvRows.length; i++) {
    const values = csvRows[i];
    const row = {};
    headers.forEach((h, idx) => (row[h] = values[idx] || ''));
    const promptText = row.prompt || '';
    add(sPromptsChat.id, i, row.act, promptText, categorize(row.act, row.for_devs === 'true', row.type === 'IMAGE'), {
      description: promptText.slice(0, 180),
      language: 'original',
      url: sPromptsChat.url + '/blob/main/prompts.csv',
    });
    sPromptsChat.extracted++;
  }
  console.log(`   ${sPromptsChat.extracted} prompts do prompts.chat`);

  // 4. YouMind collections
  console.log('🧠 Carregando coleções YouMind...');
  for (const [sid, repo, label, model, announced] of [
    ['youmind-gpt', 'gpt-image-2-prompts-search', 'YouMind · GPT Image 2', 'GPT Image 2', 18144],
    ['youmind-nano', 'nano-banana-pro-prompts-recommend-skill', 'YouMind · Nano Banana Pro', 'Nano Banana Pro', 15860],
  ]) {
    const base = `https://raw.githubusercontent.com/YouMind-OpenLab/${repo}/main/references/`;
    const s = createSource(sid, label, `https://github.com/YouMind-OpenLab/${repo}`, model, announced);
    const manifest = JSON.parse(await fetchWithCache(base + 'manifest.json'));
    s.manifestTotal = manifest.totalPrompts;
    const files = manifest.categories.map((c) => c.file);

    const ids = new Set();
    for (const file of files) {
      const data = JSON.parse(await fetchWithCache(base + file));
      for (const item of data) {
        const idStr = String(item.id);
        if (ids.has(idStr)) continue;
        ids.add(idStr);
        add(sid, idStr, item.title, item.content || '', 'imagens', {
          description: (item.description || '').slice(0, 180),
          language: 'original',
          image: item.sourceMedia?.find((u) => u.startsWith('https://')) || '',
          reference: item.needReferenceImages || false,
          url: s.url + '/blob/main/references/' + file,
        });
      }
    }
    s.extracted = ids.size;
    console.log(`   ${label}: ${ids.size} IDs únicos`);
  }

  // 5. GitHub README collections
  console.log('📚 Carregando coleções GitHub...');
  for (const [sid, repo, file, heading, branch, name, model] of [
    ['gpt4o', 'jamez-bondos/awesome-gpt4o-images', 'README_en.md', '^### Case \\d+:[^\\n]*', 'main', 'Awesome GPT-4o Images', 'GPT-4o'],
    ['imgedify', 'ImgEdify/Awesome-GPT4o-Image-Prompts', 'README.md', '^### (?!Table of Contents)[^\\n]+', 'main', 'ImgEdify', 'GPT-4o'],
    ['pixmind', 'Pixmind-io/awesome-gpt-image-2-prompts', 'README.md', '^### \\d+\\.[^\\n]+', 'master', 'Pixmind', 'GPT Image 2'],
  ]) {
    const s = createSource(sid, name, `https://github.com/${repo}`, model);
    const text = await fetchWithCache(`https://raw.githubusercontent.com/${repo}/${branch}/${file}`);
    const matches = [...text.matchAll(new RegExp(heading, 'gm'))];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const section = text.slice(match.index + match[0].length, matches[i + 1]?.index || text.length);

      let blocks = [];
      if (sid === 'imgedify') {
        blocks = [...section.matchAll(/\*\*Prompt Text:\*\*\s*`(.*?)`/gs)].map((m) => m[1]);
      } else {
        blocks = [...section.matchAll(/```[^\n]*\n(.*?)```/gs)].map((m) => m[1]);
      }
      if (!blocks.length) {
        blocks = [...section.matchAll(/^>\s?(.*)$/gm)].map((m) => m[1]);
      }

      const body = blocks.map((b) => b.trim()).filter(Boolean).join('\n\n');
      if (!body) continue;

      let title = match[0].replace(/^###\s*/, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
      title = title.replace(/^(Case )?\d+[.:]\s*/, '');

      add(sid, i, title, body, 'imagens', {
        language: 'original',
        url: s.url + '/blob/' + branch + '/' + file,
      });
      s.extracted++;
    }
    console.log(`   ${name}: ${s.extracted} prompts`);
  }

  // 6. Instagram
  console.log('📸 Carregando Instagram...');
  const sInstagram = createSource('instagram', 'Instagram · @poderartificial', 'https://www.instagram.com/p/DdIxjB1SSoF/', 'ChatGPT', 20);
  const instagramData = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts', 'instagram.json'), 'utf-8'));
  for (const item of instagramData) {
    add('instagram', item.code, item.title, item.prompt, item.category, {
      shortcut: '/' + item.code,
      description: 'Adaptado da instrução curta publicada por @poderartificial.',
      language: 'pt',
      url: sInstagram.url,
    });
    sInstagram.extracted++;
  }
  console.log(`   ${sInstagram.extracted} prompts do Instagram`);

  // Calculate imported counts per source
  for (const s of sources) {
    s.imported = records.filter((r) => r.origins.some((o) => o.source === s.id)).length;
  }

  // Sort: /albumcover first, then featured, then Portuguese
  records.sort((a, b) => {
    if (a.shortcut === '/albumcover') return -1;
    if (b.shortcut === '/albumcover') return 1;
    if (a.featured !== b.featured) return b.featured ? 1 : -1;
    return (a.language === 'pt' ? 0 : 1) - (b.language === 'pt' ? 0 : 1);
  });

  // Write chunks
  console.log('\n📦 Escrevendo chunks...');
  const chunkSize = 200;
  for (let start = 0; start < records.length; start += chunkSize) {
    const chunk = records.slice(start, start + chunkSize);
    const chunkId = start / chunkSize;
    const chunkData = {};
    for (const r of chunk) {
      chunkData[r.id] = r.prompt;
    }
    await fs.writeFile(
      path.join(DATA_DIR, `prompts-${chunkId}.json`),
      JSON.stringify(chunkData, null, 0)
    );

    for (const r of chunk) {
      r.chunk = chunkId;
      r.searchTerms = (r.prompt.match(/[A-Za-zÀ-ÿ]{4,}/g) || []).slice(0, 50).join(' ').slice(0, 240);
    }
  }
  console.log(`   ${Math.ceil(records.length / chunkSize)} chunks criados`);

  // Write index.json
  const index = records.map((r) => {
    const { prompt, ...entry } = r;
    return entry;
  });
  await fs.writeFile(path.join(DATA_DIR, 'index.json'), JSON.stringify(index, null, 0));
  console.log('   index.json escrito');

  // Write meta.json
  const meta = {
    updatedAt: new Date().toISOString(),
    total: records.length,
    sources,
    categories: {
      imagens: records.filter((r) => r.category === 'imagens').length,
      escrita: records.filter((r) => r.category === 'escrita').length,
      estudos: records.filter((r) => r.category === 'estudos').length,
      programacao: records.filter((r) => r.category === 'programacao').length,
      negocios: records.filter((r) => r.category === 'negocios').length,
    },
    methodology: 'Registros com texto não vazio; IDs YouMind deduplicados entre categorias e textos normalizados deduplicados entre todas as fontes. Importação verificada não significa eficácia testada. Textos internacionais preservados no idioma disponibilizado pela fonte.',
  };
  await fs.writeFile(path.join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log('   meta.json escrito');

  console.log(`\n✅ Importação concluída: ${records.length} prompts únicos`);
  console.log(JSON.stringify(meta, null, 2));
}

main().catch((err) => {
  console.error('❌ Erro na importação:', err);
  process.exit(1);
});