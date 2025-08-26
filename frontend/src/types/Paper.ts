// Types pour les statuts de lecture des papers
export type ReadingStatus = 'non_lu' | 'en_cours' | 'lu' | 'favoris';

// Interface pour une catégorie
export interface Category {
  id: number;
  name: string;
}

// Interface principale pour un Paper
export interface PaperData {
  id?: number;
  title: string;
  authors: string;
  publication_date: string;
  conference?: string | null;
  conference_abbreviation?: string | null;
  reading_status: ReadingStatus;
  image?: string | null;
  doi: string;
  url: string;
  folder_path?: string | null;
  created_at?: string;
  
  // Relations
  categories?: Category[];
  description?: Description | null;
}

// Interface pour les descriptions
export interface Description {
  id?: number;
  paper_id: number;
  texte?: string | null;
  images?: string | null; // JSON string contenant un array d'URLs d'images
}

// Interface pour les liaisons Paper-Category
export interface PaperCategory {
  id?: number;
  paper_id: number;
  categorie_id: number;
}

// Type pour les filtres de recherche
export interface SearchFilters {
  query?: string;
  reading_status?: ReadingStatus | 'all';
  categories?: number[];
  year?: number;
  conference?: string;
}

// Interface pour les statistiques
export interface Statistics {
  totalPapers: number;
  readPapers: number;
  inProgressPapers: number;
  unreadPapers: number;
  totalCategories: number;
}

// Interface pour les statistiques étendues
export interface ExtendedStatistics extends Statistics {
  readingStats: {
    [key in ReadingStatus]: number;
  };
  papersByYear: {
    [year: number]: number;
  };
  averagePapersPerCategory: number;
}

// Type pour les options de tri
export type SortBy = 'title' | 'authors' | 'publication_date' | 'conference' | 'created_at';
export type SortOrder = 'asc' | 'desc';

// Interface pour les options de tri
export interface SortOptions {
  sortBy: SortBy;
  sortOrder: SortOrder;
}

// Interface pour la pagination
export interface PaginationOptions {
  page: number;
  limit: number;
}

// Interface pour les résultats paginés
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Type pour les résultats de recherche
export type SearchResult = PaginatedResult<PaperData>;

// Interface pour les métadonnées extraites d'un DOI
export interface DOIMetadata {
  title: string;
  authors: string;
  doi: string;
  url: string;
  publication_date: string;
  conference?: string;
  abstract?: string;
  keywords?: string[];
}

// Interface pour les images extraites d'un PDF
export interface ExtractedImage {
  name: string;
  url: string;
  page: number;
  width?: number;
  height?: number;
}

// Interface pour les données extraites d'un PDF
export interface PDFExtraction {
  metadata?: Partial<PaperData>;
  images?: ExtractedImage[];
  text?: string;
}

// Types pour les réponses API
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Interface pour la réponse de sauvegarde d'un paper
export interface SavePaperResponse extends APIResponse {
  id: number;
  paper: PaperData;
  stats?: Statistics;
}

// Interface pour la réponse de création de catégorie
export interface CreateCategoryResponse extends APIResponse {
  id: number;
  category: Category;
}

// Types pour les erreurs
export interface APIError {
  error: string;
  message: string;
  status?: number;
  details?: any;
}

// Type pour les actions de gestion des papers
export type PaperAction = 'create' | 'read' | 'update' | 'delete';

// Interface pour les permissions (si implémentées plus tard)
export type PaperPermissions = {
  [key in PaperAction]: boolean;  // ✅ Correct: mapped type dans type alias
};

// Types pour les notifications/messages
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  timestamp?: Date;
}

// Interface pour l'état de chargement
export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

// Interface pour l'état global de l'application
export interface AppState {
  papers: PaperData[];
  categories: Category[];
  statistics: Statistics;
  loading: LoadingState;
  error: APIError | null;
  selectedPaper: PaperData | null;
  filters: SearchFilters;
  sortOptions: SortOptions;
}

