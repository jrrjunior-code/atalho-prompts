/**
 * Atalho - Catalog Island
 * Interactive catalog with search, filters, pagination, and favorites
 */

import { loadAllData, getPromptText } from '@/scripts/data-loader';
import {
  appReducer,
  initialState,
  selectFilteredPrompts,
  selectPaginatedPrompts,
  selectTotalPages,
  selectSourcesForFilter,
  selectPromptById,
  selectIsFavorite,
} from '@/scripts/state';
import {
  formatNumber,
  extractPlaceholders,
  composeCopy,
  copyToClipboard,
  downloadJson,
  getCategoryLabel,
  debounce,
} from '@/utils/helpers';
import type { PromptMeta, Category, Language, SortOrder, ViewMode } from '@/types';

// State
let state = { ...initialState };

// DOM Elements
const elements = {
  search: document.getElementById('search') as HTMLInputElement,
  sourceFilter: document.getElementById('source-filter') as HTMLSelectElement,
  languageFilter: document.getElementById('language-filter') as HTMLSelectElement,
  sort: document.getElementById('sort') as HTMLSelectElement,
  tabs: document.querySelectorAll('.tab'),
  categoryButtons: document.querySelectorAll('[data-category]'),
  viewButtons: document.querySelectorAll('[data-view]'),
  clearFilters: document.getElementById('clear-filters') as HTMLButtonElement,
  prevPage: document.getElementById('prev-page') as HTMLButtonElement,
  nextPage: document.getElementById('next-page') as HTMLButtonElement,
  cards: document.getElementById('cards') as HTMLDivElement,
  empty: document.getElementById('empty') as HTMLDivElement,
  resultCount: document.getElementById('result-count') as HTMLSpanElement,
  pageLabel: document.getElementById('page-label') as HTMLSpanElement,
  exportButton: document.getElementById('export-button') as HTMLButtonElement,
  favoriteCount: document.getElementById('favorite-count') as HTMLSpanElement,
  categoryCounts: document.querySelectorAll('[data-count]'),
  heroTotal: document.getElementById('hero-total') as HTMLSpanElement,
  catalogTotal: document.getElementById('catalog-total') as HTMLSpanElement,
  emptyReset: document.getElementById('empty-reset') as HTMLButtonElement,
  pagination: document.querySelector('.pagination') as HTMLElement,
};

