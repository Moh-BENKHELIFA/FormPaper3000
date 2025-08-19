import React, { useState, useEffect } from 'react';
import { paperService } from '../services/paperService';
import { useToast } from '../contexts/ToastContext';
import type { PaperData, Category } from '../services/paperService';

interface AddPaperProps {
  onClose?: () => void;
  onSave?: (paperData: PaperData) => void;
}

const AddPaper: React.FC<AddPaperProps> = ({ onClose, onSave }) => {
  const [inputMethod, setInputMethod] = useState<'doi' | 'pdf'>('doi');
  const [doiUrl, setDoiUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paperData, setPaperData] = useState<PaperData>({
    title: '',
    authors: '',
    doi: '',
    conference: '',
    publication_date: '',
    url: '',
    image: '',
    reading_status: 'non_lu'
  });
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extractedImages, setExtractedImages] = useState<any[]>([]);
  const [showImageSelection, setShowImageSelection] = useState(false);

  // États pour les catégories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Utilisation du système de toasts
  const { success, error: showError, warning, info } = useToast();

  // Charger les catégories au montage du composant
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesList = await paperService.getAllCategories();
      setCategories(categoriesList);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      showError('Erreur lors du chargement des catégories', 'Erreur');
    }
  };

  // Fonction pour extraire le DOI depuis une URL
  const extractDoiFromUrl = (url: string): string => {
    return paperService.extractDoiFromUrl(url);
  };

  // Récupération des métadonnées via DOI
  const fetchMetadataFromDoi = async (doi: string): Promise<PaperData> => {
    try {
      return await paperService.fetchMetadataFromDoi(doi);
    } catch (error) {
      throw error;
    }
  };

  // Extraction des images depuis un PDF
  const extractImagesFromPdf = async (file: File): Promise<any[]> => {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('http://localhost:5324/api/papers/extract-images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'extraction des images');
      }

      const data = await response.json();
      return data.images || [];
    } catch (error) {
      console.error('Erreur lors de l\'extraction des images:', error);
      throw error;
    }
  };

  const extractMetadataFromPdf = async (file: File): Promise<PaperData> => {
    try {
      return await paperService.extractMetadataFromPdf(file);
    } catch (error) {
      throw error;
    }
  };

  // Créer une nouvelle catégorie
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsCreatingCategory(true);
    try {
      const result = await paperService.createCategory(newCategoryName.trim());
      
      // Recharger les catégories
      await loadCategories();
      
      // Sélectionner automatiquement la nouvelle catégorie
      setSelectedCategories(prev => [...prev, result.id]);
      
      // Réinitialiser le formulaire de création
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      
      success(`Catégorie "${newCategoryName}" créée avec succès`, 'Succès');
      
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showError(`Erreur lors de la création de la catégorie: ${errorMessage}`, 'Erreur');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Gérer la sélection des catégories
  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleDoiSubmit = async () => {
    if (!doiUrl.trim()) return;
    
    setIsLoading(true);
    
    try {
      console.log('URL saisie:', doiUrl);
      const doi = extractDoiFromUrl(doiUrl);
      console.log('DOI extrait:', doi);
      
      if (!doi) {
        warning('DOI non trouvé dans l\'URL fournie. Vérifiez le format de l\'URL.');
        return;
      }
      
      info('Récupération des métadonnées en cours...', 'Traitement');
      console.log('Récupération des métadonnées pour le DOI:', doi);
      const metadata = await fetchMetadataFromDoi(doi);
      console.log('Métadonnées récupérées:', metadata);
      
      setPaperData(metadata);
      setShowForm(true);
      success('Métadonnées récupérées avec succès !', 'Succès');
    } catch (error) {
      console.error('Erreur complète:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showError(`Erreur lors de la récupération des métadonnées: ${errorMessage}`, 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfSubmit = async () => {
    if (!pdfFile) return;
    
    setIsLoading(true);
    
    try {
      console.log('Fichier PDF sélectionné:', pdfFile.name, 'Taille:', pdfFile.size);
      
      // Étape 1: Extraire les images du PDF
      info('Extraction des images du PDF...', 'Traitement');
      console.log('Extraction des images du PDF...');
      const images = await extractImagesFromPdf(pdfFile);
      setExtractedImages(images);
      console.log('Images extraites:', images);
      
      // Étape 2: Extraire les métadonnées
      info('Extraction des métadonnées du PDF...', 'Traitement');
      console.log('Extraction des métadonnées du PDF...');
      const metadata = await extractMetadataFromPdf(pdfFile);
      console.log('Métadonnées extraites du PDF:', metadata);
      
      setPaperData(metadata);
      setShowForm(true);
      
      // Afficher la sélection d'images si des images ont été trouvées
      if (images.length > 0) {
        setShowImageSelection(true);
        success(`Extraction réussie ! ${images.length} images trouvées`, 'Succès');
      } else {
        success('Métadonnées extraites avec succès !', 'Succès');
      }
      
    } catch (error) {
      console.error('Erreur complète lors de l\'extraction PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showError(`Erreur lors de l'extraction du PDF: ${errorMessage}`, 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePaper = async () => {
    try {
      setIsLoading(true);
      
      // Validation des données requises
      if (!paperData.title || !paperData.authors || !paperData.doi || !paperData.url) {
        warning('Veuillez remplir tous les champs obligatoires (titre, auteurs, DOI, URL)');
        return;
      }
      
      info('Sauvegarde en cours...', 'Traitement');
      
      // Upload de l'image si présente
      let imageUrl = paperData.image;
      if (imageFile) {
        console.log('Upload de l\'image personnalisée...');
        imageUrl = await paperService.uploadImage(imageFile);
        console.log('Image uploadée:', imageUrl);
      }
      
      // Sauvegarder le papier avec l'URL de l'image et les catégories
      const paperToSave: any = {
        ...paperData,
        image: imageUrl,
        categories: selectedCategories
      };
      
      console.log('Sauvegarde du paper:', paperToSave);
      const result = await paperService.savePaper(paperToSave as PaperData);
      console.log('Article sauvegardé avec l\'ID:', result.id);
      
      // Callback vers le parent si fourni
      if (onSave) {
        onSave(result.paper);
      }
      
      // Message de succès
      success(`Article "${paperData.title}" ajouté avec succès !`, 'Succès', 7000);
      
      // Réinitialiser le formulaire après un délai
      setTimeout(() => {
        resetForm();
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showError(`Erreur lors de la sauvegarde: ${errorMessage}`, 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setPaperData({
      title: '',
      authors: '',
      doi: '',
      conference: '',
      publication_date: '',
      url: '',
      image: '',
      reading_status: 'non_lu'
    });
    setShowForm(false);
    setDoiUrl('');
    setPdfFile(null);
    setImageFile(null);
    setExtractedImages([]);
    setShowImageSelection(false);
    setSelectedCategories([]);
    setNewCategoryName('');
    setShowNewCategoryInput(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Créer une URL temporaire pour l'aperçu
      const imageUrl = URL.createObjectURL(file);
      setPaperData((prev: PaperData) => ({ ...prev, image: imageUrl }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'non_lu': return 'bg-red-500 hover:bg-red-600';
      case 'en_cours': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'lu': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'non_lu': return 'Pas Lu';
      case 'en_cours': return 'En cours';
      case 'lu': return 'Lu';
      default: return status;
    }
  };

  return (
    <div className="p-6 bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Ajouter un article</h2>
      </div>

      {!showForm ? (
        <>
          {/* Sélection du mode d'input */}
          <div className="mb-6">
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMethod"
                  value="doi"
                  checked={inputMethod === 'doi'}
                  onChange={(e) => setInputMethod(e.target.value as 'doi')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-lg font-medium">Par DOI</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMethod"
                  value="pdf"
                  checked={inputMethod === 'pdf'}
                  onChange={(e) => setInputMethod(e.target.value as 'pdf')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-lg font-medium">Par PDF</span>
              </label>
            </div>
          </div>

          {/* Input DOI */}
          {inputMethod === 'doi' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entrez le DOI
              </label>
              <div className="flex space-x-3">
                <input
                  type="url"
                  value={doiUrl}
                  onChange={(e) => setDoiUrl(e.target.value)}
                  placeholder="https://dl-acm-org.gorgone.univ-toulouse.fr/doi/pdf/10.1145/3532106.3533472"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={handleDoiSubmit}
                  disabled={isLoading || !doiUrl.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Récupération...' : 'Récupérer'}
                </button>
              </div>
            </div>
          )}

          {/* Input PDF */}
          {inputMethod === 'pdf' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Importer le PDF
              </label>
              <div className="flex space-x-3 items-end">
                <div className="flex-1">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  {pdfFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Fichier sélectionné: {pdfFile.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={handlePdfSubmit}
                  disabled={isLoading || !pdfFile}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Extraction...' : 'Extraire'}
                </button>
              </div>
            </div>
          )}

          {/* Indicateur de chargement */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">
                {inputMethod === 'doi' ? 'Récupération des métadonnées...' : 'Extraction des données du PDF...'}
              </span>
            </div>
          )}
        </>
      ) : (
        /* Formulaire de confirmation et édition */
        <div className="space-y-6">
          {/* Aperçu des données récupérées */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4 text-blue-800">{paperData.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Auteurs:</span>
                <span className="ml-2 text-gray-600">{paperData.authors}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">DOI:</span>
                <span className="ml-2 text-blue-600">{paperData.doi}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Conférence:</span>
                <span className="ml-2 text-gray-600">{paperData.conference}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Date:</span>
                <span className="ml-2 text-gray-600">{paperData.publication_date}</span>
              </div>
            </div>
            <div className="mt-3">
              <a
                href={paperData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Lien vers l'article
              </a>
            </div>
          </div>

          {/* Sélection des catégories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Catégories
            </label>
            
            {/* Catégories existantes */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategories.includes(category.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              
              {/* Bouton pour créer une nouvelle catégorie */}
              {!showNewCategoryInput ? (
                <button
                  onClick={() => setShowNewCategoryInput(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  + Créer une nouvelle catégorie
                </button>
              ) : (
                <div className="flex space-x-3 items-end">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nom de la nouvelle catégorie"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                    />
                  </div>
                  <button
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingCategory ? 'Création...' : 'Créer'}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setNewCategoryName('');
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
            
            {selectedCategories.length > 0 && (
              <p className="text-sm text-gray-600">
                {selectedCategories.length} catégorie(s) sélectionnée(s)
              </p>
            )}
          </div>

          {/* Sélection d'image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Image de l'article
            </label>
            
            {/* Toggle entre images extraites et upload personnalisé */}
            {extractedImages.length > 0 && (
              <div className="mb-4">
                <div className="flex space-x-4 mb-3">
                  <button
                    onClick={() => setShowImageSelection(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showImageSelection 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Images du PDF ({extractedImages.length})
                  </button>
                  <button
                    onClick={() => setShowImageSelection(false)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      !showImageSelection 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Upload personnalisé
                  </button>
                </div>
              </div>
            )}

            {/* Images extraites du PDF */}
            {showImageSelection && extractedImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Sélectionnez une image extraite du PDF :
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                  {extractedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <div
                        className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                          paperData.image === img.url
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => {
                          setPaperData(prev => ({ ...prev, image: img.url }));
                          setImageFile(null); // Reset custom upload
                        }}
                      >
                        <img
                          src={img.url}
                          alt={`Image page ${img.page}`}
                          className="w-full h-20 object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                          Page {img.page}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload d'image personnalisé */}
            {(!showImageSelection || extractedImages.length === 0) && (
              <div className="mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Aperçu de l'image sélectionnée */}
            {paperData.image && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Aperçu :</p>
                <img
                  src={paperData.image}
                  alt="Aperçu"
                  className="max-w-xs h-48 object-cover rounded-lg border"
                />
              </div>
            )}
          </div>

          {/* Sélection du statut de lecture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Statut de Lecture
            </label>
            <div className="flex space-x-3">
              {(['non_lu', 'en_cours', 'lu'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setPaperData((prev: PaperData) => ({ ...prev, reading_status: status }))}
                  className={`
                    px-6 py-3 rounded-full text-white font-medium transition-colors
                    ${paperData.reading_status === status 
                      ? getStatusColor(status)
                      : 'bg-gray-300 hover:bg-gray-400'
                    }
                  `}
                >
                  {getStatusText(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-between pt-6 border-t">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Retour
            </button>
            <button
              onClick={handleSavePaper}
              disabled={isLoading}
              className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'SAUVEGARDE...' : 'ENREGISTRER DANS LA BASE DE DONNÉES'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPaper;