/**
 * Atalho - TypeScript Type Definitions
 * Core types for prompts, categories, sources, and app state
 */

export type Category = 'imagens' | 'escrita' | 'estudos' | 'programacao' | 'negocios';
export type Language = 'pt' | 'original';
export type SortOrder = 'featured' | 'az' | 'za';
export type ViewMode = 'all' | 'favorites';

export interface Source {
  id: string;
  name: string;
  url: string;
  model: string;
  announced: number | null;
  imported: number;
  extracted: number;
  manifestTotal?: number;
}

export interface Origin {
  source: string;
  url: string;
}

export interface PromptMeta {
  id: string;
  title: string;
  shortcut: string;
  category: Category;
  language: Language;
  description: string | null;
  origins: Origin[];
  featured: boolean;
  reference: boolean;
  image: string;
  chunk: number;
  searchTerms: string;
}

export interface PromptFull extends PromptMeta {
  prompt: string;
}

export interface MetaData {
  updatedAt: string;
  total: number;
  sources: Source[];
  categories: Record<Category, number>;
  methodology: string;
}

export interface ChunkData {
  [promptId: string]: string;
}

export interface SearchFilters {
  query: string;
  category: Category | '';
  source: string;
  language: Language | '';
  sort: SortOrder;
  view: ViewMode;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

export interface UIState {
  sidebarOpen: boolean;
  searchQuery: string;
  activeCategory: Category | '';
  activeView: ViewMode;
  sortOrder: SortOrder;
  sourceFilter: string;
  languageFilter: Language | '';
  currentPage: number;
  filteredCount: number;
  isLoading: boolean;
  error: string | null;
}

export interface ModalState {
  isOpen: boolean;
  prompt: PromptMeta | null;
  promptText: string;
  template: string;
  customFields: CustomField[];
  extraContext: string;
  portugueseOutput: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface CustomField {
  token: string;
  label: string;
  value: string;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

export interface FavoritesState {
  ids: Set<string>;
  count: number;
}

export interface AppState {
  meta: MetaData | null;
  prompts: PromptMeta[];
  chunks: Map<number, ChunkData>;
  ui: UIState;
  modal: ModalState;
  toast: ToastState;
  favorites: FavoritesState;
  pagination: PaginationState;
}

export type Action =
  | { type: 'SET_META'; payload: MetaData }
  | { type: 'SET_PROMPTS'; payload: PromptMeta[] }
  | { type: 'SET_CHUNK'; payload: { chunkId: number; data: ChunkData } }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_CATEGORY'; payload: Category | '' }
  | { type: 'SET_VIEW'; payload: ViewMode }
  | { type: 'SET_SORT'; payload: SortOrder }
  | { type: 'SET_SOURCE_FILTER'; payload: string }
  | { type: 'SET_LANGUAGE_FILTER'; payload: Language | '' }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_FILTERED_COUNT'; payload: number }
  | { type: 'TOGGLE_SIDEBAR'; payload?: boolean }
  | { type: 'OPEN_MODAL'; payload: PromptMeta }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_MODAL_PROMPT_TEXT'; payload: string }
  | { type: 'SET_MODAL_TEMPLATE'; payload: string }
  | { type: 'SET_CUSTOM_FIELDS'; payload: CustomField[] }
  | { type: 'UPDATE_CUSTOM_FIELD'; payload: { token: string; value: string } }
  | { type: 'SET_EXTRA_CONTEXT'; payload: string }
  | { type: 'SET_PORTUGUESE_OUTPUT'; payload: boolean }
  | { type: 'SET_MODAL_LOADING'; payload: boolean }
  | { type: 'SET_MODAL_ERROR'; payload: string | null }
  | { type: 'SHOW_TOAST'; payload: { message: string; type: ToastState['type'] } }
  | { type: 'HIDE_TOAST' }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'SET_FAVORITES'; payload: string[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_FILTERS' };

export interface ImportedPrompt {
  id: string;
  title: string;
  shortcut: string;
  category: Category;
  language: Language;
  description: string | null;
  origins: Origin[];
  featured: boolean;
  reference: boolean;
  image: string;
  prompt: string;
  searchTerms: string;
}

export interface CuratedItem {
  shortcut: string;
  title: string;
  description: string;
  category: Category;
  prompt: string;
}

export interface InstagramItem {
  code: string;
  title: string;
  prompt: string;
  category: Category;
}

export interface MaestroItem {
  number: string;
  code: string;
  description: string;
  prompt?: string;
  format?: string;
}

export interface PromptsChatRow {
  act: string;
  prompt: string;
  for_devs?: string;
  type?: string;
}

export interface YouMindManifest {
  totalPrompts: number;
  categories: Array<{ file: string; name: string }>;
}

export interface YouMindItem {
  id: string | number;
  title: string;
  content: string;
  description?: string;
  sourceMedia?: string[];
  needReferenceImages?: boolean;
}

export interface GitHubReadmeItem {
  title: string;
  body: string;
}