// Toast
let toastTimer: ReturnType<typeof setTimeout> | null = null;
const toastContainer = document.getElementById('toast-container') as HTMLDivElement;

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  if (toastTimer) clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} toast-enter`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  toastTimer = setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

// Dispatch function
function dispatch(action: any): void {
  state = appReducer(state, action);
  render();
}

// Load favorites from localStorage
function loadFavorites(): void {
  try {
    const saved = JSON.parse(localStorage.getItem('atalho-favorites') || '[]');
    if (Array.isArray(saved)) {
      dispatch({ type: 'SET_FAVORITES', payload: saved.filter((x): x is string => typeof x === 'string') });
    }
  } catch {
    // Ignore
  }
}

function persistFavorites(): void {
  try {
    localStorage.setItem('atalho-favorites', JSON.stringify([...state.favorites.ids]));
  } catch {
    showToast('Favorito salvo nesta sessão. O armazenamento local está indisponível.', 'error');
  }
}

// Render functions
function render(): void {
  renderCounts();
  renderSourceFilter();
  renderCards();
  renderPagination();
  renderNavigation();
  renderEmptyState();
  renderExportButton();
  updateFavoriteCount();
}

function renderCounts(): void {
  const { meta } = state;
  if (!meta) return;

  elements.heroTotal.textContent = `${formatNumber(meta.total)} prompts para explorar`;
  elements.catalogTotal.textContent = `${formatNumber(meta.total)} prompts únicos`;
  elements.categoryCounts.forEach((el) => {
    const key = el.getAttribute('data-count');
    if (key && meta.categories[key as Category]) {
      el.textContent = formatNumber(meta.categories[key as Category]);
    }
  });
}

function renderSourceFilter(): void {
  const sources = selectSourcesForFilter(state);
  const currentValue = elements.sourceFilter.value;

  elements.sourceFilter.innerHTML = '<option value="">Todas as fontes</option>';
  sources.forEach((s) => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = `${s.name} (${formatNumber(s.imported)})`;
    elements.sourceFilter.appendChild(option);
  });

  elements.sourceFilter.value = currentValue;
}

function renderCards(): void {
  const paginated = selectPaginatedPrompts(state);

  if (!paginated.length) {
    elements.cards.innerHTML = '';
    elements.cards.setAttribute('aria-busy', 'false');
    return;
  }

  elements.cards.innerHTML = paginated.map((item) => {
    const isFav = selectIsFavorite(state, item.id);
    const source = state.meta?.sources.find((s) => s.id === item.origins[0]?.source);
    return createCardHTML(item, source?.name || 'Fonte original', source?.model || 'ChatGPT', isFav);
  }).join('');

  elements.cards.setAttribute('aria-busy', 'false');

  // Attach event listeners
  attachCardListeners();
}

function createCardHTML(item: PromptMeta, sourceName: string, sourceModel: string, isFavorite: boolean): string {
  const categoryNames: Record<string, string> = {
    imagens: 'Imagens',
    escrita: 'Escrita',
    estudos: 'Estudos',
    programacao: 'Programação',
    negocios: 'Negócios',
  };
  const categoryIcons: Record<string, string> = {
    imagens: '✧',
    escrita: '✎',
    estudos: '▱',
    programacao: '⌘',
    negocios: '↗',
  };
  const categoryPhrases: Record<string, string> = {
    imagens: 'Imagine o que vem a seguir.',
    escrita: 'Palavras que<br>abrem caminhos.',
    estudos: 'Sempre há algo<br>para descobrir.',
    programacao: 'Uma ideia.<br>Infinitas soluções.',
    negocios: 'O próximo passo<br>começa aqui.',
  };

  const look = item.category;
  const categoryLabel = categoryNames[look] || look;
  const symbol = categoryIcons[look] || '•';
  const phrase = categoryPhrases[look] || '';
  const safeImage = item.image && /^https?:\/\//.test(item.image) ? item.image : '';

  const phraseLines = phrase.split('<br>').map((line, i) =>
    i > 0 ? `<br>${line}` : line
  ).join('');

  return `
    <article class="prompt-card" role="listitem" data-prompt-id="${item.id}">
      <div class="card-cover ${look}">
        <div class="cover-art">
          <div class="cover-text">
            <small>${symbol}  ATALHO PARA ${categoryLabel.toUpperCase()}</small>
            ${phraseLines}
          </div>
        </div>
        ${safeImage ? `<img src="${safeImage}" alt="Exemplo da fonte: ${item.title}" loading="lazy" decoding="async" referrerpolicy="no-referrer" class="cover-image" onerror="this.remove()">` : ''}
        <button class="cover-open" aria-label="Personalizar: ${item.title}" data-prompt-id="${item.id}" type="button"></button>
        <button class="favorite-button ${isFavorite ? 'saved' : ''}" data-favorite-id="${item.id}" aria-label="${isFavorite ? `Remover dos favoritos: ${item.title}` : `Salvar favorito: ${item.title}`}" aria-pressed="${isFavorite}" type="button">${isFavorite ? '♥' : '♡'}</button>
        ${item.featured ? `<span class="card-badge">${item.shortcut === '/albumcover' ? '✳ Atalho em destaque' : '✦ Seleção editorial'}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-category">
          ${categoryLabel}
          <span class="model-badge">${sourceModel}</span>
        </div>
        <button class="card-title" data-prompt-id="${item.id}" type="button">${escapeHtml(item.title)}</button>
        <code class="card-code">${escapeHtml(item.shortcut)}</code>
        <p class="card-description">${item.description || (item.language === 'pt' ? 'Personalize os detalhes e transforme esta ideia em algo seu.' : 'Prompt internacional. Explore o original e personalize o resultado.')}</p>
      </div>
      <div class="card-footer">
        ${item.origins[0]?.url ? `<a href="${item.origins[0].url}" target="_blank" rel="noopener noreferrer" class="card-source">${escapeHtml(sourceName)}</a>` : `<span class="card-source">${escapeHtml(sourceName)}</span>`}
        <button class="btn btn-secondary btn-sm card-copy" data-copy-id="${item.id}" type="button">Copiar prompt ⧉</button>
      </div>
    </article>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function attachCardListeners(): void {
  // Cover open / title click
  elements.cards.querySelectorAll('[data-prompt-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-prompt-id');
      if (id) openPrompt(id);
    });
  });

  // Favorite button
  elements.cards.querySelectorAll('[data-favorite-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-favorite-id');
      if (id) toggleFavorite(id);
    });
  });

  // Copy button
  elements.cards.querySelectorAll('[data-copy-id]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-copy-id');
      if (id) await quickCopy(id, btn as HTMLButtonElement);
    });
  });
}

function renderPagination(): void {
  const totalPages = selectTotalPages(state);
  const { page } = state.pagination;

  elements.pageLabel.textContent = `Página ${formatNumber(page)} de ${formatNumber(totalPages)}`;
  elements.prevPage.disabled = page <= 1;
  elements.nextPage.disabled = page >= totalPages;
  elements.pagination.hidden = selectFilteredPrompts(state).length === 0;
}

function renderNavigation(): void {
  // Category tabs
  elements.tabs.forEach((btn) => {
    const active = btn.getAttribute('data-category') === state.ui.activeCategory;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // Sidebar category buttons
  document.querySelectorAll('[data-category]').forEach((btn) => {
    const active = btn.getAttribute('data-category') === state.ui.activeCategory && state.ui.activeView === 'all';
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // View buttons
  document.querySelectorAll('[data-view]').forEach((btn) => {
    const active = btn.getAttribute('data-view') === state.ui.activeView && !state.ui.activeCategory;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // Update breadcrumb and titles
  const catalogTitle = document.getElementById('catalog-title');
  const catalogDesc = document.getElementById('catalog-description');
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  const hero = document.getElementById('hero');
  const discoveryStrip = document.querySelector('.discovery-strip');

  if (state.ui.activeView === 'favorites') {
    catalogTitle!.textContent = 'Seus atalhos favoritos.';
    catalogDesc!.textContent = 'Seu repertório pessoal, salvo neste navegador.';
    breadcrumbCurrent!.textContent = 'Favoritos';
    hero?.setAttribute('hidden', '');
    (discoveryStrip as HTMLElement)?.setAttribute('hidden', '');
  } else {
    catalogTitle!.textContent = 'Explore as possibilidades.';
    catalogDesc!.textContent = 'Um bom prompt pode mudar o que você cria hoje.';
    breadcrumbCurrent!.textContent = getCategoryLabel(state.ui.activeCategory) || 'Explorar';
    hero?.removeAttribute('hidden');
    (discoveryStrip as HTMLElement)?.removeAttribute('hidden');
  }
}

function renderEmptyState(): void {
  const filtered = selectFilteredPrompts(state);
  elements.empty.hidden = filtered.length !== 0;

  if (!filtered.length) {
    const h3 = elements.empty.querySelector('h3');
    const p = elements.empty.querySelector('p');

    if (state.ui.activeView === 'favorites' && !state.favorites.ids.size) {
      h3!.textContent = 'Suas melhores descobertas moram aqui.';
      p!.textContent = 'Toque no coração de um prompt para salvar e encontrar depois.';
    } else {
      h3!.textContent = 'Nenhum prompt com esses filtros.';
      p!.textContent = 'Tente outro termo ou explore uma nova categoria.';
    }
  }
}

function renderExportButton(): void {
  elements.exportButton.hidden = state.ui.activeView !== 'favorites' || !state.favorites.ids.size;
}

function updateFavoriteCount(): void {
  elements.favoriteCount.textContent = formatNumber(state.favorites.count);
}

// Actions
function applyFilters(resetPage = false): void {
  if (resetPage) {
    dispatch({ type: 'SET_PAGE', payload: 1 });
  }

  const filtered = selectFilteredPrompts(state);
  dispatch({ type: 'SET_FILTERED_COUNT', payload: filtered.length });
}

async function quickCopy(itemId: string, button: HTMLButtonElement): Promise<void> {
  button.disabled = true;
  try {
    const item = selectPromptById(state, itemId);
    if (!item) throw new Error('Prompt não encontrado');
    const promptBody = await getPromptText(item);
    const text = composeCopy(item.shortcut, promptBody);
    await copyToClipboard(text);
    showToast('Prompt copiado. Agora é só criar!', 'success');
  } catch {
    await openPrompt(itemId);
    showToast('Não foi possível copiar. Selecione o texto no editor.', 'error');
  } finally {
    button.disabled = false;
  }
}

function toggleFavorite(itemId: string): void {
  const wasFavorite = selectIsFavorite(state, itemId);
  dispatch({ type: 'TOGGLE_FAVORITE', payload: itemId });
  persistFavorites();

  // Update all favorite buttons for this item
  document.querySelectorAll(`[data-favorite-id="${itemId}"]`).forEach((btn) => {
    const isFav = selectIsFavorite(state, itemId);
    btn.classList.toggle('saved', isFav);
    btn.setAttribute('aria-label', (isFav ? 'Remover dos favoritos: ' : 'Salvar favorito: ') + (selectPromptById(state, itemId)?.title || ''));
    btn.setAttribute('aria-pressed', String(isFav));
    (btn as HTMLButtonElement).textContent = isFav ? '♥' : '♡';
  });

  // Update modal if open
  const modalFav = document.getElementById('modal-favorite');
  if (modalFav && state.modal.prompt?.id === itemId) {
    const isFav = selectIsFavorite(state, itemId);
    modalFav.textContent = isFav ? '♥ Salvo nos favoritos' : '♡ Salvar favorito';
    modalFav.classList.toggle('saved', isFav);
  }

  showToast(wasFavorite ? 'Prompt removido dos favoritos.' : 'Salvo! Seu próximo atalho está nos favoritos.', wasFavorite ? 'info' : 'success');

  if (state.ui.activeView === 'favorites') {
    applyFilters();
  }
}

async function openPrompt(itemId: string): Promise<void> {
  const item = selectPromptById(state, itemId);
  if (!item) return;

  const ticket = Date.now();
  dispatch({ type: 'OPEN_MODAL', payload: item });

  const dialog = document.getElementById('prompt-dialog') as HTMLDialogElement;
  dialog.showModal();
  dialog.scrollTop = 0;

  // Update modal UI immediately
  document.getElementById('prompt-title')!.textContent = item.title;
  document.getElementById('prompt-shortcut')!.textContent = item.shortcut;
  document.getElementById('prompt-category')!.textContent = getCategoryLabel(item.category);
  document.getElementById('prompt-description')!.textContent = item.description || 'Um ponto de partida para você adaptar.';

  const promptTextArea = document.getElementById('prompt-text') as HTMLTextAreaElement;
  promptTextArea.value = 'Carregando prompt…';
  promptTextArea.disabled = true;
  (document.getElementById('copy-prompt') as HTMLButtonElement).disabled = true;

  document.getElementById('custom-fields')!.innerHTML = '';
  (document.getElementById('extra-context') as HTMLTextAreaElement).value = '';
  (document.getElementById('portuguese-output') as HTMLInputElement).checked = false;

  const source = state.meta?.sources.find((s) => s.id === item.origins[0]?.source);
  const labels = [source?.model || 'ChatGPT', item.language === 'pt' ? 'Português' : 'Idioma original da fonte', 'Atalho personalizado'];
  if (item.reference) labels.push('Requer imagem de referência');
  document.getElementById('prompt-metadata')!.innerHTML = labels.map(l => `<span>${escapeHtml(l)}</span>`).join('');

  const links = ['<span>Fonte:</span>'];
  item.origins.forEach((origin) => {
    const s = state.meta?.sources.find((src) => src.id === origin.source);
    links.push(origin.url ? `<a href="${origin.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s?.name || 'Fonte original')}</a>` : `<span>${escapeHtml(s?.name || 'Seleção editorial')}</span>`);
  });
  document.getElementById('prompt-sources')!.innerHTML = links.join('');

  // Update favorite button in modal
  const modalFav = document.getElementById('modal-favorite') as HTMLButtonElement;
  const isFav = selectIsFavorite(state, itemId);
  modalFav.textContent = isFav ? '♥ Salvo nos favoritos' : '♡ Salvar favorito';
  modalFav.classList.toggle('saved', isFav);

  try {
    const text = await getPromptText(item);
    if (Date.now() !== ticket || !dialog.open) return;

    dispatch({ type: 'SET_MODAL_TEMPLATE', payload: text });
    dispatch({ type: 'SET_MODAL_LOADING', payload: false });

    const placeholders = extractPlaceholders(text);
    if (!placeholders.length) {
      document.getElementById('custom-fields')!.innerHTML = '<p class="field-hint">Este prompt não tem campos marcados. Adapte o texto no editor ou acrescente seu contexto abaixo.</p>';
    } else {
      document.getElementById('custom-fields')!.innerHTML = placeholders.map(({ token, label }) => `
        <label class="field-label">
          ${escapeHtml(label)}
          <input type="text" placeholder="${escapeHtml(label)}" data-token="${escapeHtml(token)}" />
        </label>
      `).join('');

      // Attach listeners
      document.querySelectorAll('#custom-fields input').forEach((input) => {
        input.addEventListener('input', updatePromptText);
      });
    }

    promptTextArea.disabled = false;
    (document.getElementById('copy-prompt') as HTMLButtonElement).disabled = false;
    updatePromptText();
  } catch {
    if (Date.now() !== ticket) return;
    promptTextArea.value = 'Não foi possível carregar o texto. Feche e abra o prompt para tentar novamente.';
    showToast('Falha ao carregar. Verifique sua conexão.', 'error');
  }
}

