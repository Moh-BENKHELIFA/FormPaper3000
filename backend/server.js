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
async function initializeApp() {
  try {
    console.log('🔗 Connexion à la base de données...');
    await paperDB.connect();
    console.log('✅ Base de données connectée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base:', error);
    process.exit(1);
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
      reject(error);
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

// Route de test de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend fonctionnel',
    database: paperDB.isConnectedToDB() ? 'Connected' : 'Disconnected'
  });
});

// Récupérer les métadonnées depuis un DOI
app.post('/api/papers/metadata-from-doi', async (req, res) => {
  try {
    const { doi } = req.body;
    
    if (!doi) {
      return res.status(400).json({ error: 'DOI requis' });
    }

    console.log(`Récupération des métadonnées pour DOI: ${doi}`);

    const crossrefUrl = `https://api.crossref.org/works/${doi}`;
    
    const response = await axios.get(crossrefUrl, {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const work = response.data.message;
    
    const authors = work.author 
      ? work.author.map(a => `${a.given || ''} ${a.family || ''}`.trim())
      : ['Auteur inconnu'];

    const metadata = {
      title: work.title ? work.title[0] : 'Titre non disponible',
      authors: authors.join(', '),
      doi: work.DOI || doi,
      conference: work['container-title'] ? work['container-title'][0] : '',
      publication_date: work.published 
        ? `${work.published['date-parts'][0][0]}-${String(work.published['date-parts'][0][1] || 1).padStart(2, '0')}-${String(work.published['date-parts'][0][2] || 1).padStart(2, '0')}`
        : new Date().toISOString().split('T')[0],
      url: work.URL || `https://doi.org/${doi}`
    };

    console.log('Métadonnées récupérées:', metadata);
    res.json(metadata);

  } catch (error) {
    console.error('Erreur lors de la récupération DOI:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'DOI non trouvé',
        message: 'Le DOI spécifié n\'existe pas dans la base Crossref'
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        error: 'Timeout',
        message: 'La requête a expiré. Vérifiez votre connexion internet.'
      });
    }

    res.status(500).json({ 
      error: 'Erreur lors de la récupération des métadonnées',
      message: error.message
    });
  }
});

// Extraire les images d'un PDF
app.post('/api/papers/extract-images', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier PDF requis' });
    }

    console.log(`Extraction des images du PDF: ${req.file.filename}`);

    const imageFolder = path.join('uploads', 'images', `pdf_${Date.now()}`);
    
    const extractedImages = await extractImagesFromPdf(req.file.path, imageFolder);
    
    fs.unlinkSync(req.file.path);

    const imagesForFrontend = extractedImages.map(img => ({
      ...img,
      url: `http://localhost:${PORT}/${img.path.replace(/\\/g, '/')}`
    }));

    console.log(`Images extraites et converties:`, imagesForFrontend);
    res.json({ images: imagesForFrontend });

  } catch (error) {
    console.error('Erreur lors de l\'extraction des images:', error.message);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Erreur lors de l\'extraction des images du PDF',
      message: error.message
    });
  }
});

// Extraire les métadonnées depuis un PDF
app.post('/api/papers/extract-from-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier PDF requis' });
    }

    console.log(`Extraction des métadonnées du PDF: ${req.file.filename}`);

    const doi = await extractDoiFromPdf(req.file.path);
    
    if (!doi) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ 
        error: 'DOI non trouvé dans le PDF',
        message: 'Aucun DOI n\'a pu être extrait de ce fichier PDF'
      });
    }

    console.log(`DOI extrait du PDF: ${doi}`);

    try {
      const crossrefUrl = `https://api.crossref.org/works/${doi}`;
      
      const response = await axios.get(crossrefUrl, {
        headers: {
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      const work = response.data.message;
      
      const authors = work.author 
        ? work.author.map(a => `${a.given || ''} ${a.family || ''}`.trim())
        : ['Auteur inconnu'];

      const metadata = {
        title: work.title ? work.title[0] : 'Titre non disponible',
        authors: authors.join(', '),
        doi: work.DOI || doi,
        conference: work['container-title'] ? work['container-title'][0] : '',
        publication_date: work.published 
          ? `${work.published['date-parts'][0][0]}-${String(work.published['date-parts'][0][1] || 1).padStart(2, '0')}-${String(work.published['date-parts'][0][2] || 1).padStart(2, '0')}`
          : new Date().toISOString().split('T')[0],
        url: work.URL || `https://doi.org/${doi}`
      };

      fs.unlinkSync(req.file.path);

      console.log('Métadonnées récupérées via DOI extrait:', metadata);
      res.json(metadata);

    } catch (crossrefError) {
      console.error('Erreur Crossref:', crossrefError.message);
      
      const fallbackMetadata = {
        title: `Titre extrait de ${req.file.originalname}`,
        authors: 'Auteurs non trouvés',
        doi: doi,
        conference: 'Conférence non trouvée',
        publication_date: new Date().toISOString().split('T')[0],
        url: `https://doi.org/${doi}`
      };

      fs.unlinkSync(req.file.path);
      res.json(fallbackMetadata);
    }

  } catch (error) {
    console.error('Erreur lors de l\'extraction PDF:', error.message);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Erreur lors de l\'extraction des métadonnées PDF',
      message: error.message
    });
  }
});

