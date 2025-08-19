/**
 * Types pour les statuts de lecture
 */
const READING_STATUS = {
  NON_LU: 'non_lu',
  EN_COURS: 'en_cours',
  LU: 'lu',
  FAVORIS: 'favoris'
};

/**
 * Validation pour Paper
 * @param {Object} paper 
 * @returns {boolean}
 */
function validatePaper(paper) {
  const required = ['title', 'authors', 'publication_date', 'doi', 'url'];
  return required.every(field => paper[field] && paper[field].toString().trim() !== '');
}

/**
 * Validation pour Category
 * @param {Object} category 
 * @returns {boolean}
 */
function validateCategory(category) {
  return category.name && category.name.trim() !== '';
}

/**
 * Validation pour Description
 * @param {Object} description 
 * @returns {boolean}
 */
function validateDescription(description) {
  return description.paper_id && typeof description.paper_id === 'number';
}

/**
 * Créer un objet Paper avec des valeurs par défaut
 * @param {Object} paperData 
 * @returns {Object}
 */
function createPaper(paperData) {
  return {
    id: paperData.id || null,
    title: paperData.title || '',
    authors: paperData.authors || '',
    publication_date: paperData.publication_date || new Date().toISOString().split('T')[0],
    conference: paperData.conference || null,
    reading_status: paperData.reading_status || READING_STATUS.NON_LU,
    image: paperData.image || null,
    doi: paperData.doi || '',
    url: paperData.url || '',
    folder_path: paperData.folder_path || null,
    created_at: paperData.created_at || null
  };
}

/**
 * Créer un objet Category
 * @param {Object} categoryData 
 * @returns {Object}
 */
function createCategory(categoryData) {
  return {
    id: categoryData.id || null,
    name: categoryData.name || ''
  };
}

/**
 * Créer un objet Description
 * @param {Object} descriptionData 
 * @returns {Object}
 */
function createDescription(descriptionData) {
  return {
    id: descriptionData.id || null,
    paper_id: descriptionData.paper_id || null,
    texte: descriptionData.texte || null,
    images: descriptionData.images || null
  };
}

/**
 * Créer un objet PaperCategory
 * @param {Object} paperCategoryData 
 * @returns {Object}
 */
function createPaperCategory(paperCategoryData) {
  return {
    id: paperCategoryData.id || null,
    paper_id: paperCategoryData.paper_id || null,
    categorie_id: paperCategoryData.categorie_id || null
  };
}

module.exports = {
  READING_STATUS,
  validatePaper,
  validateCategory,
  validateDescription,
  createPaper,
  createCategory,
  createDescription,
  createPaperCategory
};