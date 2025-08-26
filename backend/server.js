const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { promisify } = require('util');

// Import de la base de données
const { paperDB, READING_STATUS } = require('./src/database');

const app = express();
const PORT = 5324;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialisation de la base de données au démarrage
// Initialisation de la base de données au démarrage
async function initializeApp() {
  try {
    console.log('🔗 Connexion à la base de données...');
    await paperDB.connect();
    
    // ❌ NE PAS APPELER paperDB.initialize() car cela ferme la DB !
    // await paperDB.initialize(); // <-- ENLEVER CETTE LIGNE
    
    console.log('✅ Base de données connectée avec succès');
    
    // Test de santé initial
    try {
      const testStats = await paperDB.getStats();
      console.log('🧪 Test stats initial réussi:', testStats);
    } catch (testError) {
      console.warn('⚠️ Warning test stats initial:', testError.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base:', error);
    throw error;
  }
}

// Fonction pour extraire les images d'un PDF avec Python
async function extractImagesFromPdf(pdfPath, outputFolder) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'scripts', 'extract_images.py');
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Script Python non trouvé: ${scriptPath}`));
      return;
    }

    console.log(`Extraction des images du PDF: ${pdfPath}`);
    console.log(`Dossier de sortie: ${outputFolder}`);

    const pythonProcess = spawn('python', [scriptPath, pdfPath, outputFolder]);
    
    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      console.log(`Script d'extraction d'images terminé avec le code: ${code}`);
      console.log(`Sortie stderr: ${errorOutput}`);

      if (code === 0 && output.trim()) {
        try {
          const extractedImages = JSON.parse(output.trim());
          console.log(`${extractedImages.length} images extraites`);
          resolve(extractedImages);
        } catch (parseError) {
          console.error('Erreur lors du parsing JSON:', parseError);
          resolve([]);
        }
      } else {
        console.log('Aucune image extraite du PDF');
        resolve([]);
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Erreur lors de l\'extraction des images:', error.message);
      resolve([]);
    });
  });
}

async function extractDoiFromPdf(pdfPath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'scripts', 'extract_doi.py');
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Script Python non trouvé: ${scriptPath}`));
      return;
    }

    console.log(`Exécution du script Python: ${scriptPath}`);
    console.log(`Fichier PDF à analyser: ${pdfPath}`);

    const pythonProcess = spawn('python', [scriptPath, pdfPath]);
    
    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      console.log(`Script Python terminé avec le code: ${code}`);
      console.log(`Sortie stderr: ${errorOutput}`);

      if (code === 0 && output.trim()) {
        const doi = output.trim();
        console.log(`DOI extrait avec succès: ${doi}`);
        resolve(doi);
      } else {
        console.log('Aucun DOI trouvé dans le PDF');
        resolve(null);
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Erreur lors de l\'exécution de Python:', error.message);
      
      if (error.code === 'ENOENT') {
        reject(new Error('Python n\'est pas installé ou n\'est pas dans le PATH. Veuillez installer Python et PyMuPDF (pip install PyMuPDF).'));
      } else {
        reject(error);
      }
    });
  });
}

// ================================
// ROUTES - ORDRE CORRECT
// ================================