function updatePromptText(): void {
  const template = state.modal.template;
  if (!template) return;

  let text = template;

  document.querySelectorAll<HTMLInputElement>('#custom-fields input').forEach((input) => {
    const token = input.getAttribute('data-token');
    const value = input.value.trim();
    if (token && value) {
      text = text.split(token).join(value);
    }
  });

  const context = (document.getElementById('extra-context') as HTMLTextAreaElement).value.trim();
  if (context) text += '\n\nContexto e preferências adicionais:\n' + context;

  if ((document.getElementById('portuguese-output') as HTMLInputElement).checked) {
    text += '\n\nResponda em português do Brasil.';
  }

  (document.getElementById('prompt-text') as HTMLTextAreaElement).value = text;
}

async function copyModalPrompt(): Promise<void> {
  try {
    const text = (document.getElementById('prompt-text') as HTMLTextAreaElement).value;
    await copyToClipboard(text);
    showToast('Seu prompt personalizado foi copiado!', 'success');
  } catch {
    const textarea = document.getElementById('prompt-text') as HTMLTextAreaElement;
    textarea.focus();
    textarea.select();
    showToast('Texto selecionado. Use Ctrl+C ou a opção Copiar.', 'error');
  }
}

async function exportFavorites(): Promise<void> {
  const button = elements.exportButton;
  button.disabled = true;

  try {
    const saved = await Promise.all(
      [...state.favorites.ids].map(async (id) => {
        const item = selectPromptById(state, id);
        if (!item) return null;
        const prompt = await getPromptText(item);
        return {
          id: item.id,
          title: item.title,
          shortcut: item.shortcut,
          category: getCategoryLabel(item.category),
          sources: item.origins,
          prompt,
        };
      })
    );

    const valid = saved.filter(Boolean);
    downloadJson({ exportedAt: new Date().toISOString(), prompts: valid }, 'atalho-favoritos.json');
    showToast('Favoritos exportados.', 'success');
  } catch {
    showToast('Não foi possível exportar. Tente novamente.', 'error');
  } finally {
    button.disabled = false;
  }
}

