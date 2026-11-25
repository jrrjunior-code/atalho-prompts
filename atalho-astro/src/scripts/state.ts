/**
 * Atalho - State Management
 * Reducer-based state management for the app
 */

import type {
  AppState,
  Action,
  PromptMeta,
} from '@/types';
import { normalizeText } from '@/utils/helpers';

export const initialState: AppState = {
  meta: null,
  prompts: [],
  chunks: new Map(),
  ui: {
    sidebarOpen: false,
    searchQuery: '',
    activeCategory: '',
    activeView: 'all',
    sortOrder: 'featured',
    sourceFilter: '',
    languageFilter: '',
    currentPage: 1,
    filteredCount: 0,
    isLoading: true,
    error: null,
  },
  modal: {
    isOpen: false,
    prompt: null,
    promptText: '',
    template: '',
    customFields: [],
    extraContext: '',
    portugueseOutput: false,
    isLoading: false,
    error: null,
  },
  toast: {
    message: '',
    type: 'info',
    visible: false,
  },
  favorites: {
    ids: new Set(),
    count: 0,
  },
  pagination: {
    page: 1,
    pageSize: 24,
    totalPages: 1,
    totalItems: 0,
  },
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_META':
      return { ...state, meta: action.payload };

    case 'SET_PROMPTS':
      return { ...state, prompts: action.payload };

    case 'SET_CHUNK': {
      const newChunks = new Map(state.chunks);
      newChunks.set(action.payload.chunkId, action.payload.data);
      return { ...state, chunks: newChunks };
    }

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        ui: { ...state.ui, searchQuery: action.payload, currentPage: 1 },
        pagination: { ...state.pagination, page: 1 },
      };

    case 'SET_CATEGORY':
      return {
        ...state,
        ui: { ...state.ui, activeCategory: action.payload, currentPage: 1 },
        pagination: { ...state.pagination, page: 1 },
      };

    case 'SET_VIEW':
      return {
        ...state,
        ui: { ...state.ui, activeView: action.payload, activeCategory: '', currentPage: 1 },
        pagination: { ...state.pagination, page: 1 },
      };

    case 'SET_SORT':
      return {
        ...state,
        ui: { ...state.ui, sortOrder: action.payload, currentPage: 1 },
        pagination: { ...state.pagination, page: 1 },
      };

    case 'SET_SOURCE_FILTER':
      return {
        ...state,
        ui: { ...state.ui, sourceFilter: action.payload, currentPage: 1 },
        pagination: { ...state.pagination, page: 1 },
      };

    case 'SET_LANGUAGE_FILTER':
      return {
        ...state,
        ui: { ...state.ui, languageFilter: action.payload, currentPage: 1 },
        pagination: { ...state.pagination, page: 1 },
      };

    case 'SET_PAGE':
      return {
        ...state,
        ui: { ...state.ui, currentPage: action.payload },
        pagination: { ...state.pagination, page: action.payload },
      };

    case 'SET_FILTERED_COUNT':
      return { ...state, ui: { ...state.ui, filteredCount: action.payload } };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        ui: { ...state.ui, sidebarOpen: action.payload ?? !state.ui.sidebarOpen },
      };

    case 'OPEN_MODAL': {
      const prompt = action.payload;
      return {
        ...state,
        modal: {
          ...state.modal,
          isOpen: true,
          prompt,
          promptText: 'Carregando prompt…',
          template: '',
          customFields: [],
          extraContext: '',
          portugueseOutput: false,
          isLoading: true,
          error: null,
        },
      };
    }

    case 'CLOSE_MODAL':
      return { ...state, modal: { ...state.modal, isOpen: false, prompt: null } };

    case 'SET_MODAL_PROMPT_TEXT':
      return { ...state, modal: { ...state.modal, promptText: action.payload } };

    case 'SET_MODAL_TEMPLATE':
      return { ...state, modal: { ...state.modal, template: action.payload } };

    case 'SET_CUSTOM_FIELDS':
      return { ...state, modal: { ...state.modal, customFields: action.payload } };

    case 'UPDATE_CUSTOM_FIELD': {
      const { token, value } = action.payload;
      const fields = state.modal.customFields.map((f) =>
        f.token === token ? { ...f, value } : f
      );
      return { ...state, modal: { ...state.modal, customFields: fields } };
    }

    case 'SET_EXTRA_CONTEXT':
      return { ...state, modal: { ...state.modal, extraContext: action.payload } };

    case 'SET_PORTUGUESE_OUTPUT':
      return { ...state, modal: { ...state.modal, portugueseOutput: action.payload } };

    case 'SET_MODAL_LOADING':
      return { ...state, modal: { ...state.modal, isLoading: action.payload } };

    case 'SET_MODAL_ERROR':
      return { ...state, modal: { ...state.modal, error: action.payload, isLoading: false } };

    case 'SHOW_TOAST':
      return {
        ...state,
        toast: { ...state.toast, ...action.payload, visible: true },
      };

    case 'HIDE_TOAST':
      return { ...state, toast: { ...state.toast, visible: false } };

    case 'TOGGLE_FAVORITE': {
      const id = action.payload;
      const newFavorites = new Set(state.favorites.ids);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return {
        ...state,
        favorites: { ids: newFavorites, count: newFavorites.size },
      };
    }

    case 'SET_FAVORITES': {
      const ids = new Set(action.payload);
      return { ...state, favorites: { ids, count: ids.size } };
    }

    case 'SET_LOADING':
      return { ...state, ui: { ...state.ui, isLoading: action.payload } };

    case 'SET_ERROR':
      return { ...state, ui: { ...state.ui, error: action.payload, isLoading: false } };

    case 'RESET_FILTERS':
      return {
        ...state,
        ui: {
          ...state.ui,
          searchQuery: '',
          activeCategory: '',
          activeView: 'all',
          sortOrder: 'featured',
          sourceFilter: '',
          languageFilter: '',
          currentPage: 1,
        },
        pagination: { ...state.pagination, page: 1 },
      };

    default:
      return state;
  }
}