// Health check amélioré avec vérification DB
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        stats: null,
        error: null
      }
    };

    // Test de connexion à la base
    try {
      health.database.connected = paperDB.isConnectedToDB();
      
      if (!health.database.connected) {
        console.log('🔄 Tentative de reconnexion à la base...');
        await paperDB.connect();
        health.database.connected = true;
      }
      
      // Test simple des stats
      const testStats = await paperDB.getStats();
      health.database.stats = testStats;
      
    } catch (dbError) {
      console.error('❌ Erreur health check DB:', dbError);
      health.database.error = dbError.message;
      health.status = 'warning';
    }

    const statusCode = health.status === 'ok' ? 200 : 206;
    res.status(statusCode).json(health);
    
  } catch (error) {
    console.error('❌ Erreur health check général:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de diagnostic avancé 
app.get('/api/diagnostic', async (req, res) => {
  try {
    const diagnostic = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      },
      database: {
        connected: paperDB.isConnectedToDB(),
        canQuery: false,
        tablesExist: false
      }
    };

    // Test de requête simple
    try {
      const db = require('./src/database/database').getDatabase();
      const result = await new Promise((resolve, reject) => {
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Papers'", (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      diagnostic.database.canQuery = true;
      diagnostic.database.tablesExist = !!result;
      
    } catch (queryError) {
      diagnostic.database.error = queryError.message;
    }

    res.json(diagnostic);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================================
// ROUTES PAPERS - SPÉCIFIQUES D'ABORD
// ================================

// Récupérer les métadonnées depuis un DOI
app.post('/api/papers/metadata-from-doi', async (req, res) => {
  try {
    const { doi } = req.body;
    
    if (!doi) {
      return res.status(400).json({ error: 'DOI requis' });
    }

    console.log(`🔍 Récupération des métadonnées pour DOI: ${doi}`);

    const response = await axios.get(`https://api.crossref.org/works/${doi}`, {
      headers: {
        'User-Agent': 'FormPaper3000/1.0 (https://github.com/yourrepo/formpaper3000; mailto:your-email@example.com)'
      }
    });

    const work = response.data.message;
    
    const paperData = {
      title: work.title?.[0] || '',
      authors: work.author?.map(a => `${a.given || ''} ${a.family || ''}`).join(', ') || '',
      doi: work.DOI || doi,
      url: work.URL || `https://doi.org/${doi}`,
      publication_date: work.published?.['date-parts']?.[0] ? 
        `${work.published['date-parts'][0][0]}-${String(work.published['date-parts'][0][1] || 1).padStart(2, '0')}-${String(work.published['date-parts'][0][2] || 1).padStart(2, '0')}` : 
        new Date().toISOString().split('T')[0],
      conference: work['container-title']?.[0] || '',
      reading_status: 'non_lu'
    };

    console.log(`✅ Métadonnées récupérées: ${paperData.title}`);
    res.json({ paperData });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des métadonnées:', error.message);
    
    if (error.response?.status === 404) {
      res.status(404).json({ 
        error: 'DOI non trouvé',
        message: 'Ce DOI n\'existe pas dans la base Crossref'
      });
    } else {
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des métadonnées',
        message: error.message
      });
    }
  }
});

// Extraire les images d'un PDF
app.post('/api/papers/extract-images', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier PDF requis' });
    }

    const pdfPath = req.file.path;
    const outputFolder = path.join('uploads', 'extracted_images', Date.now().toString());

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    console.log(`📄 Extraction des images du PDF: ${req.file.originalname}`);
    
    const extractedImages = await extractImagesFromPdf(pdfPath, outputFolder);
    
    // Nettoyer le fichier PDF temporaire
    fs.unlinkSync(pdfPath);

    const images = extractedImages.map(img => ({
      name: img.name,
      url: `http://localhost:${PORT}/${img.path}`,
      page: img.page
    }));

    console.log(`🖼️ ${images.length} images extraites`);
    res.json({ images });

  } catch (error) {
    console.error('❌ Erreur lors de l\'extraction des images:', error.message);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Erreur lors de l\'extraction des images',
      message: error.message
    });
  }
});

