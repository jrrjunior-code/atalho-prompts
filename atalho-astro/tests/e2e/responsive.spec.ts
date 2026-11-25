/**
 * Atalho - E2E Tests for Responsive Design
 */

import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'large-desktop', width: 1536, height: 864 },
];

for (const viewport of viewports) {
  test.describe(`Responsive: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await page.goto('./');
      await page.waitForLoadState('networkidle');
    });

    test('should display header correctly', async ({ page }) => {
      await expect(page.locator('.topbar')).toBeVisible();

      if (viewport.width <= 1024) {
        // Mobile: hamburger menu visible
        await expect(page.locator('.menu-button')).toBeVisible();
        await expect(page.locator('.sidebar')).toBeHidden();
      } else {
        // Desktop: sidebar visible
        await expect(page.locator('.sidebar')).toBeVisible();
      }
    });

    test('should display catalog grid correctly', async ({ page }) => {
      await page.waitForSelector('.prompt-card', { state: 'visible', timeout: 15000 });

      const cards = page.locator('.prompt-card');
      await expect(cards.first()).toBeVisible();

      // Check grid columns based on viewport
      const firstCard = cards.first();
      const cardStyles = await firstCard.evaluate(el => getComputedStyle(el));
      // Card should have reasonable width
      const width = parseInt(cardStyles.width);
      expect(width).toBeGreaterThan(200);
    });

    test('should open mobile menu on hamburger click', async ({ page }) => {
      if (viewport.width <= 1024) {
        await page.locator('.menu-button').click();
        await expect(page.locator('.sidebar')).toHaveClass(/mobile-open/);
        await expect(page.locator('.mobile-overlay')).toBeVisible();

        // Close menu
        await page.locator('.mobile-overlay').click();
        await expect(page.locator('.sidebar')).not.toHaveClass(/mobile-open/);
      }
    });

    test('modal should be responsive', async ({ page }) => {
      await page.waitForSelector('.prompt-card', { state: 'visible', timeout: 15000 });
      await page.locator('.prompt-card').first().click();

      await expect(page.locator('#prompt-dialog')).toBeVisible();

      // Modal should fit viewport
      const dialog = page.locator('#prompt-dialog');
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox?.width).toBeLessThanOrEqual(viewport.width - 32);
      expect(dialogBox?.height).toBeLessThanOrEqual(viewport.height * 0.9);
    });

    test('footer should be responsive', async ({ page }) => {
      await expect(page.locator('.footer')).toBeVisible();

      if (viewport.width < 480) {
        // Footer should wrap on mobile
        const footerStyles = await page.locator('.footer').evaluate(el => getComputedStyle(el));
        expect(footerStyles.flexWrap).toBe('wrap');
      }
    });
  });
}

test.describe('Touch targets', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prompt-card', { state: 'visible', timeout: 15000 });
  });

  test('buttons should have minimum 44x44px touch targets', async ({ page }) => {
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const btn = buttons.nth(i);
      const box = await btn.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('sidebar navigation items should have adequate touch targets', async ({ page }) => {
    // Open mobile menu
    await page.locator('.menu-button').click();

    const navItems = page.locator('.nav-item:visible');
    const count = await navItems.count();

    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i);
      const box = await item.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});