// Sauvegarder un paper dans la base de données
app.post('/api/papers', upload.single('pdf'), async (req, res) => {
  try {
    console.log('🔥 Réception d\'une demande de sauvegarde de paper');
    console.log('Body:', req.body);
    console.log('File:', req.file ? req.file.originalname : 'Aucun fichier');

    // Extraire les données du formulaire
    const paperData = {
      title: req.body.title,
      authors: req.body.authors,
      publication_date: req.body.publication_date,
      conference: req.body.conference || null,
      conference_abbreviation: req.body.conference_abbreviation || null,
      reading_status: req.body.reading_status || READING_STATUS.NON_LU,
      doi: req.body.doi,
      url: req.body.url,
      image: req.body.image || null
    };

    console.log('📋 Données du paper à sauvegarder:', paperData);

    // Validation basique
    if (!paperData.title || !paperData.authors || !paperData.doi) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        message: 'Titre, auteurs et DOI sont requis'
      });
    }

    // Gérer les catégories si présentes
    let categories = [];
    if (req.body.categories) {
      try {
        categories = typeof req.body.categories === 'string' 
          ? JSON.parse(req.body.categories) 
          : req.body.categories;
        console.log('🏷️ Catégories reçues:', categories);
      } catch (error) {
        console.warn('⚠️ Erreur parsing catégories:', error.message);
      }
    }

    // Préparer les données pour les fichiers
    let pdfBuffer = null;
    let pdfName = null;
    let extractedImages = [];

    // Si un PDF est fourni
    if (req.file) {
      pdfBuffer = fs.readFileSync(req.file.path);
      pdfName = req.file.originalname;
      console.log(`📄 PDF détecté: ${pdfName} (${pdfBuffer.length} bytes)`);
      
      // Nettoyer le fichier temporaire
      fs.unlinkSync(req.file.path);
    }

    // Traiter les images extraites si présentes
    if (req.body.extractedImages) {
      try {
        extractedImages = JSON.parse(req.body.extractedImages);
        console.log(`🖼️ ${extractedImages.length} images extraites à traiter`);
      } catch (error) {
        console.warn('⚠️ Erreur parsing images extraites:', error.message);
      }
    }

    // Sauvegarder dans la base de données avec catégories
    console.log('💾 Sauvegarde en cours...');
    const savedPaper = await paperDB.createCompletePaper(
      paperData,
      pdfBuffer,
      pdfName,
      extractedImages,
      categories, // Passer les catégories
      null // Description (pour l'instant null)
    );

    console.log(`✅ Paper sauvegardé avec succès! ID: ${savedPaper.id}`);

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

// Mise à jour d'un paper avec catégories
app.put('/api/papers/:id', async (req, res) => {
  try {
    const paperId = parseInt(req.params.id);
    
    if (isNaN(paperId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    console.log(`🔄 Mise à jour du paper ID: ${paperId}`);
    console.log('Données à mettre à jour:', req.body);
    
    // Séparer les catégories des autres données
    const { categories, ...paperUpdates } = req.body;
    
    // Mettre à jour les données du paper
    const updated = await paperDB.papers.update(paperId, paperUpdates);
    
    // Gérer les catégories si présentes
    if (categories && Array.isArray(categories)) {
      await paperDB.paperCategories.setPaperCategories(paperId, categories);
    }
    
    // Récupérer le paper mis à jour avec détails
    const updatedPaper = await paperDB.papers.getByIdWithDetails(paperId);
    
    if (!updatedPaper) {
      return res.status(404).json({ 
        error: 'Paper non trouvé',
        message: `Aucun paper trouvé avec l'ID ${paperId}`
      });
    }

    console.log(`✅ Paper ${paperId} mis à jour avec succès`);
    res.json({
      success: true,
      paper: updatedPaper,
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

// Statistiques de la base
app.get('/api/papers/stats', async (req, res) => {
  try {
    console.log('📊 Récupération des statistiques...');
    
    const stats = await paperDB.getStats();
    console.log('📈 Statistiques:', stats);

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des stats:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statistiques',
      message: error.message
    });
  }
});

// Gestion des catégories - Récupérer toutes les catégories
app.get('/api/categories', async (req, res) => {
  try {
    console.log('🏷️ Récupération des catégories...');
    
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

// Upload d'image (gardé pour compatibilité)
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

// Servir les fichiers statiques
app.use('/uploads', express.static('uploads'));
app.use('/MyPapers', express.static('MyPapers'));

// Route par défaut
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Paper Manager avec SQLite',
    version: '3.0.0',
    database: paperDB.isConnectedToDB() ? 'Connected' : 'Disconnected',
    endpoints: [
      'GET /api/health',
      'POST /api/papers/metadata-from-doi',
      'POST /api/papers/extract-images',
      'POST /api/papers/extract-from-pdf',
      'POST /api/papers (Save to database with categories)',
      'GET /api/papers (Get all papers)',
      'GET /api/papers/:id (Get paper by ID)',
      'PUT /api/papers/:id (Update paper with categories)',
      'DELETE /api/papers/:id (Delete paper)',
      'GET /api/papers/stats (Get statistics)',
      'GET /api/categories (Get all categories)',
      'POST /api/categories (Create category)',
      'DELETE /api/categories/:id (Delete category)',
      'POST /api/papers/upload-image (Upload image)'
    ]
  });
});

// Démarrage du serveur avec initialisation de la base
async function startServer() {
  try {
    await initializeApp();
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
      console.log(`❤️ Health check: http://localhost:${PORT}/api/health`);
      console.log(`💾 Base de données SQLite: ${paperDB.isConnectedToDB() ? 'Connectée' : 'Déconnectée'}`);
      console.log(`📈 Statistiques: http://localhost:${PORT}/api/papers/stats`);
      console.log(`🏷️ Catégories: http://localhost:${PORT}/api/categories`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error);
    process.exit(1);
  }
}

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
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});

// Démarrer l'application
startServer();