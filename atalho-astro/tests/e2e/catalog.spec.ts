/**
 * Atalho - E2E Tests for Catalog
 */

import { test, expect } from '@playwright/test';

test.describe('Catalog Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForLoadState('networkidle');
    // Wait for catalog to load
    await page.waitForSelector('#catalogo', { state: 'visible' });
    await page.waitForSelector('.cards-wrapper', { state: 'visible' });
  });

  test('should load and display catalog with prompts', async ({ page }) => {
    // Check hero section
    await expect(page.locator('#hero')).toBeVisible();
    await expect(page.locator('#hero-title')).toContainText('Sua próxima ideia');

    // Check catalog loads
    await expect(page.locator('#cards-container')).toBeVisible();

    // Wait for prompts to load (not skeletons)
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('.prompt-card');
      return cards.length > 0;
    }, { timeout: 15000 });

    const promptCards = page.locator('.prompt-card');
    await expect(promptCards.first()).toBeVisible();
    const count = await promptCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search should filter prompts', async ({ page }) => {
    const searchInput = page.locator('#search');
    await searchInput.fill('imagem');
    await page.waitForTimeout(200); // debounce

    // Should show filtered results
    const resultCount = page.locator('#result-count');
    await expect(resultCount).toContainText(/prompts? encontrado/);
  });

  test('category tabs should filter prompts', async ({ page }) => {
    // Click on "Escrita" tab
    await page.locator('.tab[data-category="escrita"]').click();
    await page.waitForTimeout(100);

    // Should update active state
    await expect(page.locator('.tab[data-category="escrita"]')).toHaveClass(/active/);

    // Results should be filtered
    const resultCount = page.locator('#result-count');
    await expect(resultCount).toContainText(/prompts? encontrado/);
  });

  test('source filter should work', async ({ page }) => {
    const sourceFilter = page.locator('#source-filter');
    await expect(sourceFilter).toBeVisible();

    // Check options exist
    const options = await sourceFilter.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(1);
    expect(options.some(o => o.includes('Mestre dos Prompts'))).toBeTruthy();
  });

  test('language filter should work', async ({ page }) => {
    const langFilter = page.locator('#language-filter');
    await langFilter.selectOption('pt');
    await page.waitForTimeout(100);

    const resultCount = page.locator('#result-count');
    await expect(resultCount).toContainText(/prompts? encontrado/);
  });

  test('sort should work', async ({ page }) => {
    const sortSelect = page.locator('#sort');
    await sortSelect.selectOption('az');
    await page.waitForTimeout(100);

    // Should update results
    const resultCount = page.locator('#result-count');
    await expect(resultCount).toContainText(/prompts? encontrado/);
  });

  test('pagination should work', async ({ page }) => {
    // Check pagination controls
    await expect(page.locator('#prev-page')).toBeDisabled();
    await expect(page.locator('#page-label')).toContainText('Página 1');

    // If there are multiple pages, next should be enabled
    const nextPage = page.locator('#next-page');
    const isDisabled = await nextPage.isDisabled();

    if (!isDisabled) {
      await nextPage.click();
      await expect(page.locator('#page-label')).toContainText('Página 2');
      await expect(page.locator('#prev-page')).toBeEnabled();
    }
  });

  test('clear filters should reset everything', async ({ page }) => {
    // Apply some filters
    await page.locator('#search').fill('teste');
    await page.locator('.tab[data-category="imagens"]').click();
    await page.waitForTimeout(200);

    // Click clear filters
    await page.locator('#clear-filters').click();
    await page.waitForTimeout(100);

    // Should be reset
    await expect(page.locator('#search')).toHaveValue('');
    await expect(page.locator('.tab[data-category=""]')).toHaveClass(/active/);
  });
});