// Route extract-from-pdf corrigée - Remplacez votre route actuelle par celle-ci
app.post('/api/papers/extract-from-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier PDF requis' });
    }

    console.log(`📄 Extraction des métadonnées du PDF: ${req.file.originalname}`);
    
    const doi = await extractDoiFromPdf(req.file.path);
    
    if (!doi) {
      // Pas de DOI trouvé - créer des données de base
      const fallbackData = {
        title: path.parse(req.file.originalname).name,
        authors: '',
        doi: '',
        conference: '',
        publication_date: new Date().toISOString().split('T')[0],
        url: '',
        reading_status: 'non_lu'
      };
      
      fs.unlinkSync(req.file.path);
      console.log('📝 Aucun DOI trouvé - métadonnées de base:', fallbackData);
      
      // ✅ Format compatible avec paperService.extractDataFromPDF()
      return res.json({ paperData: fallbackData });
    }

    console.log(`🔍 DOI extrait du PDF: ${doi}`);

    try {
      // Récupérer les métadonnées via Crossref
      const crossrefUrl = `https://api.crossref.org/works/${doi}`;
      
      const response = await axios.get(crossrefUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PaperManager/1.0 (mailto:user@example.com)'
        },
        timeout: 10000
      });

      const work = response.data.message;
      
      const authors = work.author 
        ? work.author.map(a => `${a.given || ''} ${a.family || ''}`.trim()).filter(a => a)
        : [];

      const paperData = {
        title: work.title ? work.title[0] : path.parse(req.file.originalname).name,
        authors: authors.length > 0 ? authors.join(', ') : '',
        doi: work.DOI || doi,
        conference: work['container-title'] ? work['container-title'][0] : '',
        publication_date: work.published 
          ? `${work.published['date-parts'][0][0]}-${String(work.published['date-parts'][0][1] || 1).padStart(2, '0')}-${String(work.published['date-parts'][0][2] || 1).padStart(2, '0')}`
          : new Date().toISOString().split('T')[0],
        url: work.URL || `https://doi.org/${doi}`,
        reading_status: 'non_lu'
      };

      fs.unlinkSync(req.file.path);

      console.log('✅ Métadonnées récupérées via Crossref:', paperData);
      
      // ✅ Format compatible avec paperService.extractDataFromPDF()
      res.json({ paperData });

    } catch (crossrefError) {
      console.error('⚠️ Erreur Crossref:', crossrefError.message);
      
      // Fallback avec le DOI trouvé mais métadonnées minimales
      const fallbackData = {
        title: path.parse(req.file.originalname).name,
        authors: '',
        doi: doi,
        conference: '',
        publication_date: new Date().toISOString().split('T')[0],
        url: `https://doi.org/${doi}`,
        reading_status: 'non_lu'
      };

      fs.unlinkSync(req.file.path);
      
      console.log('📝 Métadonnées fallback avec DOI:', fallbackData);
      
      // ✅ Format compatible avec paperService.extractDataFromPDF()
      res.json({ paperData: fallbackData });
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'extraction PDF:', error.message);
    
    // Nettoyer le fichier temporaire
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Erreur lors de l\'extraction des métadonnées PDF',
      message: error.message
    });
  }
});

// Upload d'image
app.post('/api/papers/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier image requis' });
    }

    const imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    
    console.log(`🖼️ Image uploadée: ${imageUrl}`);
    res.json({ imageUrl });

  } catch (error) {
    console.error('❌ Erreur lors de l\'upload:', error.message);
    res.status(500).json({ 
      error: 'Erreur lors de l\'upload de l\'image',
      message: error.message
    });
  }
});

// ✅ STATISTIQUES EN PREMIER (AVANT LES ROUTES GÉNÉRIQUES)
app.get('/api/papers/stats', async (req, res) => {
  try {
    console.log('📊 Récupération des statistiques...');
    
    // Vérifier que la base est connectée
    if (!paperDB.isConnectedToDB()) {
      console.log('⚠️ Base de données non connectée, tentative de reconnexion...');
      await paperDB.connect();
    }
    
    const stats = await paperDB.getStats();
    console.log('📈 Statistiques récupérées:', stats);

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des stats:', error);
    console.error('❌ Stack trace complète:', error.stack);
    
    // Retourner des statistiques par défaut en cas d'erreur
    const defaultStats = {
      totalPapers: 0,
      readPapers: 0,
      inProgressPapers: 0,
      unreadPapers: 0,
      totalCategories: 0
    };
    
    res.status(200).json({ 
      success: true,
      stats: defaultStats,
      warning: 'Statistiques par défaut retournées suite à une erreur',
      error_details: error.message
    });
  }
});

// Récupérer tous les papers
app.get('/api/papers', async (req, res) => {
  try {
    console.log('📖 Récupération de tous les papers...');
    
    const papers = await paperDB.papers.getAll();
    console.log(`📚 ${papers.length} papers récupérés`);

    res.json({
      success: true,
      papers: papers,
      total: papers.length
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des papers:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des papers',
      message: error.message
    });
  }
});

