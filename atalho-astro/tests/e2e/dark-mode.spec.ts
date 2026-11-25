/**
 * Atalho - E2E Tests for Dark Mode
 */

import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForLoadState('networkidle');
  });

  test('should respect system prefers-color-scheme', async ({ page }) => {
    // Check initial theme (depends on system)
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    expect(['light', 'dark']).toContain(theme);
  });

  test('should toggle theme with button', async ({ page }) => {
    const themeToggle = page.locator('#theme-toggle');
    await expect(themeToggle).toBeVisible();

    // Get initial theme
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');

    // Click toggle
    await themeToggle.click();
    await page.waitForTimeout(100);

    // Theme should change
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
    expect(newTheme).toBe(initialTheme === 'light' ? 'dark' : 'light');

    // Toggle back
    await themeToggle.click();
    await page.waitForTimeout(100);

    const finalTheme = await html.getAttribute('data-theme');
    expect(finalTheme).toBe(initialTheme);
  });

  test('should persist theme preference in localStorage', async ({ page }) => {
    const themeToggle = page.locator('#theme-toggle');
    const html = page.locator('html');

    // Toggle to dark
    const initialTheme = await html.getAttribute('data-theme');
    if (initialTheme === 'light') {
      await themeToggle.click();
      await page.waitForTimeout(100);
    }

    // Check localStorage
    const stored = await page.evaluate(() => localStorage.getItem('atalho-theme'));
    expect(stored).toBe('dark');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be dark
    const reloadedTheme = await html.getAttribute('data-theme');
    expect(reloadedTheme).toBe('dark');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`keeps text legible without hover in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('.prompt-card').first()).toBeVisible();
      await page.mouse.move(0, 0);

      const selectors = [
        '#catalog-title', '#catalog-description', '#result-count', '#search',
        '#source-filter', '#language-filter', '.tab.active', '.card-title',
        '.card-code', '.card-description', 'a.card-source', '.card-copy',
      ];

      if (await page.locator('.sidebar').isVisible()) {
        selectors.push('.workspace-label', '.nav-item.active', '.category-nav .nav-item');
      }

      const contrastFor = async (selector: string) => {
        return page.locator(selector).first().evaluate((element) => {
          const luminance = (color: string) => {
            const channels = color.match(/[\d.]+/g)!.slice(0, 3).map((component) => {
              const value = Number(component) / 255;
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
          };

          const styles = getComputedStyle(element, element.id === 'search' ? '::placeholder' : null);
          const text = luminance(styles.color);
          for (let node: Element | null = element; node; node = node.parentElement) {
            const fill = getComputedStyle(node).backgroundColor;
            if (fill !== 'rgba(0, 0, 0, 0)' && fill !== 'transparent') {
              const background = luminance(fill);
              return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
            }
          }
          throw new Error('Could not resolve the background');
        });
      };

      for (const selector of selectors) {
        expect(await contrastFor(selector), selector).toBeGreaterThanOrEqual(4.5);
      }

      await page.locator('.card-title').first().click();
      await expect(page.locator('#prompt-text')).toBeEditable();
      for (const selector of ['#prompt-title', '#prompt-description', '#prompt-text', '.source-line a', '#copy-prompt']) {
        expect(await contrastFor(selector), selector).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
