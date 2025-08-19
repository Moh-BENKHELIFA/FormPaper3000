const fs = require('fs');
const path = require('path');

/**
 * Créer un dossier unique pour un paper
 * @param {number} paperId - ID du paper
 * @returns {Promise<string>} - Chemin du dossier créé
 */
function createPaperFolder(paperId) {
  return new Promise((resolve, reject) => {
    try {
      // Dossier racine MyPapers
      const myPapersDir = path.join(process.cwd(), 'MyPapers');
      
      // Créer le dossier MyPapers s'il n'existe pas
      if (!fs.existsSync(myPapersDir)) {
        fs.mkdirSync(myPapersDir, { recursive: true });
        console.log('📁 Dossier MyPapers créé');
      }

      // Dossier spécifique au paper
      const paperFolderName = `paper_${paperId}`;
      const paperFolderPath = path.join(myPapersDir, paperFolderName);

      // Créer le dossier du paper
      if (!fs.existsSync(paperFolderPath)) {
        fs.mkdirSync(paperFolderPath, { recursive: true });
        console.log(`📁 Dossier créé: ${paperFolderPath}`);
      }

      // Créer le sous-dossier images
      const imagesFolderPath = path.join(paperFolderPath, 'images');
      if (!fs.existsSync(imagesFolderPath)) {
        fs.mkdirSync(imagesFolderPath, { recursive: true });
        console.log(`📁 Dossier images créé: ${imagesFolderPath}`);
      }

      resolve(paperFolderPath);
    } catch (error) {
      console.error('❌ Erreur création dossier:', error);
      reject(error);
    }
  });
}

/**
 * Sauvegarder un fichier PDF dans le dossier du paper
 * @param {number} paperId - ID du paper
 * @param {Buffer} pdfBuffer - Buffer du fichier PDF
 * @param {string} originalName - Nom original du fichier
 * @returns {Promise<string>} - Chemin du fichier sauvegardé
 */
function savePdfFile(paperId, pdfBuffer, originalName) {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer le dossier du paper
      const paperFolderPath = await createPaperFolder(paperId);
      
      // Nettoyer le nom du fichier
      const cleanFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const pdfPath = path.join(paperFolderPath, cleanFileName);

      // Sauvegarder le PDF
      fs.writeFileSync(pdfPath, pdfBuffer);
      console.log(`💾 PDF sauvegardé: ${pdfPath}`);

      resolve(pdfPath);
    } catch (error) {
      console.error('❌ Erreur sauvegarde PDF:', error);
      reject(error);
    }
  });
}

/**
 * Sauvegarder les images extraites du PDF
 * @param {number} paperId - ID du paper
 * @param {Array} images - Tableau d'objets images {name, buffer}
 * @returns {Promise<Array>} - Tableau des chemins des images sauvegardées
 */
function saveExtractedImages(paperId, images) {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer le dossier du paper
      const paperFolderPath = await createPaperFolder(paperId);
      const imagesFolderPath = path.join(paperFolderPath, 'images');

      const savedImagePaths = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageName = image.name || `image_${i + 1}.png`;
        const imagePath = path.join(imagesFolderPath, imageName);

        fs.writeFileSync(imagePath, image.buffer);
        savedImagePaths.push(imagePath);
        console.log(`🖼️ Image sauvegardée: ${imagePath}`);
      }

      resolve(savedImagePaths);
    } catch (error) {
      console.error('❌ Erreur sauvegarde images:', error);
      reject(error);
    }
  });
}

/**
 * Supprimer le dossier complet d'un paper
 * @param {number} paperId - ID du paper
 * @returns {Promise<boolean>} - True si suppression réussie
 */
function deletePaperFolder(paperId) {
  return new Promise((resolve, reject) => {
    try {
      const myPapersDir = path.join(process.cwd(), 'MyPapers');
      const paperFolderName = `paper_${paperId}`;
      const paperFolderPath = path.join(myPapersDir, paperFolderName);

      if (fs.existsSync(paperFolderPath)) {
        fs.rmSync(paperFolderPath, { recursive: true, force: true });
        console.log(`🗑️ Dossier supprimé: ${paperFolderPath}`);
        resolve(true);
      } else {
        console.log(`⚠️ Dossier inexistant: ${paperFolderPath}`);
        resolve(false);
      }
    } catch (error) {
      console.error('❌ Erreur suppression dossier:', error);
      reject(error);
    }
  });
}

/**
 * Obtenir le chemin du dossier d'un paper
 * @param {number} paperId - ID du paper
 * @returns {string} - Chemin du dossier
 */
function getPaperFolderPath(paperId) {
  const myPapersDir = path.join(process.cwd(), 'MyPapers');
  const paperFolderName = `paper_${paperId}`;
  return path.join(myPapersDir, paperFolderName);
}

/**
 * Vérifier si le dossier d'un paper existe
 * @param {number} paperId - ID du paper
 * @returns {boolean} - True si le dossier existe
 */
function paperFolderExists(paperId) {
  const paperFolderPath = getPaperFolderPath(paperId);
  return fs.existsSync(paperFolderPath);
}

/**
 * Lister les fichiers dans le dossier d'un paper
 * @param {number} paperId - ID du paper
 * @returns {Promise<Object>} - Objet avec les listes de fichiers
 */
function listPaperFiles(paperId) {
  return new Promise((resolve, reject) => {
    try {
      const paperFolderPath = getPaperFolderPath(paperId);
      
      if (!fs.existsSync(paperFolderPath)) {
        resolve({ pdf: null, images: [] });
        return;
      }

      const files = fs.readdirSync(paperFolderPath);
      const imagesFolderPath = path.join(paperFolderPath, 'images');
      
      const result = {
        pdf: null,
        images: []
      };

      // Chercher le fichier PDF
      const pdfFile = files.find(file => file.toLowerCase().endsWith('.pdf'));
      if (pdfFile) {
        result.pdf = path.join(paperFolderPath, pdfFile);
      }

      // Lister les images
      if (fs.existsSync(imagesFolderPath)) {
        const imageFiles = fs.readdirSync(imagesFolderPath);
        result.images = imageFiles
          .filter(file => /\.(png|jpg|jpeg|gif|bmp)$/i.test(file))
          .map(file => path.join(imagesFolderPath, file));
      }

      resolve(result);
    } catch (error) {
      console.error('❌ Erreur listage fichiers:', error);
      reject(error);
    }
  });
}

module.exports = {
  createPaperFolder,
  savePdfFile,
  saveExtractedImages,
  deletePaperFolder,
  getPaperFolderPath,
  paperFolderExists,
  listPaperFiles
};