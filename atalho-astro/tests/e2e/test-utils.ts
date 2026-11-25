/**
 * Atalho - E2E Test Utilities
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Wait for catalog to be fully loaded
 */
export async function waitForCatalogLoad(page: Page): Promise<void> {
  await page.waitForSelector('.prompt-card', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('.prompt-card');
    return cards.length > 0;
  }, { timeout: 15000 });
}

/**
 * Get all visible prompt cards
 */
export async function getPromptCards(page: Page): Promise<Locator[]> {
  return (await page.locator('.prompt-card:visible').all());
}

/**
 * Open first prompt modal
 */
export async function openFirstPromptModal(page: Page): Promise<void> {
  await page.locator('.prompt-card').first().click();
  await page.waitForSelector('#prompt-dialog', { state: 'visible' });
  await page.waitForFunction(() => {
    const textarea = document.querySelector('#prompt-text');
    return textarea && textarea.value && !textarea.value.includes('Carregando');
  }, { timeout: 10000 });
}

/**
 * Fill custom field in modal
 */
export async function fillCustomField(page: Page, index: number, value: string): Promise<void> {
  const inputs = page.locator('#custom-fields input');
  await inputs.nth(index).fill(value);
  await page.waitForTimeout(100);
}

/**
 * Add extra context in modal
 */
export async function addExtraContext(page: Page, context: string): Promise<void> {
  await page.locator('#extra-context').fill(context);
  await page.waitForTimeout(100);
}

/**
 * Toggle Portuguese output in modal
 */
export async function togglePortugueseOutput(page: Page, enabled: boolean): Promise<void> {
  const checkbox = page.locator('#portuguese-output');
  const isChecked = await checkbox.isChecked();
  if (isChecked !== enabled) {
    await checkbox.click();
    await page.waitForTimeout(100);
  }
}

/**
 * Copy prompt from modal
 */
export async function copyModalPrompt(page: Page): Promise<void> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('#copy-prompt').click();
  await expect(page.locator('.toast')).toBeVisible();
}

/**
 * Toggle favorite from card
 */
export async function toggleFavoriteFromCard(page: Page, cardIndex = 0): Promise<void> {
  const cards = await getPromptCards(page);
  await cards[cardIndex].locator('.favorite-button').click();
  await expect(page.locator('.toast')).toBeVisible();
}

/**
 * Toggle favorite from modal
 */
export async function toggleFavoriteFromModal(page: Page): Promise<void> {
  await page.locator('#modal-favorite').click();
  await expect(page.locator('.toast')).toBeVisible();
}

/**
 * Go to favorites view
 */
export async function goToFavoritesView(page: Page): Promise<void> {
  await page.locator('[data-view="favorites"]').click();
  await page.waitForTimeout(100);
  await expect(page.locator('#catalog-title')).toContainText('Seus atalhos favoritos');
}

/**
 * Export favorites
 */
export async function exportFavorites(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-button').click();
  const download = await downloadPromise;
  const content = await download.readableStream().getReader().read();
  return new TextDecoder().decode(content.value);
}

/**
 * Clear all filters
 */
export async function clearFilters(page: Page): Promise<void> {
  await page.locator('#clear-filters').click();
  await page.waitForTimeout(100);
}

/**
 * Set search query
 */
export async function setSearchQuery(page: Page, query: string): Promise<void> {
  await page.locator('#search').fill(query);
  await page.waitForTimeout(200); // debounce
}

/**
 * Select category tab
 */
export async function selectCategory(page: Page, category: string): Promise<void> {
  await page.locator(`.tab[data-category="${category}"]`).click();
  await page.waitForTimeout(100);
}

/**
 * Select source filter
 */
export async function selectSourceFilter(page: Page, sourceId: string): Promise<void> {
  await page.locator('#source-filter').selectOption(sourceId);
  await page.waitForTimeout(100);
}

/**
 * Select language filter
 */
export async function selectLanguageFilter(page: Page, language: string): Promise<void> {
  await page.locator('#language-filter').selectOption(language);
  await page.waitForTimeout(100);
}

/**
 * Select sort order
 */
export async function selectSortOrder(page: Page, sort: string): Promise<void> {
  await page.locator('#sort').selectOption(sort);
  await page.waitForTimeout(100);
}

/**
 * Check toast message
 */
export async function expectToast(page: Page, message: string): Promise<void> {
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('.toast')).toContainText(message);
}

/**
 * Get favorite count
 */
export async function getFavoriteCount(page: Page): Promise<number> {
  const text = await page.locator('#favorite-count').textContent();
  return parseInt(text?.replace(/\D/g, '') || '0', 10);
}

/**
 * Get result count
 */
export async function getResultCount(page: Page): Promise<number> {
  const text = await page.locator('#result-count').textContent();
  const match = text?.match(/(\d+)\s+prompts?/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Check if element has focus
 */
export async function expectFocused(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeFocused();
}

/**
 * Press keyboard shortcut
 */
export async function pressShortcut(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
}

/**
 * Wait for catalog grid to render
 */
export async function waitForVirtualGrid(page: Page): Promise<void> {
  await page.waitForSelector('.cards-wrapper', { state: 'visible' });
  await page.waitForSelector('.prompt-card', { state: 'visible', timeout: 10000 });
}