function closeMenu(): void {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobile-overlay');
  const menuButton = document.getElementById('menu-button');

  sidebar?.classList.remove('mobile-open');
  overlay?.setAttribute('hidden', '');
  menuButton?.setAttribute('aria-expanded', 'false');
}

function goToCatalog(): void {
  document.getElementById('catalogo')?.scrollIntoView({ block: 'start', behavior: 'instant' });
}

function resetFilters(): void {
  dispatch({ type: 'RESET_FILTERS' });
  elements.search.value = '';
  elements.sourceFilter.value = '';
  elements.languageFilter.value = '';
  elements.sort.value = 'featured';
  closeMenu();
}

// Event Listeners
function setupEventListeners(): void {
  // Search
  elements.search.addEventListener('input', debounce(() => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: elements.search.value });
    applyFilters(true);
  }, 120));

  // Filters
  elements.sourceFilter.addEventListener('change', () => {
    dispatch({ type: 'SET_SOURCE_FILTER', payload: elements.sourceFilter.value });
    applyFilters(true);
  });

  elements.languageFilter.addEventListener('change', () => {
    dispatch({ type: 'SET_LANGUAGE_FILTER', payload: elements.languageFilter.value as Language });
    applyFilters(true);
  });

  elements.sort.addEventListener('change', () => {
    dispatch({ type: 'SET_SORT', payload: elements.sort.value as SortOrder });
    applyFilters(true);
  });

  // Category tabs
  elements.tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category') as Category | '';
      dispatch({ type: 'SET_CATEGORY', payload: category });
      applyFilters(true);
      closeMenu();
      if (btn.closest('.sidebar')) goToCatalog();
    });
  });

  // Sidebar category buttons
  document.querySelectorAll('[data-category]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category') as Category | '';
      dispatch({ type: 'SET_CATEGORY', payload: category });
      applyFilters(true);
      closeMenu();
      if (btn.closest('.sidebar')) goToCatalog();
    });
  });

  // View buttons
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view') as ViewMode;
      dispatch({ type: 'SET_VIEW', payload: view });
      closeMenu();
      if (view === 'favorites') goToCatalog();
    });
  });

  // Clear filters
  elements.clearFilters.addEventListener('click', resetFilters);

  // Empty reset
  elements.emptyReset.addEventListener('click', () => {
    dispatch({ type: 'SET_VIEW', payload: 'all' });
    resetFilters();
  });

  // Pagination
  elements.prevPage.addEventListener('click', () => {
    dispatch({ type: 'SET_PAGE', payload: state.pagination.page - 1 });
    render();
    goToCatalog();
  });

  elements.nextPage.addEventListener('click', () => {
    dispatch({ type: 'SET_PAGE', payload: state.pagination.page + 1 });
    render();
    goToCatalog();
  });

  // Mobile menu
  document.getElementById('menu-button')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    const menuButton = document.getElementById('menu-button');
    const open = sidebar?.classList.toggle('mobile-open');
    if (overlay) overlay.hidden = !open;
    menuButton?.setAttribute('aria-expanded', String(open));
  });

  document.getElementById('mobile-overlay')?.addEventListener('click', closeMenu);

  // Guide buttons
  ['guide-button', 'bottom-guide'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', showGuide);
  });

  // Sources buttons
  ['sources-button', 'footer-sources'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => {
      closeMenu();
      showSources();
    });
  });

  // Hero album cover
  ['hero-album', 'hero-album-label'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => {
      const item = state.prompts.find((i) => i.shortcut === '/albumcover');
      if (item) openPrompt(item.id);
      else showToast('Carregando a biblioteca. Tente novamente em instantes.', 'info');
    });
  });

  // Dialog close
  document.querySelectorAll('.close-dialog').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('dialog')?.close();
    });
  });

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  });

  // Prompt dialog close handler
  document.getElementById('prompt-dialog')?.addEventListener('close', () => {
    dispatch({ type: 'CLOSE_MODAL' });
  });

  // Modal favorite
  document.getElementById('modal-favorite')?.addEventListener('click', () => {
    if (state.modal.prompt) toggleFavorite(state.modal.prompt.id);
  });

  // Copy modal prompt
  document.getElementById('copy-prompt')?.addEventListener('click', copyModalPrompt);

  // Export favorites
  elements.exportButton.addEventListener('click', exportFavorites);

  // Modal inputs
  document.getElementById('extra-context')?.addEventListener('input', updatePromptText);
  document.getElementById('portuguese-output')?.addEventListener('change', updatePromptText);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName || '') && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      elements.search.focus();
      goToCatalog();
    }
  });

  // Storage sync
  window.addEventListener('storage', (e) => {
    if (e.key !== 'atalho-favorites') return;
    try {
      const value = JSON.parse(e.newValue || '[]');
      if (Array.isArray(value)) {
        dispatch({ type: 'SET_FAVORITES', payload: value.filter((v): v is string => typeof v === 'string') });
      }
    } catch {
      return;
    }
    updateFavoriteCount();
    applyFilters();
    if (state.modal.prompt) {
      const modalFav = document.getElementById('modal-favorite');
      if (modalFav) {
        const isFav = selectIsFavorite(state, state.modal.prompt.id);
        modalFav.textContent = isFav ? '♥ Salvo nos favoritos' : '♡ Salvar favorito';
        modalFav.classList.toggle('saved', isFav);
      }
    }
  });

  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
}

