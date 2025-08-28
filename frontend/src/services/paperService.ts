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

class PaperService {
  private requestTimeout = 10000; // 10 secondes
  private maxRetries = 3;

  /**
   * Effectuer une requête avec timeout et retry automatique
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
        
        // Si la requête réussit (même avec une erreur HTTP), on la retourne
        return response;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erreur inconnue');
        
        console.warn(`Tentative ${attempt}/${maxRetries} échouée pour ${url}:`, lastError.message);
        
        // Si c'est la dernière tentative, on lance l'erreur
        if (attempt === maxRetries) {
          break;
        }
        
        // Attendre avant la prochaine tentative (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
    
    throw lastError!;
  }

  // Récupérer les métadonnées depuis un DOI
  async getMetadataFromDOI(doi: string): Promise<MetadataResponse> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/metadata-from-doi`, {
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

      const data = await response.json();
      return data;
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur extractImagesFromPDF:', error);
      throw error;
    }
  }

  // Extraire les données depuis un PDF
  async extractDataFromPDF(file: File): Promise<MetadataResponse> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/extract-from-pdf`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur extractDataFromPDF:', error);
      throw error;
    }
  }

  // Sauvegarder un paper
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

      return data;
    } catch (error) {
      console.error('Erreur savePaper:', error);
      throw error;
    }
  }

  // Récupérer tous les papers
  async getAllPapers(): Promise<PaperData[]> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.papers || [];
    } catch (error) {
      console.error('Erreur getAllPapers:', error);
      // Retourner un tableau vide plutôt que de lancer une erreur
      return [];
    }
  }

  // Récupérer un paper par ID
  async getPaperById(id: number): Promise<PaperData | null> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.paper || null;
    } catch (error) {
      console.error('Erreur getPaperById:', error);
      return null;
    }
  }

  // Upload d'image
  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/upload-image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Erreur uploadImage:', error);
      throw error;
    }
  }

  // Mettre à jour un paper
  async updatePaper(id: number, updates: Partial<PaperData>): Promise<PaperData> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la mise à jour du paper');
      }

      return data.paper;
    } catch (error) {
      console.error('Erreur updatePaper:', error);
      throw error;
    }
  }

  // Supprimer un paper
  async deletePaper(id: number): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('Erreur deletePaper:', error);
      throw error;
    }
  }

  // Rechercher des papers
  async searchPapers(searchTerm: string): Promise<PaperData[]> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/papers/search/${encodeURIComponent(searchTerm)}`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const papers = await response.json();
      return papers || [];
    } catch (error) {
      console.error('Erreur searchPapers:', error);
      return [];
    }
  }

  // Tester la connexion API avec retry et timeout
  async testConnection(retries = 2, timeout = 3000): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.fetchWithTimeout(`${API_BASE_URL}/health`, {}, timeout);
        
        if (response.ok) {
          const data: HealthResponse = await response.json();
          return data.status === 'ok' || data.status === 'warning';
        }
      } catch (error) {
        console.error(`Tentative ${i + 1}/${retries} de connexion échouée:`, error);
        if (i === retries - 1) {
          return false;
        }
        // Attendre avant la prochaine tentative
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
    return false;
  }

  // Diagnostic de la connexion
  async getDiagnostic(): Promise<DiagnosticResponse | null> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/diagnostic`, {}, 5000);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur getDiagnostic:', error);
      return null;
    }
  }

  // Obtenir les informations de santé du serveur
  async getHealth(): Promise<HealthResponse | null> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5000);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur getHealth:', error);
      return null;
    }
  }

  // Gestion des catégories
  async getAllCategories(): Promise<Category[]> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/categories`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.error('Erreur getAllCategories:', error);
      return [];
    }
  }

  async createCategory(name: string): Promise<{ success: boolean; id: number; category: Category }> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la création de la catégorie');
      }

      return data;
    } catch (error) {
      console.error('Erreur createCategory:', error);
      throw error;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/categories/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('Erreur deleteCategory:', error);
      throw error;
    }
  }

  // Récupérer les statistiques - VERSION ROBUSTE
  async getStats(): Promise<{
    totalPapers: number;
    readPapers: number;
    inProgressPapers: number;
    unreadPapers: number;
    totalCategories: number;
  }> {
    const defaultStats = {
      totalPapers: 0,
      readPapers: 0,
      inProgressPapers: 0,
      unreadPapers: 0,
      totalCategories: 0
    };

    try {
      // Test de connexion léger d'abord
      const healthCheck = await this.getHealth();
      if (!healthCheck) {
        console.warn('⚠️ Service de santé non accessible, retour de stats par défaut');
        return defaultStats;
      }

      // Requête des statistiques avec un timeout plus court
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/papers/stats`, {}, 5000);

      if (!response.ok) {
        console.warn(`⚠️ Erreur HTTP ${response.status} pour les stats`);
        
        // Tenter de récupérer un message d'erreur
        try {
          const errorData = await response.json();
          if (errorData.stats) {
            console.log('📊 Stats par défaut du serveur reçues');
            return this.validateStats(errorData.stats);
          }
        } catch (jsonError) {
          console.warn('Impossible de parser la réponse d\'erreur');
        }
        
        return defaultStats;
      }

      const data = await response.json();
      
      // Vérifier que les stats sont présentes et valides
      if (!data || !data.stats) {
        console.warn('⚠️ Réponse stats invalide:', data);
        return defaultStats;
      }

      // Valider et nettoyer les stats
      const validatedStats = this.validateStats(data.stats);
      
      // Log warning si le serveur a retourné un warning
      if (data.warning) {
        console.warn('⚠️ Warning serveur:', data.warning);
      }

      if (data.error_details) {
        console.warn('⚠️ Détails d\'erreur serveur:', data.error_details);
      }

      console.log('📊 Statistiques validées:', validatedStats);
      return validatedStats;
      
    } catch (error) {
      console.error('❌ Erreur getStats:', error);
      
      // En cas d'erreur réseau, essayer de récupérer les stats via une approche alternative
      try {
        console.log('🔄 Tentative de récupération alternative des stats...');
        const alternativeStats = await this.getStatsAlternative();
        if (alternativeStats) {
          return alternativeStats;
        }
      } catch (altError) {
        console.error('❌ Méthode alternative échouée:', altError);
      }
      
      // Toujours retourner des stats par défaut plutôt que de throw
      return defaultStats;
    }
  }

  /**
   * Valider et nettoyer les statistiques reçues
   */
  private validateStats(stats: any): {
    totalPapers: number;
    readPapers: number;
    inProgressPapers: number;
    unreadPapers: number;
    totalCategories: number;
  } {
    return {
      totalPapers: Math.max(0, Number(stats.totalPapers) || 0),
      readPapers: Math.max(0, Number(stats.readPapers) || 0),
      inProgressPapers: Math.max(0, Number(stats.inProgressPapers) || 0),
      unreadPapers: Math.max(0, Number(stats.unreadPapers) || 0),
      totalCategories: Math.max(0, Number(stats.totalCategories) || 0)
    };
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

  // Obtenir des informations détaillées sur l'état du service
  async getServiceInfo(): Promise<{
    connected: boolean;
    latency: number;
    health: HealthResponse | null;
    diagnostic: DiagnosticResponse | null;
  }> {
    const start = Date.now();
    const connected = await this.testConnection();
    const latency = Date.now() - start;
    
    const health = connected ? await this.getHealth() : null;
    const diagnostic = connected ? await this.getDiagnostic() : null;
    
    return {
      connected,
      latency,
      health,
      diagnostic
    };
  }
}

// Export de l'instance du service
export const paperService = new PaperService();
export default paperService;