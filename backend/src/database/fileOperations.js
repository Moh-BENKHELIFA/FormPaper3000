// backend/src/database/fileOperations.js - VERSION AMELIOREE
const fs = require('fs');
const path = require('path');

/**
 * Formater le nom du dossier selon les spécifications
 * @param {number} paperId - ID du paper
 * @param {string} title - Titre de l'article
 * @param {string} createdAt - Date de création (ISO string)
 * @returns {string} - Nom du dossier formaté
 */
function formatFolderName(paperId, title, createdAt) {
  // Format date JJMMAA
  const date = new Date(createdAt);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const dateStr = `${day}${month}${year}`;
  
  // Nettoyer et raccourcir le titre (max 50 caractères)
  let cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Supprimer caractères spéciaux
    .replace(/\s+/g, '_') // Remplacer espaces par underscore
    .substring(0, 50); // Limiter à 50 caractères
  
  // Format final: ID_Titre_JJMMAA
  return `${paperId}_${cleanTitle}_${dateStr}`;
}

/**
 * Créer la structure de dossiers pour un paper
 * @param {number} paperId - ID du paper
 * @param {string} title - Titre de l'article
 * @param {string} createdAt - Date de création
 * @returns {Promise<Object>} - Objet avec les chemins des dossiers
 */
function createPaperFolderStructure(paperId, title, createdAt) {
  return new Promise((resolve, reject) => {
    try {
      // Dossier racine MyPaperList
      const myPaperListDir = path.join(process.cwd(), 'MyPaperList');
      
      // Créer MyPaperList s'il n'existe pas
      if (!fs.existsSync(myPaperListDir)) {
        fs.mkdirSync(myPaperListDir, { recursive: true });
        console.log('📁 Dossier MyPaperList créé');
      }

      // Nom du dossier de l'article
      const paperFolderName = formatFolderName(paperId, title, createdAt);
      const paperFolderPath = path.join(myPaperListDir, paperFolderName);

      // Créer le dossier principal de l'article
      if (!fs.existsSync(paperFolderPath)) {
        fs.mkdirSync(paperFolderPath, { recursive: true });
        console.log(`📁 Dossier article créé: ${paperFolderPath}`);
      }

      // Créer les sous-dossiers
      const subFolders = {
        main: paperFolderPath,
        pdfImages: path.join(paperFolderPath, 'pdf-images'),
        importedImages: path.join(paperFolderPath, 'imported-images'),
        notes: path.join(paperFolderPath, 'notes.json') // Fichier JSON pour les notes
      };

      // Créer pdf-images
      if (!fs.existsSync(subFolders.pdfImages)) {
        fs.mkdirSync(subFolders.pdfImages, { recursive: true });
        console.log(`📁 Dossier pdf-images créé`);
      }

      // Créer imported-images
      if (!fs.existsSync(subFolders.importedImages)) {
        fs.mkdirSync(subFolders.importedImages, { recursive: true });
        console.log(`📁 Dossier imported-images créé`);
      }

      resolve(subFolders);
    } catch (error) {
      console.error('❌ Erreur création structure dossiers:', error);
      reject(error);
    }
  });
}

/**
 * Sauvegarder un PDF avec le titre de l'article
 * @param {number} paperId - ID du paper
 * @param {string} title - Titre de l'article
 * @param {string} createdAt - Date de création
 * @param {Buffer} pdfBuffer - Buffer du PDF
 * @returns {Promise<string>} - Chemin du PDF sauvegardé
 */
function savePaperPDF(paperId, title, createdAt, pdfBuffer) {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer la structure de dossiers
      const folders = await createPaperFolderStructure(paperId, title, createdAt);
      
      // Nettoyer le titre pour le nom du fichier
      const cleanTitle = title
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 100); // Max 100 caractères pour le nom du fichier
      
      const pdfFileName = `${cleanTitle}.pdf`;
      const pdfPath = path.join(folders.main, pdfFileName);

      // Sauvegarder le PDF
      fs.writeFileSync(pdfPath, pdfBuffer);
      console.log(`💾 PDF sauvegardé: ${pdfFileName}`);

      resolve(pdfPath);
    } catch (error) {
      console.error('❌ Erreur sauvegarde PDF:', error);
      reject(error);
    }
  });
}

/**
 * Sauvegarder les images extraites sélectionnées
 * @param {number} paperId - ID du paper
 * @param {string} title - Titre de l'article
 * @param {string} createdAt - Date de création
 * @param {Array} selectedImages - Images sélectionnées avec checkboxes
 * @returns {Promise<Array>} - Chemins des images sauvegardées
 */
function saveSelectedPdfImages(paperId, title, createdAt, selectedImages) {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer la structure de dossiers
      const folders = await createPaperFolderStructure(paperId, title, createdAt);
      
      const savedImagePaths = [];

      for (let i = 0; i < selectedImages.length; i++) {
        const image = selectedImages[i];
        const imageName = image.name || `pdf_image_${i + 1}.png`;
        const imagePath = path.join(folders.pdfImages, imageName);

        fs.writeFileSync(imagePath, image.buffer);
        savedImagePaths.push(imagePath);
        console.log(`🖼️ Image PDF sauvegardée: ${imageName}`);
      }

      resolve(savedImagePaths);
    } catch (error) {
      console.error('❌ Erreur sauvegarde images PDF:', error);
      reject(error);
    }
  });
}

