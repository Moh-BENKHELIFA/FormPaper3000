// services/paperService.ts

const API_BASE_URL = 'http://localhost:5324/api';

export interface PaperData {
  id?: number;
  title: string;
  authors: string;
  doi: string;
  conference: string;
  conference_abbreviation?: string;
  publication_date: string;
  url: string;
  image: string;
  reading_status: 'non_lu' | 'en_cours' | 'lu';
  created_at?: string;
  categories?: Category[];
}

export interface Category {
  id: number;
  name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class PaperService {
  // Dictionnaire des abréviations de conférences communes
  private conferenceAbbreviations: { [key: string]: string } = {
    // CHI et ACM
    'CHI': 'CHI',
    'Conference on Human Factors in Computing Systems': 'CHI',
    'ACM Conference on Human Factors in Computing Systems': 'CHI',
    'SIGCHI': 'CHI',
    
    // UIST
    'UIST': 'UIST',
    'User Interface Software and Technology': 'UIST',
    'ACM Symposium on User Interface Software and Technology': 'UIST',
    
    // TEI
    'TEI': 'TEI',
    'Tangible and Embedded Interaction': 'TEI',
    'International Conference on Tangible, Embedded and Embodied Interaction': 'TEI',
    
    // Nature
    'Nature': 'Nature',
    'Nature Communications': 'Nat Commun',
    'Nature Methods': 'Nat Methods',
    
    // Science
    'Science': 'Science',
    'Science Advances': 'Sci Adv',
    
    // IEEE
    'IEEE Computer Graphics and Applications': 'IEEE CG&A',
    'IEEE Transactions on Visualization and Computer Graphics': 'IEEE TVCG',
    'IEEE Transactions on Computers': 'IEEE TC',
    
    // Autres conférences populaires
    'SIGGRAPH': 'SIGGRAPH',
    'ICML': 'ICML',
    'NIPS': 'NeurIPS',
    'NeurIPS': 'NeurIPS',
    'ICLR': 'ICLR',
    'CVPR': 'CVPR',
    'ICCV': 'ICCV',
    'ECCV': 'ECCV'
  };

  // Fonction pour obtenir l'abréviation d'une conférence
  getConferenceAbbreviation(conferenceName: string): string {
    if (!conferenceName) return '';
    
    // Chercher une correspondance exacte
    if (this.conferenceAbbreviations[conferenceName]) {
      return this.conferenceAbbreviations[conferenceName];
    }
    
    // Chercher une correspondance partielle
    for (const [fullName, abbrev] of Object.entries(this.conferenceAbbreviations)) {
      if (conferenceName.toLowerCase().includes(fullName.toLowerCase()) ||
          fullName.toLowerCase().includes(conferenceName.toLowerCase())) {
        return abbrev;
      }
    }
    
    // Si aucune correspondance, retourner le nom original tronqué si trop long
    return conferenceName.length > 15 ? conferenceName.substring(0, 15) + '...' : conferenceName;
  }

  // Fonction pour extraire le DOI depuis une URL
  extractDoiFromUrl(url: string): string {
    try {
      // Pattern pour extraire le DOI depuis différents formats d'URL
      const doiPatterns = [
        /doi\.org\/(.+?)(?:\?|$)/,                     // https://doi.org/10.1145/...
        /dx\.doi\.org\/(.+?)(?:\?|$)/,                 // https://dx.doi.org/10.1145/...
        /dl\.acm\.org.*\/doi\/(?:pdf\/)?(.+?)(?:\?|$)/, // ACM Digital Library
        /ieeexplore\.ieee\.org.*document\/(\d+)/,       // IEEE
        /(?:^|\/)doi\/(?:pdf\/)?(.+?)(?:\?|$)/,        // Général /doi/...
        /(?:^|\/)(\d{2}\.\d{4}\/.+?)(?:\?|$)/          // Pattern DOI direct
      ];

      for (const pattern of doiPatterns) {
        const match = url.match(pattern);
        if (match) {
          let doi = match[1];
          
          // Cas spécial pour IEEE (convertir document ID en DOI si possible)
          if (pattern === doiPatterns[4] && /^\d+$/.test(doi)) {
            // Pour IEEE, on ne peut pas toujours déduire le DOI du document ID
            console.warn('ID de document IEEE détecté, DOI non extractible automatiquement');
            return '';
          }
          
          // Nettoyer le DOI
          doi = doi.replace(/\/pdf$/, ''); // Retirer /pdf à la fin
          doi = decodeURIComponent(doi);   // Décoder les caractères encodés
          
          return doi;
        }
      }
      
      return '';
    } catch (error) {
      console.error('Erreur extraction DOI:', error);
      return '';
    }
  }

  // Récupération des métadonnées via DOI
  async fetchMetadataFromDoi(doi: string): Promise<PaperData> {
    try {
      const response = await fetch(`${API_BASE_URL}/papers/metadata-from-doi`, {
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

      const metadata = await response.json();
      
      // Adapter au format attendu par l'interface avec abréviation
      const conferenceAbbrev = this.getConferenceAbbreviation(metadata.conference || '');
      
      return {
        title: metadata.title || '',
        authors: metadata.authors || '',
        doi: metadata.doi || doi,
        conference: metadata.conference || '',
        conference_abbreviation: conferenceAbbrev,
        publication_date: metadata.publication_date || '',
        url: metadata.url || `https://doi.org/${doi}`,
        image: '',
        reading_status: 'non_lu'
      };
    } catch (error) {
      console.error('Erreur fetchMetadataFromDoi:', error);
      throw error;
    }
  }

  // Extraction des métadonnées depuis un PDF
  async extractMetadataFromPdf(file: File): Promise<PaperData> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`${API_BASE_URL}/papers/extract-from-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const metadata = await response.json();
      
      // Adapter au format attendu par l'interface avec abréviation
      const conferenceAbbrev = this.getConferenceAbbreviation(metadata.conference || '');
      
      return {
        title: metadata.title || '',
        authors: metadata.authors || '',
        doi: metadata.doi || '',
        conference: metadata.conference || '',
        conference_abbreviation: conferenceAbbrev,
        publication_date: metadata.publication_date || '',
        url: metadata.url || '',
        image: '',
        reading_status: 'non_lu'
      };
    } catch (error) {
      console.error('Erreur extractMetadataFromPdf:', error);
      throw error;
    }
  }

  // Upload d'image
  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/papers/upload-image`, {
        method: 'POST',
        body: formData,
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

  // Sauvegarder un paper dans la base de données
  async savePaper(paperData: PaperData): Promise<{ success: boolean; id: number; paper: PaperData }> {
    try {
      const response = await fetch(`${API_BASE_URL}/papers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paperData,
          conference_abbreviation: paperData.conference_abbreviation || this.getConferenceAbbreviation(paperData.conference)
        })
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
      const response = await fetch(`${API_BASE_URL}/papers`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.papers || [];
    } catch (error) {
      console.error('Erreur getAllPapers:', error);
      throw error;
    }
  }

  // Récupérer un paper par ID
  async getPaperById(id: number): Promise<PaperData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/papers/${id}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.paper;
    } catch (error) {
      console.error('Erreur getPaperById:', error);
      throw error;
    }
  }

  // Mettre à jour un paper
  async updatePaper(id: number, updates: Partial<PaperData>): Promise<PaperData> {
    try {
      const response = await fetch(`${API_BASE_URL}/papers/${id}`, {
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
      const response = await fetch(`${API_BASE_URL}/papers/${id}`, {
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
      const response = await fetch(`${API_BASE_URL}/papers/search/${encodeURIComponent(searchTerm)}`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const papers = await response.json();
      return papers || [];
    } catch (error) {
      console.error('Erreur searchPapers:', error);
      throw error;
    }
  }

  // Tester la connexion API
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Erreur testConnection:', error);
      return false;
    }
  }

  // Gestion des catégories
  async getAllCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.error('Erreur getAllCategories:', error);
      throw error;
    }
  }

  async createCategory(name: string): Promise<{ success: boolean; id: number; category: Category }> {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
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

  // Récupérer les statistiques
  async getStats(): Promise<{
    totalPapers: number;
    readPapers: number;
    inProgressPapers: number;
    unreadPapers: number;
    totalCategories: number;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/papers/stats`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.stats || {
        totalPapers: 0,
        readPapers: 0,
        inProgressPapers: 0,
        unreadPapers: 0,
        totalCategories: 0
      };
    } catch (error) {
      console.error('Erreur getStats:', error);
      return {
        totalPapers: 0,
        readPapers: 0,
        inProgressPapers: 0,
        unreadPapers: 0,
        totalCategories: 0
      };
    }
  }
}

// Export de l'instance du service
export const paperService = new PaperService();
export default paperService;