// Types pour les hooks personnalisés
export interface UsePapersReturn {
  papers: PaperData[];
  loading: boolean;
  error: APIError | null;
  fetchPapers: () => Promise<void>;
  createPaper: (paper: Omit<PaperData, 'id'>) => Promise<PaperData>;
  updatePaper: (id: number, updates: Partial<PaperData>) => Promise<PaperData>;
  deletePaper: (id: number) => Promise<boolean>;
  searchPapers: (query: string) => Promise<PaperData[]>;
}

export interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: APIError | null;
  fetchCategories: () => Promise<void>;
  createCategory: (name: string) => Promise<Category>;
  deleteCategory: (id: number) => Promise<boolean>;
}

export interface UseStatisticsReturn {
  statistics: Statistics;
  loading: boolean;
  error: APIError | null;
  fetchStatistics: () => Promise<void>;
  refreshStatistics: () => void;
}

// Types pour la validation des formulaires
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

// Interface pour les données de formulaire d'ajout de paper
export interface PaperFormData extends Omit<PaperData, 'id' | 'created_at'> {
  pdfFile?: File;
  imageFile?: File;
  extractedImages?: ExtractedImage[];
  selectedCategoryIds?: number[];
}

// Configuration pour l'affichage des statuts
export interface StatusConfig {
  icon: string;
  text: string;
  color: string;
  backgroundColor?: string;
}

// Configuration des statuts de lecture
export const READING_STATUS_CONFIGS = {
  non_lu: {
    icon: '📖',
    text: 'Non lu',
    color: 'text-gray-600',
    backgroundColor: 'bg-gray-100'
  },
  en_cours: {
    icon: '📚',
    text: 'En cours',
    color: 'text-yellow-600',
    backgroundColor: 'bg-yellow-100'
  },
  lu: {
    icon: '✅',
    text: 'Lu',
    color: 'text-green-600',
    backgroundColor: 'bg-green-100'
  },
  favoris: {
    icon: '⭐',
    text: 'Favoris',
    color: 'text-red-600',
    backgroundColor: 'bg-red-100'
  }
} as const;

// Fonction utilitaire pour obtenir la configuration d'un statut
export function getStatusConfig(status: ReadingStatus): StatusConfig {
  return READING_STATUS_CONFIGS[status] || READING_STATUS_CONFIGS.non_lu;
}

// Fonction utilitaire pour valider un DOI
export function isValidDOI(doi: string): boolean {
  const doiPattern = /^10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+$/;
  return doiPattern.test(doi);
}

// Fonction utilitaire pour formater une date
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

// Fonction utilitaire pour formater les auteurs
export function formatAuthors(authors: string, maxLength: number = 50): string {
  if (authors.length <= maxLength) {
    return authors;
  }
  
  const truncated = authors.substring(0, maxLength);
  const lastComma = truncated.lastIndexOf(',');
  
  if (lastComma > 0) {
    return truncated.substring(0, lastComma) + ' et al.';
  }
  
  return truncated + '...';
}

// Fonction utilitaire pour générer un slug à partir du titre
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Constantes utiles
export const DEFAULT_PAPER: Omit<PaperData, 'title' | 'authors' | 'doi' | 'url'> = {
  publication_date: new Date().toISOString().split('T')[0],
  reading_status: 'non_lu',
  conference: null,
  image: null,
  categories: []
};

export const PAPER_FORM_VALIDATION: ValidationRules = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 500
  },
  authors: {
    required: true,
    minLength: 2,
    maxLength: 1000
  },
  doi: {
    required: true,
    custom: (value: string) => isValidDOI(value) ? null : 'Format DOI invalide'
  },
  url: {
    required: true,
    pattern: /^https?:\/\/.+/
  },
  publication_date: {
    required: true
  }
};

// Export par défaut (seulement les valeurs, pas les types)
export default {
  getStatusConfig,
  isValidDOI,
  formatDate,
  formatAuthors,
  generateSlug,
  DEFAULT_PAPER,
  PAPER_FORM_VALIDATION,
  READING_STATUS_CONFIGS
};