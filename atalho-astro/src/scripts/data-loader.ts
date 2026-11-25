/**
 * Atalho - Data Loader
 * Handles loading of meta, index, and chunk data
 */

import type { MetaData, PromptMeta, ChunkData } from '@/types';
import { getCategoryLabel, normalizeText } from '@/utils/helpers';

const DATA_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data/`;

export async function loadMeta(): Promise<MetaData> {
  const res = await fetch(`${DATA_BASE}meta.json`);
  if (!res.ok) throw new Error('Falha ao carregar meta.json');
  return res.json();
}

export async function loadIndex(): Promise<PromptMeta[]> {
  const res = await fetch(`${DATA_BASE}index.json`);
  if (!res.ok) throw new Error('Falha ao carregar index.json');
  const entries: PromptMeta[] = await res.json();
  return entries.map((entry, position) => ({
    ...entry,
    // Earlier imports stored records in batches of 200 without explicit chunk IDs.
    chunk: entry.chunk ?? Math.floor(position / 200),
    searchTerms: normalizeText([
      entry.title,
      entry.shortcut,
      entry.description,
      getCategoryLabel(entry.category),
      entry.searchTerms,
    ].join(' ')),
  }));
}

export async function loadChunk(chunkId: number): Promise<ChunkData> {
  const res = await fetch(`${DATA_BASE}prompts-${chunkId}.json`);
  if (!res.ok) throw new Error(`Falha ao carregar prompts-${chunkId}.json`);
  return res.json();
}

export async function loadAllData(): Promise<{
  meta: MetaData;
  prompts: PromptMeta[];
}> {
  const [meta, prompts] = await Promise.all([loadMeta(), loadIndex()]);
  return { meta, prompts };
}

const chunkCache = new Map<number, Promise<ChunkData>>();

export function getChunkPromise(chunkId: number): Promise<ChunkData> {
  if (!chunkCache.has(chunkId)) {
    chunkCache.set(chunkId, loadChunk(chunkId).catch((err) => {
      chunkCache.delete(chunkId);
      throw err;
    }));
  }
  return chunkCache.get(chunkId)!;
}

export async function getPromptText(prompt: PromptMeta): Promise<string> {
  const chunk = await getChunkPromise(prompt.chunk);
  const text = chunk[prompt.id];
  if (typeof text !== 'string') throw new Error('Texto indisponível');
  return text;
}

export function clearChunkCache(): void {
  chunkCache.clear();
}