// Sauvegarder un paper dans la base avec catégories
app.post('/api/papers', upload.single('pdf'), async (req, res) => {
  try {
    console.log('💾 Sauvegarde d\'un nouveau paper...');
    console.log('Données reçues:', req.body);
    
    const paperData = req.body;
    const categories = req.body.categories ? JSON.parse(req.body.categories) : [];
    
    // Validation des données essentielles
    if (!paperData.title || !paperData.authors || !paperData.doi || !paperData.url) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        message: 'Titre, auteurs, DOI et URL sont requis'
      });
    }

    console.log(`📝 Création du paper: ${paperData.title}`);
    console.log(`🏷️ Catégories: ${categories.join(', ')}`);

    // Préparer les données du paper
    const paperToSave = {
      title: paperData.title,
      authors: paperData.authors,
      publication_date: paperData.publication_date || new Date().toISOString().split('T')[0],
      conference: paperData.conference || null,
      reading_status: paperData.reading_status || 'non_lu',
      image: paperData.image || null,
      doi: paperData.doi,
      url: paperData.url
    };

    // Buffer et nom du PDF si fourni
    const pdfBuffer = req.file ? fs.readFileSync(req.file.path) : null;
    const pdfName = req.file ? req.file.originalname : null;

    // Créer le paper complet avec catégories
    const savedPaper = await paperDB.createCompletePaper(
      paperToSave,
      pdfBuffer,
      pdfName,
      [], // extractedImages
      categories // categoryIds
    );

    // Nettoyer le fichier temporaire
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.log(`✅ Paper sauvegardé avec ID: ${savedPaper.id}`);

    // Statistiques
    const stats = await paperDB.getStats();
    console.log(`📊 Total papers en base: ${stats.totalPapers}`);

    res.status(201).json({ 
      success: true,
      id: savedPaper.id, 
      message: 'Paper sauvegardé avec succès',
      paper: savedPaper,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
    
    // Nettoyer le fichier temporaire en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Gestion des erreurs spécifiques
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ 
        error: 'DOI déjà existant',
        message: 'Ce DOI existe déjà dans la base de données'
      });
    }

    res.status(500).json({ 
      error: 'Erreur lors de la sauvegarde',
      message: error.message
    });
  }
});

// ✅ ROUTES AVEC PARAMÈTRES EN DERNIER

// Récupérer un paper par ID avec détails
app.get('/api/papers/:id', async (req, res) => {
  try {
    const paperId = parseInt(req.params.id);
    
    if (isNaN(paperId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    console.log(`🔍 Récupération du paper ID: ${paperId}`);
    
    const paper = await paperDB.papers.getByIdWithDetails(paperId);
    
    if (!paper) {
      return res.status(404).json({ 
        error: 'Paper non trouvé',
        message: `Aucun paper trouvé avec l'ID ${paperId}`
      });
    }

    console.log(`📄 Paper récupéré: ${paper.title}`);
    res.json({
      success: true,
      paper: paper
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du paper:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du paper',
      message: error.message
    });
  }
});

// Mettre à jour un paper avec catégories
app.put('/api/papers/:id', async (req, res) => {
  try {
    const paperId = parseInt(req.params.id);
    const updates = req.body;
    const categories = updates.categories || [];
    
    if (isNaN(paperId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    console.log(`✏️ Mise à jour du paper ID: ${paperId}`);
    console.log('Données de mise à jour:', updates);

    // Mettre à jour le paper
    const updatedPaper = await paperDB.papers.update(paperId, updates);
    
    if (!updatedPaper) {
      return res.status(404).json({ 
        error: 'Paper non trouvé',
        message: `Aucun paper trouvé avec l'ID ${paperId}`
      });
    }

    // Mettre à jour les catégories si fournies
    if (categories.length >= 0) {
      await paperDB.paperCategories.setPaperCategories(paperId, categories);
    }

    // Récupérer le paper mis à jour avec détails
    const paperWithDetails = await paperDB.papers.getByIdWithDetails(paperId);

    console.log(`✅ Paper ${paperId} mis à jour avec succès`);
    res.json({
      success: true,
      paper: paperWithDetails,
      message: 'Paper mis à jour avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du paper:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du paper',
      message: error.message
    });
  }
});

// Supprimer un paper
app.delete('/api/papers/:id', async (req, res) => {
  try {
    const paperId = parseInt(req.params.id);
    
    if (isNaN(paperId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    console.log(`🗑️ Suppression du paper ID: ${paperId}`);
    
    const deleted = await paperDB.deleteCompletePaper(paperId);
    
    if (!deleted) {
      return res.status(404).json({ 
        error: 'Paper non trouvé',
        message: `Aucun paper trouvé avec l'ID ${paperId}`
      });
    }

    console.log(`✅ Paper ${paperId} supprimé avec succès`);
    res.json({
      success: true,
      message: 'Paper supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression du paper:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du paper',
      message: error.message
    });
  }
});

// ================================
// ROUTES CATÉGORIES
// ================================

// Récupérer toutes les catégories
app.get('/api/categories', async (req, res) => {
  try {
    console.log('🏷️ Récupération des catégories...');
    
    // Vérifier la connexion DB
    if (!paperDB.isConnectedToDB()) {
      console.log('⚠️ Base de données non connectée, tentative de reconnexion...');
      await paperDB.connect();
    }
    
    const categories = await paperDB.categories.getAll();
    console.log(`📝 ${categories.length} catégories récupérées`);

    res.json({
      success: true,
      categories: categories
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des catégories',
      message: error.message
    });
  }
});

// Créer une nouvelle catégorie
app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: 'Nom de catégorie requis' 
      });
    }

    console.log(`🆕 Création de la catégorie: ${name}`);
    
    const categoryId = await paperDB.categories.create(name.trim());
    const category = await paperDB.categories.getById(categoryId);
    console.log(`✅ Catégorie créée avec l'ID: ${categoryId}`);

    res.status(201).json({
      success: true,
      id: categoryId,
      category: category,
      message: 'Catégorie créée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la création de la catégorie:', error);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ 
        error: 'Nom de catégorie déjà existant',
        message: 'Cette catégorie existe déjà'
      });
    }

    res.status(500).json({ 
      error: 'Erreur lors de la création de la catégorie',
      message: error.message
    });
  }
});

