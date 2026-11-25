/**
 * Atalho - Utility Functions
 * Pure helper functions for formatting, normalization, etc.
 */

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('pt-BR').format(n);

export const normalizeText = (s: string): string =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const slugify = (s: string, maxLength = 70): string =>
  normalizeText(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);

export const safeUrl = (value: string): string => {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
};

export const composeCopy = (shortcut: string, body: string): string =>
  `Atalho personalizado ${shortcut}.\n\n${body}`;

export const extractPlaceholders = (text: string): Array<{ token: string; label: string }> => {
  const matches = [...text.matchAll(/\[([^\[\]\n]{1,70})\]|\{\{([^{}\n]{1,70})\}\}/g)];
  const seen = new Map<string, string>();

  for (const m of matches) {
    const token = m[0];
    const label = m[1] || m[2];
    if (label && !token.includes('://') && !seen.has(token)) {
      seen.set(token, label);
    }
  }

  return Array.from(seen.entries())
    .slice(0, 20)
    .map(([token, label]) => ({ token, label }));
};

export const applyPlaceholders = (
  template: string,
  fields: Array<{ token: string; value: string }>,
  extraContext: string,
  portugueseOutput: boolean
): string => {
  let result = template;

  for (const { token, value } of fields) {
    if (value.trim()) {
      result = result.split(token).join(value.trim());
    }
  }

  if (extraContext.trim()) {
    result += '\n\nContexto e preferências adicionais:\n' + extraContext.trim();
  }

  if (portugueseOutput) {
    result += '\n\nResponda em português do Brasil.';
  }

  return result;
};

export const debounce = <T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = <T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const classNames = (...classes: (string | boolean | undefined | null)[]): string =>
  classes.filter(Boolean).join(' ');

export const getInitials = (name: string, max = 2): string =>
  name
    .split(/\s+/)
    .slice(0, max)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const truncate = (str: string, length: number, suffix = '…'): string =>
  str.length > length ? str.slice(0, length - suffix.length) + suffix : str;

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const retry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  };
};

export const generateId = (): string =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

export const parseJsonSafe = <T>(str: string, fallback: T): T => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

export const storageGet = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

export const storageSet = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable
  }
};

export const downloadJson = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
  const host = document.querySelector('dialog[open]') || document.body;
  host.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  textarea.remove();
  return success;
};

export const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    imagens: 'Imagens',
    escrita: 'Escrita',
    estudos: 'Estudos',
    programacao: 'Programação',
    negocios: 'Negócios',
  };
  return labels[category] || category;
};

export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    imagens: '✧',
    escrita: '✎',
    estudos: '▱',
    programacao: '⌘',
    negocios: '↗',
  };
  return icons[category] || '•';
};

export const getCategoryPhrase = (category: string): string => {
  const phrases: Record<string, string> = {
    imagens: 'Imagine o que vem a seguir.',
    escrita: 'Palavras que\nabrem caminhos.',
    estudos: 'Sempre há algo\npara descobrir.',
    programacao: 'Uma ideia.\nInfinitas soluções.',
    negocios: 'O próximo passo\ncomeça aqui.',
  };
  return phrases[category] || '';
};