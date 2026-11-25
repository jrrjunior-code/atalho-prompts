/**
 * Atalho - E2E Tests for Prompt Modal
 */

import { test, expect } from '@playwright/test';

test.describe('Prompt Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prompt-card', { state: 'visible', timeout: 15000 });
  });

  test('should open modal when clicking a prompt card', async ({ page }) => {
    const firstCard = page.locator('.prompt-card').first();
    await firstCard.click();

    // Modal should open
    await expect(page.locator('#prompt-dialog')).toBeVisible();
    await expect(page.locator('#prompt-dialog')).toHaveAttribute('open', '');

    // Modal should have title
    await expect(page.locator('#prompt-title')).toBeVisible();
    await expect(page.locator('#prompt-shortcut')).toBeVisible();

    // Close modal
    await page.locator('#prompt-dialog .close-dialog').click();
    await expect(page.locator('#prompt-dialog')).toBeHidden();
  });

  test('should load prompt text in modal', async ({ page }) => {
    const firstCard = page.locator('.prompt-card').first();
    await firstCard.click();

    // Wait for prompt to load
    await page.waitForFunction(() => {
      const textarea = document.querySelector('#prompt-text');
      return textarea && textarea.value && !textarea.value.includes('Carregando');
    }, { timeout: 10000 });

    const promptText = page.locator('#prompt-text');
    await expect(promptText).not.toHaveValue('Carregando prompt…');
    await expect(promptText).not.toHaveValue('');
  });

  test('should show custom fields for placeholders', async ({ page }) => {
    const firstCard = page.locator('.prompt-card').first();
    await firstCard.click();

    // Wait for modal to load
    await page.waitForSelector('#custom-fields', { state: 'visible' });

    // Check if fields are rendered (might be "no fields" message)
    const fieldsPanel = page.locator('#custom-fields');
    await expect(fieldsPanel).toBeVisible();
  });

  test('should update prompt text when filling custom fields', async ({ page }) => {
    const firstCard = page.locator('.prompt-card').first();
    await firstCard.click();

    // Wait for prompt to load and fields to render
    await page.waitForFunction(() => {
      const textarea = document.querySelector('#prompt-text');
      return textarea && textarea.value && !textarea.value.includes('Carregando');
    }, { timeout: 10000 });

    // Check if there are input fields
    const inputs = page.locator('#custom-fields input');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      // Fill first field
      await inputs.first().fill('teste personalizado');
      await page.waitForTimeout(100);

      // Prompt text should update
      const promptText = page.locator('#prompt-text');
      const value = await promptText.inputValue();
      expect(value).toContain('teste personalizado');
    }
  });

  test('should copy prompt to clipboard', async ({ page }) => {
    // Grant clipboard permission
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    const firstCard = page.locator('.prompt-card').first();
    await firstCard.click();

    // Wait for prompt to load
    await page.waitForFunction(() => {
      const textarea = document.querySelector('#prompt-text');
      return textarea && textarea.value && !textarea.value.includes('Carregando');
    }, { timeout: 10000 });

    await page.locator('#prompt-text').fill('Texto editado para copiar');
    await page.locator('#copy-prompt').click();

    await expect(page.locator('#dialog-status')).toContainText('copiado');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe('Texto editado para copiar');
  });

  test('should toggle favorite from modal', async ({ page }) => {
    const firstCard = page.locator('.prompt-card').first();
    await firstCard.click();

    // Wait for modal to load
    await page.waitForSelector('#modal-favorite', { state: 'visible' });

    // Click favorite button
    await page.locator('#modal-favorite').click();

    // Should show toast
    await expect(page.locator('.toast')).toBeVisible();

    // Button should show filled heart
    await expect(page.locator('#modal-favorite')).toHaveText('♥ Salvo nos favoritos');

    // Close modal
    await page.locator('#prompt-dialog .close-dialog').click();

    // Favorite count should update
    await expect(page.locator('#favorite-count')).not.toHaveText('0');
  });

  test('should add extra context', async ({ page }) => {
    const firstCard = page.locator('.prompt-card').first();
    await firstCard.click();

    await page.waitForFunction(() => {
      const textarea = document.querySelector('#prompt-text');
      return textarea && textarea.value && !textarea.value.includes('Carregando');
    }, { timeout: 10000 });

    // Fill extra context
    await page.locator('#extra-context').fill('Contexto de teste para E2E');
    await page.waitForTimeout(100);

    // Prompt text should include context
    const promptText = page.locator('#prompt-text');
    const value = await promptText.inputValue();
    expect(value).toContain('Contexto de teste para E2E');
  });

  test('should toggle Portuguese output', async ({ page }) => {
    const firstCard = page.locator('.prompt-card').first();
    await firstCard.click();

    await page.waitForFunction(() => {
      const textarea = document.querySelector('#prompt-text');
      return textarea && textarea.value && !textarea.value.includes('Carregando');
    }, { timeout: 10000 });

    // Check portuguese output checkbox
    await page.locator('#portuguese-output').check();
    await page.waitForTimeout(100);

    // Prompt text should include Portuguese instruction
    const promptText = page.locator('#prompt-text');
    const value = await promptText.inputValue();
    expect(value).toContain('Responda em português do Brasil');
  });
});