// Supprimer une catégorie
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'ID de catégorie invalide' });
    }

    console.log(`🗑️ Suppression de la catégorie ID: ${categoryId}`);
    
    const deleted = await paperDB.categories.delete(categoryId);
    
    if (!deleted) {
      return res.status(404).json({ 
        error: 'Catégorie non trouvée',
        message: `Aucune catégorie trouvée avec l'ID ${categoryId}`
      });
    }

    console.log(`✅ Catégorie ${categoryId} supprimée avec succès`);
    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de la catégorie',
      message: error.message
    });
  }
});

// ================================
// FICHIERS STATIQUES
// ================================

// Servir les fichiers statiques
app.use('/uploads', express.static('uploads'));
app.use('/MyPapers', express.static('MyPapers'));

// ================================
// ROUTE PAR DÉFAUT
// ================================

app.get('/', (req, res) => {
  res.json({ 
    message: 'API Paper Manager avec SQLite',
    version: '3.0.0',
    database: paperDB.isConnectedToDB() ? 'Connected' : 'Disconnected',
    endpoints: [
      'GET /api/health',
      'GET /api/diagnostic',
      'POST /api/papers/metadata-from-doi',
      'POST /api/papers/extract-images',
      'POST /api/papers/extract-from-pdf',
      'POST /api/papers/upload-image',
      'GET /api/papers/stats',
      'GET /api/papers',
      'POST /api/papers',
      'GET /api/papers/:id',
      'PUT /api/papers/:id',
      'DELETE /api/papers/:id',
      'GET /api/categories',
      'POST /api/categories',
      'DELETE /api/categories/:id'
    ]
  });
});

// ================================
// DÉMARRAGE DU SERVEUR
// ================================

// Démarrage du serveur avec initialisation de la base
async function startServer() {
  try {
    await initializeApp();
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
      console.log(`❤️ Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔍 Diagnostic: http://localhost:${PORT}/api/diagnostic`);
      console.log(`💾 Base de données SQLite: ${paperDB.isConnectedToDB() ? 'Connectée' : 'Déconnectée'}`);
      console.log(`📈 Statistiques: http://localhost:${PORT}/api/papers/stats`);
      console.log(`🏷️ Catégories: http://localhost:${PORT}/api/categories`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error);
    process.exit(1);
  }
}

// ================================
// GESTION DES ARRÊTS
// ================================

// Gestion des arrêts propres
process.on('SIGINT', async () => {
  console.log('🛑 Arrêt du serveur...');
  try {
    await paperDB.disconnect();
    console.log('✅ Base de données fermée proprement');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture:', error);
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  console.error('❌ Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  console.error('❌ Promise:', promise);
});

// Gestion gracieuse des erreurs lors de l'arrêt
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM reçu, arrêt gracieux...');
  try {
    await paperDB.disconnect();
    console.log('✅ Arrêt gracieux terminé');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur arrêt gracieux:', error);
    process.exit(1);
  }
});

// ================================
// DÉMARRAGE DE L'APPLICATION
// ================================

// Démarrer l'application
startServer().catch((error) => {
  console.error('❌ Erreur fatale au démarrage:', error);
  process.exit(1);
});