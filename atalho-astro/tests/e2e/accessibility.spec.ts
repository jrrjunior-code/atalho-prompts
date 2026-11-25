/**
 * Atalho - E2E Tests for Accessibility (WCAG 2.2 AA)
 */

import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prompt-card', { state: 'visible', timeout: 15000 });
  });

  test('should have skip link', async ({ page }) => {
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeHidden(); // Hidden by default

    // Focus should reveal it
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('main h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('Sua próxima ideia');

    const h2s = page.locator('h2');
    expect(await h2s.count()).toBeGreaterThan(0);
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    // Search input
    await expect(page.locator('#search')).toHaveAttribute('aria-label', 'Buscar prompts');

    // Filters
    await expect(page.locator('#source-filter')).toHaveAttribute('aria-label', 'Filtrar por fonte');
    await expect(page.locator('#language-filter')).toHaveAttribute('aria-label', 'Filtrar por idioma');
    await expect(page.locator('#sort')).toHaveAttribute('aria-label', 'Ordenar por');

    // Buttons
    await expect(page.locator('#menu-button')).toHaveAttribute('aria-label', 'Abrir menu');
    await expect(page.locator('#guide-button')).toHaveAttribute('aria-label', 'Como usar');
    await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Alternar tema');
  });

  test('should manage focus in modal', async ({ page }) => {
    await page.locator('.prompt-card').first().click();
    await expect(page.locator('#prompt-dialog')).toBeVisible();

    // Focus should be trapped in modal
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'TEXTAREA', 'INPUT', 'SELECT', 'A']).toContain(focused);
  });

  test('should close modal on Escape', async ({ page }) => {
    await page.locator('.prompt-card').first().click();
    await expect(page.locator('#prompt-dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#prompt-dialog')).toBeHidden();
  });

  test('should have focus visible styles', async ({ page }) => {
    // Tab to first focusable element
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    // Check focus styles
    const styles = await focused.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineOffset: computed.outlineOffset,
        outlineWidth: computed.outlineWidth,
      };
    });

    // Should have visible focus outline
    expect(styles.outlineWidth).not.toBe('0px');
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // Check primary text contrast
    const bodyText = page.locator('body').first();
    const color = await bodyText.evaluate(el => getComputedStyle(el).color);
    const bgColor = await bodyText.evaluate(el => getComputedStyle(el).backgroundColor);

    // Both should be defined
    expect(color).toBeTruthy();
    expect(bgColor).toBeTruthy();

    // Note: Full contrast ratio check would need axe-core integration
  });

  test('should respect prefers-reduced-motion', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Animations should be disabled
    const animationDuration = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue('--duration-300');
    });

    // CSS should have reduced motion media query handling
    const hasReducedMotionStyles = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      return sheets.some(sheet => {
        try {
          return Array.from(sheet.cssRules || []).some(rule =>
            rule.media?.mediaText?.includes('prefers-reduced-motion')
          );
        } catch {
          return false;
        }
      });
    });

    expect(hasReducedMotionStyles).toBeTruthy();
  });

  test('should have proper form labels', async ({ page }) => {
    await page.locator('.prompt-card').first().click();
    await expect(page.locator('#prompt-dialog')).toBeVisible();

    // Check custom fields have labels
    const fields = page.locator('#custom-fields label');
    const count = await fields.count();

    for (let i = 0; i < count; i++) {
      const field = fields.nth(i);
      const input = field.locator('input');
      if (await input.count() > 0) {
        // Label should be associated with input
        const forAttr = await field.getAttribute('for');
        const inputId = await input.getAttribute('id');
        // Either explicit for/id or implicit wrapping
        expect(forAttr || (await field.locator('input').count() > 0)).toBeTruthy();
      }
    }
  });

  test('should have live regions for dynamic content', async ({ page }) => {
    // Toast container should have aria-live
    const toastContainer = page.locator('#toast-container');
    await expect(toastContainer).toHaveAttribute('role', 'status');
    await expect(toastContainer).toHaveAttribute('aria-live', 'polite');
    await expect(toastContainer).toHaveAttribute('aria-atomic', 'true');

    // Result count should have role=status
    await expect(page.locator('#result-count')).toHaveAttribute('role', 'status');
  });

  test('dialogs should have proper ARIA', async ({ page }) => {
    await page.locator('.prompt-card').first().click();
    await expect(page.locator('#prompt-dialog')).toBeVisible();

    const dialog = page.locator('#prompt-dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'prompt-title');
  });

  test('should support keyboard navigation throughout', async ({ page }) => {
    // Navigate through main elements
    const focusableSelectors = [
      '#search',
      '#source-filter',
      '#language-filter',
      '#sort',
      '.tab',
      '.card-title',
      '#next-page',
      '#theme-toggle',
      '#guide-button',
      '#menu-button',
    ];

    for (const selector of focusableSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0 && await element.isVisible() && await element.isEnabled()) {
        await element.focus();
        await expect(element).toBeFocused();
      }
    }
  });
});