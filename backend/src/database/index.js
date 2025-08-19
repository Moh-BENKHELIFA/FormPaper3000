// Point d'entrée principal pour le module database
const { initDatabase, closeDatabase, getDatabase } = require('./database');
const { initializeDatabase } = require('./init-db');
const { 
  paperOperations, 
  categoryOperations, 
  descriptionOperations, 
  paperCategoryOperations 
} = require('./operations');
const { 
  READING_STATUS,
  validatePaper,
  validateCategory,
  validateDescription,
  createPaper,
  createCategory,
  createDescription
} = require('./models');
const {
  createPaperFolder,
  savePdfFile,
  saveExtractedImages,
  deletePaperFolder,
  getPaperFolderPath,
  paperFolderExists,
  listPaperFiles
} = require('./fileOperations');

/**
 * Classe principale pour gérer la base de données des papers
 */
class PaperDatabase {
  constructor() {
    this.isConnected = false;
  }

  /**
   * Initialiser la connexion à la base de données
   */
  async connect() {
    try {
      await initDatabase();
      this.isConnected = true;
      console.log('✅ Base de données connectée');
    } catch (error) {
      console.error('❌ Erreur connexion DB:', error);
      throw error;
    }
  }

  /**
   * Fermer la connexion à la base de données
   */
  async disconnect() {
    try {
      await closeDatabase();
      this.isConnected = false;
      console.log('🔒 Base de données déconnectée');
    } catch (error) {
      console.error('❌ Erreur déconnexion DB:', error);
      throw error;
    }
  }

  /**
   * Vérifier si la base est connectée
   */
  isConnectedToDB() {
    return this.isConnected;
  }

  /**
   * Initialiser complètement la base (tables, structure...)
   */
  async initialize() {
    try {
      await initializeDatabase();
      console.log('✅ Base de données initialisée');
    } catch (error) {
      console.error('❌ Erreur initialisation DB:', error);
      throw error;
    }
  }

  // Méthodes pour les papers
  get papers() {
    return paperOperations;
  }

  // Méthodes pour les catégories
  get categories() {
    return categoryOperations;
  }

  // Méthodes pour les descriptions
  get descriptions() {
    return descriptionOperations;
  }

  // Méthodes pour les liaisons paper-catégories
  get paperCategories() {
    return paperCategoryOperations;
  }

  // Méthodes pour les fichiers
  get files() {
    return {
      createPaperFolder,
      savePdfFile,
      saveExtractedImages,
      deletePaperFolder,
      getPaperFolderPath,
      paperFolderExists,
      listPaperFiles
    };
  }

  /**
   * Créer un paper complet avec PDF et images
   * @param {Object} paperData - Données du paper
   * @param {Buffer} pdfBuffer - Buffer du PDF
   * @param {string} pdfName - Nom du PDF
   * @param {Array} extractedImages - Images extraites
   * @param {Array} categoryIds - IDs des catégories
   * @param {Object} descriptionData - Données de description
   * @returns {Promise<Object>} - Paper créé avec détails
   */
  async createCompletePaper(paperData, pdfBuffer = null, pdfName = null, extractedImages = [], categoryIds = [], descriptionData = null) {
    try {
      // Créer le paper avec les fichiers
      const paperId = await this.papers.create(paperData, pdfBuffer, pdfName, extractedImages);

      // Ajouter les catégories
      if (categoryIds && categoryIds.length > 0) {
        await this.paperCategories.setPaperCategories(paperId, categoryIds);
      }

      // Ajouter la description
      if (descriptionData) {
        await this.descriptions.createOrUpdate(paperId, descriptionData);
      }

      // Récupérer le paper complet
      const completePaper = await this.papers.getByIdWithDetails(paperId);
      
      console.log(`✅ Paper complet créé avec ID: ${paperId}`);
      return completePaper;
    } catch (error) {
      console.error('❌ Erreur création paper complet:', error);
      throw error;
    }
  }