// Theme
function toggleTheme(): void {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('atalho-theme', isDark ? 'light' : 'dark');
  document.getElementById('theme-toggle')?.setAttribute('aria-pressed', String(!isDark));
}

function initTheme(): void {
  const saved = localStorage.getItem('atalho-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : prefersDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-toggle')?.setAttribute('aria-pressed', String(isDark));
}

// Guide dialog
function showGuide(): void {
  const content = document.getElementById('info-content');
  if (!content) return;
  content.innerHTML = `
    <h2 id="info-title">Da ideia à criação, em três passos.</h2>
    <p>Você não precisa começar com uma página em branco.</p>
    <div class="guide-step">
      <span>01</span>
      <div>
        <h3>Encontre seu ponto de partida</h3>
        <p>Busque um tema, escolha uma categoria ou explore os destaques. O coração salva o prompt nos favoritos deste navegador.</p>
      </div>
    </div>
    <div class="guide-step">
      <span>02</span>
      <div>
        <h3>Deixe com a sua cara</h3>
        <p>Abra um card, preencha os campos e acrescente contexto. O texto é editável. Os prompts internacionais mantêm o idioma da fonte; você pode solicitar a resposta em português.</p>
      </div>
    </div>
    <div class="guide-step">
      <span>03</span>
      <div>
        <h3>Copie e faça acontecer</h3>
        <p>Copie o prompt completo e cole no ChatGPT ou no modelo indicado. Quando necessário, envie uma imagem de referência. Ajuste o resultado com novas instruções.</p>
      </div>
    </div>
    <div class="info-note">
      <p>O que é um /atalho? É um nome para uma instrução personalizada, não um comando oficial ou secreto do ChatGPT. Copie o texto completo para comunicar o efeito desejado. Prompts de Nano Banana Pro foram escritos para outro modelo e podem precisar de adaptação.</p>
    </div>
  `;
  (document.getElementById('info-dialog') as HTMLDialogElement | null)?.showModal();
}

