/**
 * Atalho - Generate Sitemap
 * Creates sitemap.xml for SEO
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const BASE_URL = 'https://jrrjunior-code.github.io/atalho-prompts';

async function main() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="pt-BR" href="${BASE_URL}/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/" />
  </url>
</urlset>`;

  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
  console.log('✅ Sitemap generated at dist/sitemap.xml');
}

main().catch((err) => {
  console.error('❌ Failed to generate sitemap:', err);
  process.exit(1);
});