// backend/src/routes/notesRoutes.js - Routes pour les notes dans le système de fichiers
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  createPaperFolderStructure,
  savePaperNotes,
  loadPaperNotes,
  saveImportedImage,
  deletePaperFolder,
  getPaperFolderPath
} = require('../database/fileOperations');

const router = express.Router();

// Configuration multer pour upload d'images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont autorisés'), false);
    }
  }
});

/**
 * POST /api/papers/:id/notes
 * Sauvegarder les notes d'un paper
 */
router.post('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { paperId, title, createdAt, blocks } = req.body;

    if (!paperId || !title || !createdAt || !Array.isArray(blocks)) {
      return res.status(400).json({
        error: 'Données manquantes: paperId, title, createdAt, blocks requis'
      });
    }

    const notesPath = await savePaperNotes(
      parseInt(paperId),
      title,
      createdAt,
      blocks
    );

    res.json({
      success: true,
      message: 'Notes sauvegardées avec succès',
      path: notesPath,
      blockCount: blocks.length
    });

  } catch (error) {
    console.error('Erreur sauvegarde notes:', error);
    res.status(500).json({
      error: 'Erreur lors de la sauvegarde des notes',
      details: error.message
    });
  }
});

/**
 * GET /api/papers/:id/notes
 * Charger les notes d'un paper
 */
router.get('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, createdAt } = req.query;

    if (!title || !createdAt) {
      return res.status(400).json({
        error: 'Paramètres manquants: title et createdAt requis'
      });
    }

    const blocks = await loadPaperNotes(
      parseInt(id),
      title,
      createdAt
    );

    if (!blocks) {
      return res.status(404).json({
        error: 'Aucune note trouvée pour ce paper'
      });
    }

    res.json({
      paperId: id,
      title,
      blocks,
      lastModified: new Date().toISOString(),
      version: '2.0.0',
      createdAt
    });

  } catch (error) {
    console.error('Erreur chargement notes:', error);
    res.status(500).json({
      error: 'Erreur lors du chargement des notes',
      details: error.message
    });
  }
});

/**
 * DELETE /api/papers/:id/notes
 * Supprimer les notes d'un paper
 */
router.delete('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, createdAt } = req.body;

    if (!title || !createdAt) {
      return res.status(400).json({
        error: 'Données manquantes: title et createdAt requis'
      });
    }

    const folderPath = getPaperFolderPath(parseInt(id), title, createdAt);
    const notesPath = path.join(folderPath, 'notes.json');

    if (fs.existsSync(notesPath)) {
      fs.unlinkSync(notesPath);
      console.log(`Notes supprimées: ${notesPath}`);
    }

    res.json({
      success: true,
      message: 'Notes supprimées avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression notes:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression des notes',
      details: error.message
    });
  }
});

/**
 * GET /api/papers/:id/notes/exists
 * Vérifier si des notes existent
 */
router.get('/:id/notes/exists', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, createdAt } = req.query;

    if (!title || !createdAt) {
      return res.status(400).json({
        error: 'Paramètres manquants: title et createdAt requis'
      });
    }

    const folderPath = getPaperFolderPath(parseInt(id), title, createdAt);
    const notesPath = path.join(folderPath, 'notes.json');

    if (fs.existsSync(notesPath)) {
      res.json({ exists: true });
    } else {
      res.status(404).json({ exists: false });
    }

  } catch (error) {
    console.error('Erreur vérification notes:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification des notes',
      details: error.message
    });
  }
});

/**
 * POST /api/papers/:id/imported-images
 * Sauvegarder une image importée
 */
router.post('/:id/imported-images', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { paperId, title, createdAt } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: 'Aucune image fournie'
      });
    }

    if (!paperId || !title || !createdAt) {
      return res.status(400).json({
        error: 'Données manquantes: paperId, title, createdAt requis'
      });
    }

    const relativePath = await saveImportedImage(
      parseInt(paperId),
      title,
      createdAt,
      req.file.buffer,
      req.file.originalname
    );

    res.json({
      success: true,
      message: 'Image sauvegardée avec succès',
      path: relativePath,
      filename: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    console.error('Erreur sauvegarde image:', error);
    res.status(500).json({
      error: 'Erreur lors de la sauvegarde de l\'image',
      details: error.message
    });
  }
});

/**
 * GET /api/papers/files/:folderName/*
 * Servir les fichiers statiques des papers
 */
router.get('/files/:folderName/*', (req, res) => {
  try {
    const { folderName } = req.params;
    const filePath = req.params[0]; // Capture le reste du chemin
    
    const myPaperListDir = path.join(process.cwd(), 'MyPaperList');
    const fullPath = path.join(myPaperListDir, folderName, filePath);

    // Vérification de sécurité - s'assurer que le fichier est dans MyPaperList
    if (!fullPath.startsWith(myPaperListDir)) {
      return res.status(403).json({
        error: 'Accès non autorisé'
      });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        error: 'Fichier non trouvé'
      });
    }

    // Servir le fichier
    res.sendFile(fullPath);

  } catch (error) {
    console.error('Erreur service fichier:', error);
    res.status(500).json({
      error: 'Erreur lors du service du fichier',
      details: error.message
    });
  }
});

/**
 * POST /api/papers/notes/export
 * Exporter toutes les notes
 */
router.get('/notes/export', async (req, res) => {
  try {
    const myPaperListDir = path.join(process.cwd(), 'MyPaperList');
    
    if (!fs.existsSync(myPaperListDir)) {
      return res.json({
        export: {},
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      });
    }

    const exportData = {};
    const folders = fs.readdirSync(myPaperListDir);

    for (const folder of folders) {
      const folderPath = path.join(myPaperListDir, folder);
      const notesPath = path.join(folderPath, 'notes.json');

      if (fs.existsSync(notesPath)) {
        try {
          const notesContent = fs.readFileSync(notesPath, 'utf8');
          exportData[folder] = JSON.parse(notesContent);
        } catch (error) {
          console.error(`Erreur lecture notes ${folder}:`, error);
        }
      }
    }

    res.json({
      export: exportData,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      totalPapers: Object.keys(exportData).length
    });

  } catch (error) {
    console.error('Erreur export notes:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'export des notes',
      details: error.message
    });
  }
});

/**
 * POST /api/papers/notes/import
 * Importer des notes depuis un backup
 */
router.post('/notes/import', async (req, res) => {
  try {
    const { export: notesData } = req.body;

    if (!notesData || typeof notesData !== 'object') {
      return res.status(400).json({
        error: 'Format de données invalide'
      });
    }

    let imported = 0;
    const errors = [];

    for (const [folderName, notes] of Object.entries(notesData)) {
      try {
        if (!notes.paperId || !notes.title || !notes.createdAt) {
          continue;
        }

        await savePaperNotes(
          notes.paperId,
          notes.title,
          notes.createdAt,
          notes.blocks || []
        );

        imported++;
      } catch (error) {
        errors.push(`${folderName}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import terminé: ${imported} papers importés`,
      imported,
      total: Object.keys(notesData).length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Erreur import notes:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'import des notes',
      details: error.message
    });
  }
});

module.exports = router;