// Sources dialog
function showSources(): void {
  if (!state.meta) {
    showToast('O catálogo ainda está carregando.', 'info');
    return;
  }

  const content = document.getElementById('info-content');
  if (!content) return;
  const youmind = state.meta.sources.filter((s) => s.id.startsWith('youmind'));

  content.innerHTML = `
    <h2 id="info-title">Números reais. Fontes à vista.</h2>
    <p>A biblioteca conta os textos que foram efetivamente importados, remove duplicatas exatas normalizadas e mantém as fontes de cada registro. "Importado" não significa que o resultado foi testado no modelo.</p>

    <div class="source-summary">
      <div><strong>${formatNumber(state.meta.total)}</strong> prompts únicos no catálogo</div>
      <div><strong>${formatNumber(youmind.reduce((n, s) => n + s.extracted, 0))}</strong> IDs YouMind recuperados</div>
      <div><strong>34.004</strong> prompts anunciados pela YouMind</div>
    </div>

    <div class="source-table-wrap">
      <table class="source-table">
        <thead>
          <tr><th>Fonte</th><th>Anunciados</th><th>Extraídos</th><th>Textos distintos¹</th></tr>
        </thead>
        <tbody>
          ${state.meta.sources.map((s) => `
            <tr>
              <td>${s.url ? `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.name)} ↗</a>` : escapeHtml(s.name)}</td>
              <td>${s.announced !== null ? formatNumber(s.announced) : '—'}</td>
              <td>${formatNumber(s.extracted)}</td>
              <td>${s.imported !== null ? formatNumber(s.imported) : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <p>¹ Um mesmo texto pode pertencer a mais de uma fonte, por isso a soma desta coluna não corresponde ao total global. Categorias sobrepostas da YouMind foram deduplicadas por ID antes da extração. Os itens anunciados que não estavam nos arquivos públicos não foram inventados nem contabilizados como importados.</p>
    <p>${state.meta.methodology}</p>
    <p>Interface e seleção editorial em português. Os demais textos são preservados no idioma disponibilizado pela fonte. As categorias gerais foram atribuídas automaticamente e podem ser refinadas. Os nomes /atalho dos prompts internacionais foram gerados para navegação nesta biblioteca.</p>
    <p>Créditos: as imagens de exemplo e os prompts pertencem aos respectivos autores. prompts.chat publica seus dados sob CC0; as demais fontes mantêm suas próprias condições. Consulte o repositório ou a publicação original. As instruções do Instagram foram expandidas editorialmente a partir das descrições publicadas.</p>
    <p>Última importação: ${new Date(state.meta.updatedAt).toLocaleString('pt-BR')}. Favoritos são guardados somente neste navegador; você pode exportá-los.</p>
  `;
  (document.getElementById('info-dialog') as HTMLDialogElement | null)?.showModal();
}

// Initialize
async function init(): Promise<void> {
  initTheme();
  loadFavorites();

  try {
    elements.cards.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    elements.cards.setAttribute('aria-busy', 'true');
    elements.resultCount.textContent = 'Carregando fontes e prompts…';

    const { meta, prompts } = await loadAllData();

    dispatch({ type: 'SET_META', payload: meta });
    dispatch({ type: 'SET_PROMPTS', payload: prompts });

    // Filter out favorites that no longer exist
    const validFavorites = [...state.favorites.ids].filter((id) => prompts.some((p) => p.id === id));
    if (validFavorites.length !== state.favorites.ids.size) {
      dispatch({ type: 'SET_FAVORITES', payload: validFavorites });
    }

    setupEventListeners();
    applyFilters(true);
  } catch (err) {
    console.error(err);
    elements.cards.innerHTML = '';
    elements.cards.setAttribute('aria-busy', 'false');
    elements.resultCount.textContent = 'Não foi possível carregar o catálogo.';
    elements.heroTotal.textContent = 'Biblioteca temporariamente indisponível';
    elements.catalogTotal.textContent = 'Falha no carregamento';

    const retry = document.createElement('button');
    retry.className = 'btn btn-secondary';
    retry.textContent = 'Tentar carregar novamente';
    retry.addEventListener('click', () => {
      retry.remove();
      init();
    });
    elements.cards.appendChild(retry);
  }
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};