/**
 * Atalho - E2E Tests for Favorites
 */

import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test.describe('Favorites', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prompt-card', { state: 'visible', timeout: 15000 });
  });

  test('should add prompt to favorites from card', async ({ page }) => {
    const firstCard = page.locator('.prompt-card').first();
    const favButton = firstCard.locator('.favorite-button');

    // Click favorite button
    await favButton.click();

    // Should show toast
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('Salvo');

    // Button should show filled heart
    await expect(favButton).toHaveText('♥');
    await expect(favButton).toHaveClass(/saved/);

    // Favorite count should update
    await expect(page.locator('#favorite-count')).not.toHaveText('0');
  });

  test('should remove prompt from favorites', async ({ page }) => {
    const firstCard = page.locator('.prompt-card').first();
    const favButton = firstCard.locator('.favorite-button');

    // Add to favorites first
    await favButton.click();
    await expect(page.locator('.toast')).toContainText('Salvo');

    // Remove from favorites
    await favButton.click();
    await expect(page.locator('.toast')).toContainText('removido');

    // Button should show empty heart
    await expect(favButton).toHaveText('♡');
    await expect(favButton).not.toHaveClass(/saved/);
  });

  test('should show favorites view', async ({ page }) => {
    // Add a prompt to favorites
    const firstCard = page.locator('.prompt-card').first();
    await firstCard.locator('.favorite-button').click();
    await expect(page.locator('.toast')).toContainText('Salvo');

    // Click favorites in sidebar
    const menu = page.locator('#menu-button');
    if (await menu.isVisible()) await menu.click();
    await page.locator('[data-view="favorites"]').click();
    await page.waitForTimeout(100);

    // Should show favorites view
    await expect(page.locator('#catalogo')).toBeVisible();
    await expect(page.locator('#catalog-title')).toContainText('Seus atalhos favoritos');

    // Should show the favorited prompt
    await expect(page.locator('.prompt-card')).toBeVisible();
  });

  test('should export favorites as JSON', async ({ page }) => {
    // Add a prompt to favorites
    const firstCard = page.locator('.prompt-card').first();
    await firstCard.locator('.favorite-button').click();
    await expect(page.locator('.toast')).toContainText('Salvo');

    // Go to favorites view
    const menu = page.locator('#menu-button');
    if (await menu.isVisible()) await menu.click();
    await page.locator('[data-view="favorites"]').click();
    await page.waitForTimeout(100);

    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-button').click();
    const download = await downloadPromise;

    // Check download
    expect(download.suggestedFilename()).toBe('atalho-favoritos.json');

    // Read and validate JSON
    const text = await readFile(await download.path(), 'utf8');
    const data = JSON.parse(text);

    expect(data).toHaveProperty('exportedAt');
    expect(data).toHaveProperty('prompts');
    expect(Array.isArray(data.prompts)).toBeTruthy();
    expect(data.prompts.length).toBeGreaterThan(0);
    expect(data.prompts[0]).toHaveProperty('id');
    expect(data.prompts[0]).toHaveProperty('title');
    expect(data.prompts[0].prompt).toEqual(expect.stringMatching(/\S/));
  });

  test('should persist favorites across page reloads', async ({ page }) => {
    // Add a prompt to favorites
    const firstCard = page.locator('.prompt-card').first();
    const title = await firstCard.locator('.card-title').textContent();
    await firstCard.locator('.favorite-button').click();
    await expect(page.locator('.toast')).toContainText('Salvo');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prompt-card', { state: 'visible', timeout: 15000 });

    // Favorite count should persist
    await expect(page.locator('#favorite-count')).not.toHaveText('0');

    // Go to favorites view
    const menu = page.locator('#menu-button');
    if (await menu.isVisible()) await menu.click();
    await page.locator('[data-view="favorites"]').click();
    await page.waitForTimeout(100);

    // Should still show the favorited prompt
    const favTitle = page.locator('.card-title').first();
    await expect(favTitle).toContainText(title || '');
  });

  test('should sync favorites across tabs', async ({ page, context }) => {
    // Add a prompt to favorites in first tab
    const firstCard = page.locator('.prompt-card').first();
    await firstCard.locator('.favorite-button').click();
    await expect(page.locator('.toast')).toContainText('Salvo');

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('./');
    await page2.waitForLoadState('networkidle');
    await page2.waitForSelector('.prompt-card', { state: 'visible', timeout: 15000 });

    // Favorite count should sync
    await expect(page2.locator('#favorite-count')).not.toHaveText('0');
  });
});