// Selectors
export const selectFilteredPrompts = (state: AppState): PromptMeta[] => {
  const { prompts, ui, favorites } = state;
  const { searchQuery, activeCategory, activeView, sourceFilter, languageFilter, sortOrder } = ui;

  const terms = normalizeText(searchQuery.trim()).split(/\s+/).filter(Boolean);

  let filtered = prompts.filter((item) => {
    if (activeCategory && item.category !== activeCategory) return false;
    if (activeView === 'favorites' && !favorites.ids.has(item.id)) return false;
    if (sourceFilter && !item.origins.some((o) => o.source === sourceFilter)) return false;
    if (languageFilter && item.language !== languageFilter) return false;
    if (terms.length && !terms.every((t) => item.searchTerms.includes(t))) return false;
    return true;
  });

  if (sortOrder !== 'featured') {
    filtered.sort((a, b) =>
      a.title.localeCompare(b.title, 'pt-BR') * (sortOrder === 'za' ? -1 : 1)
    );
  }

  return filtered;
};

export const selectPaginatedPrompts = (state: AppState): PromptMeta[] => {
  const filtered = selectFilteredPrompts(state);
  const { page, pageSize } = state.pagination;
  const start = (page - 1) * pageSize;
  return filtered.slice(start, start + pageSize);
};

export const selectTotalPages = (state: AppState): number => {
  const filtered = selectFilteredPrompts(state);
  return Math.max(1, Math.ceil(filtered.length / state.pagination.pageSize));
};

export const selectPromptById = (state: AppState, id: string): PromptMeta | undefined =>
  state.prompts.find((p) => p.id === id);

export const selectPromptFull = (state: AppState, id: string): { meta: PromptMeta; prompt: string } | null => {
  const meta = state.prompts.find((p) => p.id === id);
  if (!meta) return null;
  const chunk = state.chunks.get(meta.chunk);
  const prompt = chunk?.[id];
  if (!prompt) return null;
  return { meta, prompt };
};

export const selectIsFavorite = (state: AppState, id: string): boolean =>
  state.favorites.ids.has(id);

export const selectSourcesForFilter = (state: AppState) =>
  state.meta?.sources.filter((s) => s.imported > 0) || [];

export const selectCategoriesWithCounts = (state: AppState) =>
  state.meta?.categories || { imagens: 0, escrita: 0, estudos: 0, programacao: 0, negocios: 0 };