  /**
   * Supprimer complètement un paper (DB + fichiers)
   * @param {number} paperId - ID du paper
   * @returns {Promise<boolean>} - True si suppression réussie
   */
  async deleteCompletePaper(paperId) {
    try {
      // Supprimer les liaisons catégories
      await this.paperCategories.removeAllCategoriesFromPaper(paperId);
      
      // Supprimer le paper (inclut la suppression des fichiers)
      const deleted = await this.papers.delete(paperId);
      
      console.log(`✅ Paper ${paperId} complètement supprimé`);
      return deleted;
    } catch (error) {
      console.error('❌ Erreur suppression paper complet:', error);
      throw error;
    }
  }

  /**
   * Obtenir des statistiques sur la base de données
   * @returns {Promise<Object>} - Statistiques
   */
  async getStats() {
    try {
      console.log('📊 Calcul des statistiques en cours...');
      
      const papers = await this.papers.getAll();
      const categories = await this.categories.getAll();
      
      console.log(`📄 ${papers.length} papers trouvés`);
      console.log(`🏷️ ${categories.length} catégories trouvées`);
      
      // Compter les papers par statut de lecture
      const readPapers = papers.filter(p => p.reading_status === 'lu').length;
      const inProgressPapers = papers.filter(p => p.reading_status === 'en_cours').length;
      const unreadPapers = papers.filter(p => p.reading_status === 'non_lu').length;
      
      const stats = {
        totalPapers: papers.length,
        readPapers: readPapers,
        inProgressPapers: inProgressPapers,
        unreadPapers: unreadPapers,
        totalCategories: categories.length
      };

      console.log('📈 Statistiques détaillées:');
      console.log(`  - Total papers: ${stats.totalPapers}`);
      console.log(`  - Papers lus: ${stats.readPapers}`);
      console.log(`  - Papers en cours: ${stats.inProgressPapers}`);
      console.log(`  - Papers non lus: ${stats.unreadPapers}`);
      console.log(`  - Total catégories: ${stats.totalCategories}`);
      
      return stats;
      
    } catch (error) {
      console.error('❌ Erreur détaillée lors du calcul des stats:', error);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Grouper les papers par année (méthode utilitaire)
   * @private
   * @param {Array} papers - Liste des papers
   * @returns {Object} - Papers groupés par année
   */
  _groupPapersByYear(papers) {
    return papers.reduce((acc, paper) => {
      const year = new Date(paper.publication_date).getFullYear();
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Obtenir des statistiques étendues (avec groupement par année)
   * @returns {Promise<Object>} - Statistiques complètes
   */
  async getExtendedStats() {
    try {
      const papers = await this.papers.getAll();
      const categories = await this.categories.getAll();
      
      const readingStats = papers.reduce((acc, paper) => {
        acc[paper.reading_status] = (acc[paper.reading_status] || 0) + 1;
        return acc;
      }, {});

      return {
        totalPapers: papers.length,
        totalCategories: categories.length,
        readingStats,
        papersByYear: this._groupPapersByYear(papers),
        averagePapersPerCategory: categories.length > 0 ? Math.round(papers.length / categories.length * 100) / 100 : 0
      };
    } catch (error) {
      console.error('❌ Erreur récupération stats étendues:', error);
      throw error;
    }
  }
}

// Instance singleton
const paperDB = new PaperDatabase();

module.exports = {
  // Instance principale
  paperDB,
  
  // Classes et fonctions
  PaperDatabase,
  
  // Fonctions de base
  initDatabase,
  closeDatabase,
  getDatabase,
  initializeDatabase,
  
  // Opérations
  paperOperations,
  categoryOperations,
  descriptionOperations,
  paperCategoryOperations,
  
  // Modèles et validation
  READING_STATUS,
  validatePaper,
  validateCategory,
  validateDescription,
  createPaper,
  createCategory,
  createDescription,
  
  // Gestion fichiers
  createPaperFolder,
  savePdfFile,
  saveExtractedImages,
  deletePaperFolder,
  getPaperFolderPath,
  paperFolderExists,
  listPaperFiles
};