/**
 * Sauvegarder les notes au format JSON
 * @param {number} paperId - ID du paper
 * @param {string} title - Titre de l'article
 * @param {string} createdAt - Date de création
 * @param {Array} blocks - Blocs de notes
 * @returns {Promise<string>} - Chemin du fichier notes.json
 */
function savePaperNotes(paperId, title, createdAt, blocks) {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer la structure de dossiers
      const folders = await createPaperFolderStructure(paperId, title, createdAt);
      
      const notesData = {
        paperId: paperId,
        title: title,
        blocks: blocks,
        lastModified: new Date().toISOString(),
        version: '2.0.0', // Nouvelle version pour le système de fichiers
        createdAt: createdAt
      };

      const notesJson = JSON.stringify(notesData, null, 2);
      fs.writeFileSync(folders.notes, notesJson);
      
      console.log(`📝 Notes sauvegardées: notes.json`);
      resolve(folders.notes);
    } catch (error) {
      console.error('❌ Erreur sauvegarde notes:', error);
      reject(error);
    }
  });
}

/**
 * Charger les notes depuis le fichier JSON
 * @param {number} paperId - ID du paper
 * @param {string} title - Titre de l'article
 * @param {string} createdAt - Date de création
 * @returns {Promise<Array|null>} - Blocs de notes ou null
 */
function loadPaperNotes(paperId, title, createdAt) {
  return new Promise(async (resolve, reject) => {
    try {
      const folders = await createPaperFolderStructure(paperId, title, createdAt);
      
      if (!fs.existsSync(folders.notes)) {
        resolve(null);
        return;
      }

      const notesJson = fs.readFileSync(folders.notes, 'utf8');
      const notesData = JSON.parse(notesJson);
      
      console.log(`📖 Notes chargées pour paper ${paperId}`);
      resolve(notesData.blocks);
    } catch (error) {
      console.error('❌ Erreur chargement notes:', error);
      resolve(null); // Ne pas rejeter, retourner null
    }
  });
}

/**
 * Sauvegarder une image importée dans les notes
 * @param {number} paperId - ID du paper
 * @param {string} title - Titre de l'article
 * @param {string} createdAt - Date de création
 * @param {Buffer} imageBuffer - Buffer de l'image
 * @param {string} imageName - Nom de l'image
 * @returns {Promise<string>} - Chemin de l'image sauvegardée
 */
function saveImportedImage(paperId, title, createdAt, imageBuffer, imageName) {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer la structure de dossiers
      const folders = await createPaperFolderStructure(paperId, title, createdAt);
      
      // Nettoyer le nom de l'image
      const cleanImageName = imageName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const imagePath = path.join(folders.importedImages, cleanImageName);

      fs.writeFileSync(imagePath, imageBuffer);
      console.log(`📸 Image importée sauvegardée: ${cleanImageName}`);

      // Retourner le chemin relatif pour utilisation dans les notes
      const relativePath = `imported-images/${cleanImageName}`;
      resolve(relativePath);
    } catch (error) {
      console.error('❌ Erreur sauvegarde image importée:', error);
      reject(error);
    }
  });
}

/**
 * Obtenir le chemin du dossier d'un paper
 * @param {number} paperId - ID du paper
 * @param {string} title - Titre de l'article
 * @param {string} createdAt - Date de création
 * @returns {string} - Chemin du dossier principal
 */
function getPaperFolderPath(paperId, title, createdAt) {
  const myPaperListDir = path.join(process.cwd(), 'MyPaperList');
  const paperFolderName = formatFolderName(paperId, title, createdAt);
  return path.join(myPaperListDir, paperFolderName);
}

/**
 * Supprimer complètement le dossier d'un paper
 * @param {number} paperId - ID du paper
 * @param {string} title - Titre de l'article
 * @param {string} createdAt - Date de création
 * @returns {Promise<boolean>} - True si suppression réussie
 */
function deletePaperFolder(paperId, title, createdAt) {
  return new Promise((resolve, reject) => {
    try {
      const paperFolderPath = getPaperFolderPath(paperId, title, createdAt);

      if (fs.existsSync(paperFolderPath)) {
        fs.rmSync(paperFolderPath, { recursive: true, force: true });
        console.log(`🗑️ Dossier supprimé: ${path.basename(paperFolderPath)}`);
        resolve(true);
      } else {
        console.log(`⚠️ Dossier inexistant pour paper ${paperId}`);
        resolve(false);
      }
    } catch (error) {
      console.error('❌ Erreur suppression dossier:', error);
      reject(error);
    }
  });
}

module.exports = {
  createPaperFolderStructure,
  savePaperPDF,
  saveSelectedPdfImages,
  savePaperNotes,
  loadPaperNotes,
  saveImportedImage,
  getPaperFolderPath,
  deletePaperFolder,
  formatFolderName
};