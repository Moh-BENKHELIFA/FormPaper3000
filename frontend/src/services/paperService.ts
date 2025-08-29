import type { PaperData, Category } from '../types/Paper';

const API_BASE_URL = 'http://localhost:5324/api';

export interface MetadataResponse {
  paperData: PaperData;
}

export interface ExtractedImage {
  name: string;
  url: string;
  page: number;
}

export interface ImageExtractionResponse {
  images: ExtractedImage[];
}

export interface SavePaperResponse {
  success: boolean;
  id: number;
  message: string;
  paper: PaperData;
  stats?: {
    totalPapers: number;
    readPapers: number;
    inProgressPapers: number;
    unreadPapers: number;
    totalCategories: number;
  };
}

export interface HealthResponse {
  status: 'ok' | 'warning' | 'error';
  timestamp: string;
  database: {
    connected: boolean;
    stats: any;
    error: string | null;
  };
}

export interface DiagnosticResponse {
  server: {
    uptime: number;
    memory: any;
    version: string;
  };
  database: {
    connected: boolean;
    canQuery: boolean;
    tablesExist: boolean;
    error?: string;
  };
}

// ✅ Interface pour le cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class PaperService {
  private requestTimeout = 10000; // 10 secondes
  private maxRetries = 3;
  
  // ✅ AJOUT: Système de cache avec Map
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheTimeout = 60000; // 1 minute par défaut
  
  // ✅ Configuration du cache par type de données
  private cacheConfig = {
    papers: 60000,      // 1 minute pour les papers
    categories: 300000, // 5 minutes pour les catégories
    stats: 30000,      // 30 secondes pour les stats
  };

  /**
   * ✅ Méthode pour invalider le cache
   */
  public invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      console.log(`🗑️ Cache invalidé pour: ${key}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Cache entièrement invalidé');
    }
  }

  /**
   * ✅ Méthode pour obtenir des données du cache
   */
  private getFromCache<T>(key: string, maxAge?: number): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const age = Date.now() - cached.timestamp;
    const timeout = maxAge || this.cacheTimeout;
    
    if (age > timeout) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`📦 Utilisation du cache pour: ${key} (âge: ${Math.round(age/1000)}s)`);
    return cached.data as T;
  }

  /**
   * ✅ Méthode pour mettre en cache
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`💾 Mis en cache: ${key}`);
  }

  /**
   * Effectuer une requête avec timeout
   */
  private async fetchWithTimeout(
    url: string, 
    options: RequestInit = {}, 
    timeout: number = this.requestTimeout
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout: La requête vers ${url} a pris trop de temps`);
      }
      throw error;
    }
  }

  /**
   * Effectuer une requête avec retry automatique
   */
  private async fetchWithRetry(
    url: string, 
    options: RequestInit = {}, 
    maxRetries: number = this.maxRetries
  ): Promise<Response> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erreur inconnue');
        
        console.warn(`Tentative ${attempt}/${maxRetries} échouée pour ${url}:`, lastError.message);
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Attendre avant la prochaine tentative (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
    
    throw lastError!;
  }

  // ✅ CORRECTION: getAllPapers avec cache
  async getAllPapers(): Promise<PaperData[]> {
    const cacheKey = 'all-papers';
    
    // Vérifier le cache
    const cached = this.getFromCache<PaperData[]>(cacheKey, this.cacheConfig.papers);
    if (cached !== null) {
      return cached;
    }
    
    try {
      console.log('🔄 Récupération des papers depuis le serveur...');
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      const papers = data.papers || [];
      
      // Mettre en cache
      this.setCache(cacheKey, papers);
      
      return papers;
    } catch (error) {
      console.error('Erreur getAllPapers:', error);
      
      // ✅ En cas d'erreur, retourner les données du cache même expirées
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('⚠️ Utilisation du cache expiré suite à une erreur');
        return staleCache.data as PaperData[];
      }
      
      return [];
    }
  }

  // ✅ CORRECTION: getAllCategories avec cache
  async getAllCategories(): Promise<Category[]> {
    const cacheKey = 'all-categories';
    
    // Vérifier le cache
    const cached = this.getFromCache<Category[]>(cacheKey, this.cacheConfig.categories);
    if (cached !== null) {
      return cached;
    }
    
    try {
      console.log('🔄 Récupération des catégories depuis le serveur...');
      const response = await this.fetchWithRetry(`${API_BASE_URL}/categories`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      const categories = data.categories || [];
      
      // Mettre en cache
      this.setCache(cacheKey, categories);
      
      return categories;
    } catch (error) {
      console.error('Erreur getAllCategories:', error);
      
      // En cas d'erreur, retourner les données du cache même expirées
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('⚠️ Utilisation du cache expiré pour les catégories');
        return staleCache.data as Category[];
      }
      
      return [];
    }
  }

  // Récupérer un paper par ID
  async getPaperById(id: number): Promise<PaperData | null> {
    const cacheKey = `paper-${id}`;
    
    // Vérifier le cache
    const cached = this.getFromCache<PaperData>(cacheKey, this.cacheConfig.papers);
    if (cached !== null) {
      return cached;
    }
    
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      const paper = data.paper || null;
      
      // Mettre en cache si trouvé
      if (paper) {
        this.setCache(cacheKey, paper);
      }
      
      return paper;
    } catch (error) {
      console.error('Erreur getPaperById:', error);
      return null;
    }
  }

  // ✅ CORRECTION: Mettre à jour un paper et invalider le cache
  async updatePaper(id: number, updates: Partial<PaperData>): Promise<PaperData | null> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // ✅ Invalider le cache après mise à jour
      this.invalidateCache('all-papers');
      this.invalidateCache(`paper-${id}`);
      this.invalidateCache('stats');
      
      return data.paper || null;
    } catch (error) {
      console.error('Erreur updatePaper:', error);
      throw error;
    }
  }

  // ✅ CORRECTION: Supprimer un paper et invalider le cache
  async deletePaper(id: number): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // ✅ Invalider le cache après suppression
      this.invalidateCache('all-papers');
      this.invalidateCache(`paper-${id}`);
      this.invalidateCache('stats');
      
      return true;
    } catch (error) {
      console.error('Erreur deletePaper:', error);
      throw error;
    }
  }

  // ✅ CORRECTION: Sauvegarder un paper et invalider le cache
  async savePaper(paperData: PaperData, pdfFile?: File): Promise<SavePaperResponse> {
    try {
      const formData = new FormData();
      
      // Ajouter les données du paper
      Object.entries(paperData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'categories' && Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Ajouter le fichier PDF si fourni
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde du paper');
      }

      // ✅ Invalider le cache après ajout
      this.invalidateCache('all-papers');
      this.invalidateCache('stats');
      
      return data;
    } catch (error) {
      console.error('Erreur savePaper:', error);
      throw error;
    }
  }

  // Récupérer les métadonnées depuis un DOI
  async getMetadataFromDOI(doi: string): Promise<MetadataResponse> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/metadata/doi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doi })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur getMetadataFromDOI:', error);
      throw error;
    }
  }

  // Extraire les images d'un PDF
  async extractImagesFromPDF(file: File): Promise<ImageExtractionResponse> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/extract-images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur extractImagesFromPDF:', error);
      throw error;
    }
  }

  // Upload d'image
  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await this.fetchWithRetry(`${API_BASE_URL}/upload/image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Erreur uploadImage:', error);
      throw error;
    }
  }

  // Créer une nouvelle catégorie
  async createCategory(name: string): Promise<Category> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // ✅ Invalider le cache des catégories
      this.invalidateCache('all-categories');
      
      return data.category;
    } catch (error) {
      console.error('Erreur createCategory:', error);
      throw error;
    }
  }

  // ✅ CORRECTION: getStats avec cache
  async getStats(): Promise<{
    totalPapers: number;
    readPapers: number;
    inProgressPapers: number;
    unreadPapers: number;
    totalCategories: number;
  }> {
    const cacheKey = 'stats';
    
    // Vérifier le cache
    const cached = this.getFromCache<any>(cacheKey, this.cacheConfig.stats);
    if (cached !== null) {
      return cached;
    }
    
    try {
      console.log('📊 Récupération des statistiques...');
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/stats`, {}, 2);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      const stats = data.stats || {};
      
      const formattedStats = {
        totalPapers: Math.max(0, Number(stats.totalPapers) || 0),
        readPapers: Math.max(0, Number(stats.readPapers) || 0),
        inProgressPapers: Math.max(0, Number(stats.inProgressPapers) || 0),
        unreadPapers: Math.max(0, Number(stats.unreadPapers) || 0),
        totalCategories: Math.max(0, Number(stats.totalCategories) || 0)
      };
      
      // Mettre en cache
      this.setCache(cacheKey, formattedStats);
      
      return formattedStats;
      
    } catch (error) {
      console.error('❌ Erreur getStats:', error);
      
      // Essayer de calculer localement
      const alternativeStats = await this.getStatsAlternative();
      if (alternativeStats) {
        this.setCache(cacheKey, alternativeStats);
        return alternativeStats;
      }
      
      // Retourner le cache expiré si disponible
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('⚠️ Utilisation du cache expiré pour les stats');
        return staleCache.data;
      }
      
      // Valeurs par défaut
      return {
        totalPapers: 0,
        readPapers: 0,
        inProgressPapers: 0,
        unreadPapers: 0,
        totalCategories: 0
      };
    }
  }

  /**
   * Méthode alternative pour récupérer les stats en calculant depuis les papers
   */
  private async getStatsAlternative() {
    try {
      console.log('📊 Calcul des stats à partir des papers...');
      
      const [papers, categories] = await Promise.all([
        this.getAllPapers(),
        this.getAllCategories()
      ]);

      const stats = {
        totalPapers: papers.length,
        readPapers: papers.filter(p => p.reading_status === 'lu').length,
        inProgressPapers: papers.filter(p => p.reading_status === 'en_cours').length,
        unreadPapers: papers.filter(p => p.reading_status === 'non_lu').length,
        totalCategories: categories.length
      };

      console.log('✅ Stats calculées localement:', stats);
      return stats;
      
    } catch (error) {
      console.error('❌ Erreur calcul stats alternatif:', error);
      return null;
    }
  }

  // Tester la connexion au serveur
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/health`, {}, 3000);
      return response.ok;
    } catch (error) {
      console.error('❌ Test de connexion échoué:', error);
      return false;
    }
  }

  // Obtenir l'état de santé du serveur
  async getHealth(): Promise<HealthResponse | null> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/health`, {}, 3000);
      
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur getHealth:', error);
      return null;
    }
  }

  // Obtenir les diagnostics du serveur
  async getDiagnostic(): Promise<DiagnosticResponse | null> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/diagnostic`, {}, 5000);
      
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur getDiagnostic:', error);
      return null;
    }
  }

  // Obtenir les statistiques étendues
  async getExtendedStats(): Promise<any> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/stats/extended`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.stats || {};
    } catch (error) {
      console.error('Erreur getExtendedStats:', error);
      return {};
    }
  }

  // Méthodes utilitaires pour le debugging
  async pingServer(): Promise<boolean> {
    try {
      const start = Date.now();
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/health`, {}, 3000);
      const duration = Date.now() - start;
      
      console.log(`🏓 Ping serveur: ${duration}ms, Status: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.error('🏓 Ping échec:', error);
      return false;
    }
  }

  // ✅ AJOUT: Méthode pour obtenir l'état du cache
  getCacheStatus(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  // ✅ AJOUT: Méthode pour nettoyer les entrées expirées du cache
  cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      const maxAge = key.startsWith('paper-') ? this.cacheConfig.papers :
                     key.startsWith('categor') ? this.cacheConfig.categories :
                     key === 'stats' ? this.cacheConfig.stats :
                     this.cacheTimeout;
      
      if (age > maxAge) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Nettoyage du cache: ${cleaned} entrées supprimées`);
    }
  }
}

// Export de l'instance du service
export const paperService = new PaperService();

// ✅ AJOUT: Nettoyage automatique du cache toutes les 5 minutes
setInterval(() => {
  paperService.cleanupCache();
}, 300000);

export default paperService;