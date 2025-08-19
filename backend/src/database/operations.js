const { getDatabase } = require('./database');
const { validatePaper, validateCategory, validateDescription } = require('./models');
const { createPaperFolder, deletePaperFolder, savePdfFile, saveExtractedImages } = require('./fileOperations');

// Opérations pour les Papers
const paperOperations = {
  /**
   * Créer un nouveau paper avec gestion des fichiers
   * @param {Object} paper - Données du paper
   * @param {Buffer} pdfBuffer - Buffer du PDF (optionnel)
   * @param {string} pdfName - Nom du PDF (optionnel)
   * @param {Array} extractedImages - Images extraites (optionnel)
   * @returns {Promise<number>} - ID du paper créé
   */
  create: async (paper, pdfBuffer = null, pdfName = null, extractedImages = []) => {
    return new Promise(async (resolve, reject) => {
      if (!validatePaper(paper)) {
        return reject(new Error('Données du paper invalides'));
      }

      const db = getDatabase();
      const sql = `INSERT INTO Papers (title, authors, publication_date, conference, reading_status, image, doi, url) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      db.run(sql, [
        paper.title,
        paper.authors,
        paper.publication_date,
        paper.conference || null,
        paper.reading_status || 'non_lu',
        paper.image || null,
        paper.doi,
        paper.url
      ], async function(err) {
        if (err) {
          reject(err);
          return;
        }

        const paperId = this.lastID;
        
        try {
          // Créer le dossier du paper
          const folderPath = await createPaperFolder(paperId);
          
          // Sauvegarder le PDF si fourni
          if (pdfBuffer && pdfName) {
            await savePdfFile(paperId, pdfBuffer, pdfName);
          }

          // Sauvegarder les images extraites si fournies
          if (extractedImages && extractedImages.length > 0) {
            await saveExtractedImages(paperId, extractedImages);
          }

          // Mettre à jour le paper avec le chemin du dossier
          await paperOperations.update(paperId, { folder_path: folderPath });

          console.log(`✅ Paper créé avec ID: ${paperId}`);
          resolve(paperId);
        } catch (fileErr) {
          console.error('❌ Erreur gestion fichiers:', fileErr);
          // En cas d'erreur, supprimer le paper de la DB
          await paperOperations.delete(paperId);
          reject(fileErr);
        }
      });
    });
  },

  /**
   * Récupérer tous les papers
   * @returns {Promise<Array>} - Liste des papers
   */
  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.all('SELECT * FROM Papers ORDER BY publication_date DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Récupérer un paper par ID
   * @param {number} id - ID du paper
   * @returns {Promise<Object|null>} - Paper ou null
   */
  getById: (id) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.get('SELECT * FROM Papers WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  },

  /**
   * Récupérer un paper avec ses catégories et description
   * @param {number} id - ID du paper
   * @returns {Promise<Object|null>} - Paper complet ou null
   */
  getByIdWithDetails: async (id) => {
    try {
      const paper = await paperOperations.getById(id);
      if (!paper) return null;

      const categories = await paperCategoryOperations.getCategoriesForPaper(id);
      const description = await descriptionOperations.getByPaperId(id);

      return {
        ...paper,
        categories,
        description
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mettre à jour un paper
   * @param {number} id - ID du paper
   * @param {Object} updates - Données à mettre à jour
   * @returns {Promise<boolean>} - True si mise à jour réussie
   */
  update: (id, updates) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      if (fields.length === 0) {
        resolve(false);
        return;
      }
      
      db.run(`UPDATE Papers SET ${fields} WHERE id = ?`, [...values, id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  },

  /**
   * Supprimer un paper et ses fichiers associés
   * @param {number} id - ID du paper
   * @returns {Promise<boolean>} - True si suppression réussie
   */
  delete: (id) => {
    return new Promise(async (resolve, reject) => {
      try {
        const db = getDatabase();
        
        // Supprimer les fichiers du paper
        await deletePaperFolder(id);
        
        // Supprimer de la base de données
        db.run('DELETE FROM Papers WHERE id = ?', [id], function(err) {
          if (err) reject(err);
          else {
            console.log(`🗑️ Paper ${id} supprimé de la DB`);
            resolve(this.changes > 0);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Rechercher des papers par titre ou auteurs
   * @param {string} searchTerm - Terme de recherche
   * @returns {Promise<Array>} - Papers trouvés
   */
  search: (searchTerm) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const sql = `
        SELECT * FROM Papers 
        WHERE title LIKE ? OR authors LIKE ? 
        ORDER BY publication_date DESC
      `;
      const term = `%${searchTerm}%`;
      
      db.all(sql, [term, term], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
};

// Opérations pour les Categories
const categoryOperations = {
  /**
   * Créer une nouvelle catégorie
   * @param {string} name - Nom de la catégorie
   * @returns {Promise<number>} - ID de la catégorie créée
   */
  create: (name) => {
    return new Promise((resolve, reject) => {
      if (!name || name.trim() === '') {
        return reject(new Error('Nom de catégorie invalide'));
      }

      const db = getDatabase();
      db.run('INSERT INTO Categories (name) VALUES (?)', [name.trim()], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  },

  /**
   * Récupérer toutes les catégories
   * @returns {Promise<Array>} - Liste des catégories
   */
  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.all('SELECT * FROM Categories ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Récupérer une catégorie par ID
   * @param {number} id - ID de la catégorie
   * @returns {Promise<Object|null>} - Catégorie ou null
   */
  getById: (id) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.get('SELECT * FROM Categories WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  },

  /**
   * Supprimer une catégorie
   * @param {number} id - ID de la catégorie
   * @returns {Promise<boolean>} - True si suppression réussie
   */
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run('DELETE FROM Categories WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }
};

// Opérations pour les Descriptions
const descriptionOperations = {
  /**
   * Créer une description
   * @param {Object} description - Données de la description
   * @returns {Promise<number>} - ID de la description créée
   */
  create: (description) => {
    return new Promise((resolve, reject) => {
      if (!validateDescription(description)) {
        return reject(new Error('Données de description invalides'));
      }

      const db = getDatabase();
      const sql = 'INSERT INTO Descriptions (paper_id, texte, images) VALUES (?, ?, ?)';
      
      db.run(sql, [
        description.paper_id, 
        description.texte || null, 
        description.images || null
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  },

  /**
   * Récupérer une description par paper ID
   * @param {number} paperId - ID du paper
   * @returns {Promise<Object|null>} - Description ou null
   */
  getByPaperId: (paperId) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.get('SELECT * FROM Descriptions WHERE paper_id = ?', [paperId], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  },

  /**
   * Mettre à jour une description
   * @param {number} paperId - ID du paper
   * @param {Object} updates - Données à mettre à jour
   * @returns {Promise<boolean>} - True si mise à jour réussie
   */
  update: (paperId, updates) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const allowedFields = ['texte', 'images'];
      const fields = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .map(key => `${key} = ?`)
        .join(', ');
      
      if (fields.length === 0) {
        resolve(false);
        return;
      }

      const values = Object.entries(updates)
        .filter(([key]) => allowedFields.includes(key))
        .map(([, value]) => value);
      
      db.run(`UPDATE Descriptions SET ${fields} WHERE paper_id = ?`, [...values, paperId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  },

  /**
   * Créer ou mettre à jour une description
   * @param {number} paperId - ID du paper
   * @param {Object} descriptionData - Données de la description
   * @returns {Promise<boolean>} - True si opération réussie
   */
  createOrUpdate: async (paperId, descriptionData) => {
    try {
      const existing = await descriptionOperations.getByPaperId(paperId);
      
      if (existing) {
        return await descriptionOperations.update(paperId, descriptionData);
      } else {
        await descriptionOperations.create({ paper_id: paperId, ...descriptionData });
        return true;
      }
    } catch (error) {
      throw error;
    }
  }
};

// Opérations pour les liaisons Paper-Category
const paperCategoryOperations = {
  /**
   * Ajouter une catégorie à un paper
   * @param {number} paperId - ID du paper
   * @param {number} categoryId - ID de la catégorie
   * @returns {Promise<number>} - ID de la liaison créée
   */
  addCategoryToPaper: (paperId, categoryId) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      // Vérifier si la liaison existe déjà
      db.get(
        'SELECT id FROM PaperCategories WHERE paper_id = ? AND categorie_id = ?',
        [paperId, categoryId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (row) {
            resolve(row.id); // Liaison déjà existante
            return;
          }
          
          // Créer la nouvelle liaison
          db.run(
            'INSERT INTO PaperCategories (paper_id, categorie_id) VALUES (?, ?)', 
            [paperId, categoryId], 
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        }
      );
    });
  },

  /**
   * Supprimer une catégorie d'un paper
   * @param {number} paperId - ID du paper
   * @param {number} categoryId - ID de la catégorie
   * @returns {Promise<boolean>} - True si suppression réussie
   */
  removeCategoryFromPaper: (paperId, categoryId) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'DELETE FROM PaperCategories WHERE paper_id = ? AND categorie_id = ?', 
        [paperId, categoryId], 
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  },

  /**
   * Récupérer toutes les catégories d'un paper
   * @param {number} paperId - ID du paper
   * @returns {Promise<Array>} - Liste des catégories
   */
  getCategoriesForPaper: (paperId) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const sql = `
        SELECT c.* FROM Categories c 
        JOIN PaperCategories pc ON c.id = pc.categorie_id 
        WHERE pc.paper_id = ?
        ORDER BY c.name
      `;
      
      db.all(sql, [paperId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Récupérer tous les papers d'une catégorie
   * @param {number} categoryId - ID de la catégorie
   * @returns {Promise<Array>} - Liste des papers
   */
  getPapersForCategory: (categoryId) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const sql = `
        SELECT p.* FROM Papers p 
        JOIN PaperCategories pc ON p.id = pc.paper_id 
        WHERE pc.categorie_id = ?
        ORDER BY p.publication_date DESC
      `;
      
      db.all(sql, [categoryId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Remplacer toutes les catégories d'un paper
   * @param {number} paperId - ID du paper
   * @param {Array} categoryIds - Tableau des IDs des catégories
   * @returns {Promise<boolean>} - True si opération réussie
   */
  setPaperCategories: async (paperId, categoryIds = []) => {
    try {
      const db = getDatabase();
      
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          // Supprimer toutes les catégories existantes
          db.run(
            'DELETE FROM PaperCategories WHERE paper_id = ?',
            [paperId],
            (err) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Si aucune catégorie à ajouter
              if (categoryIds.length === 0) {
                resolve(true);
                return;
              }
              
              // Ajouter les nouvelles catégories
              let remaining = categoryIds.length;
              let hasError = false;
              
              categoryIds.forEach(categoryId => {
                db.run(
                  'INSERT INTO PaperCategories (paper_id, categorie_id) VALUES (?, ?)',
                  [paperId, categoryId],
                  (err) => {
                    if (err && !hasError) {
                      hasError = true;
                      reject(err);
                      return;
                    }
                    
                    remaining--;
                    if (remaining === 0 && !hasError) {
                      resolve(true);
                    }
                  }
                );
              });
            }
          );
        });
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Supprimer toutes les liaisons d'un paper
   * @param {number} paperId - ID du paper
   * @returns {Promise<boolean>} - True si suppression réussie
   */
  removeAllCategoriesFromPaper: (paperId) => {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'DELETE FROM PaperCategories WHERE paper_id = ?',
        [paperId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }
};

module.exports = {
  paperOperations,
  categoryOperations,
  descriptionOperations,
  paperCategoryOperations
};