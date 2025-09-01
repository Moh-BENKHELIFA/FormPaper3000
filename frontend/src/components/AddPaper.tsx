// frontend/src/components/AddPaper.tsx - Version corrigée basée sur GitHub
import React, { useState, useEffect } from 'react';
import { paperService } from '../services/paperService';
import { useToast } from '../contexts/ToastContext';
import ImageSelectionModal from './ImageSelectionModal';
import type { PaperData, Category } from '../types/Paper';

interface ExtractedImage {
  id: string;
  name: string;
  url: string;
  page: number;
  width?: number;
  height?: number;
  buffer?: Buffer;
}

// ✅ Interface temporaire pour la sauvegarde avec catégories comme IDs
interface PaperDataForSave extends Omit<PaperData, 'categories'> {
  categories?: number[]; // IDs des catégories au lieu d'objets Category
}

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
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<ExtractedImage[]>([]);
  const [showImageSelection, setShowImageSelection] = useState(false);

  // États pour les tags (anciennement catégories)
  const [tags, setTags] = useState<Category[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Utilisation du système de toasts
  const { success, error: showError, warning, info } = useToast();

  // Charger les tags au montage du composant
  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tagsList = await paperService.getAllCategories(); // API reste "categories" mais on appelle ça "tags"
      setTags(tagsList);
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
      showError('Erreur lors du chargement des tags', 'Erreur');
    }
  };

  // Fonction pour extraire le DOI depuis une URL
  const extractDoiFromUrl = (url: string): string => {
    try {
      const doiPatterns = [
        /doi\.org\/(.+?)(?:\?|$)/,
        /dx\.doi\.org\/(.+?)(?:\?|$)/,
        /doi\/pdf\/(.+?)(?:\?|$)/,
        /doi\/abs\/(.+?)(?:\?|$)/,
        /\/([0-9]{2}\.[0-9]{4,}\/[-._;()\/:a-zA-Z0-9]+)/
      ];

      for (const pattern of doiPatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      const doiPattern = /^10\.[0-9]{4,}\/[-._;()\/:a-zA-Z0-9]+$/;
      if (doiPattern.test(url)) {
        return url;
      }
      
      return '';
    } catch (error) {
      console.error('Erreur lors de l\'extraction du DOI:', error);
      return '';
    }
  };

  // Récupération des métadonnées via DOI
  const fetchMetadataFromDoi = async (doi: string): Promise<PaperData> => {
    try {
      const response = await paperService.getMetadataFromDOI(doi);
      return response.paperData;
    } catch (error) {
      throw error;
    }
  };

  // Extraction des images depuis un PDF  
  const extractImagesFromPdf = async (file: File): Promise<ExtractedImage[]> => {
    try {
      // ✅ Utiliser le service existant
      const response = await paperService.extractImagesFromPDF(file);
      const images = response.images || [];
      
      // Ajouter des IDs uniques pour la sélection
      return images.map((img: any, index: number) => ({
        ...img,
        id: `extracted-${index}-${Date.now()}`
      }));
    } catch (error) {
      console.error('Erreur lors de l\'extraction des images:', error);
      throw error;
    }
  };

  const extractMetadataFromPdf = async (file: File): Promise<PaperData> => {
    try {
      console.log('📄 Extraction métadonnées du PDF:', file.name);
      
      // ✅ URL relative si proxy Vite configuré, sinon URL complète
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/papers/extract-from-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'extraction des métadonnées');
      }

      const data = await response.json();
      const metadata = data.paperData;
      
      console.log('✅ Métadonnées extraites:', metadata);
      return metadata;
      
    } catch (error) {
      console.error('❌ Erreur extraction PDF:', error);
      throw error;
    }
  };

  // Créer un nouveau tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    setIsCreatingTag(true);
    try {
      const result = await paperService.createCategory(newTagName.trim());
      
      // Recharger les tags
      await loadTags();
      
      // Sélectionner automatiquement le nouveau tag
      setSelectedTags(prev => [...prev, result.id]);
      
      // Réinitialiser le formulaire de création
      setNewTagName('');
      setShowNewTagInput(false);
      
      success(`Tag "${newTagName}" créé avec succès`, 'Succès');
      
    } catch (error) {
      console.error('Erreur lors de la création du tag:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showError(`Erreur lors de la création du tag: ${errorMessage}`, 'Erreur');
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Gérer la sélection des tags
  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
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

  // Gérer la sélection d'images
  const handleImageSelection = (images: ExtractedImage[]) => {
    setSelectedImages(images);
    setShowImageSelection(false);
    
    if (images.length > 0) {
      success(`${images.length} image${images.length > 1 ? 's' : ''} sélectionnée${images.length > 1 ? 's' : ''} pour sauvegarde`, 'Sélection');
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
      
      info('Création de l\'article en cours...', 'Traitement');
      
      // Préparer les données pour l'API incluant PDF et images sélectionnées
      const formData = new FormData();
      
      // Ajouter les données du paper
      Object.entries(paperData).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value.toString());
        }
      });

      // Ajouter les tags sélectionnés
      if (selectedTags.length > 0) {
        formData.append('categories', JSON.stringify(selectedTags)); // API reste "categories"
      }

      // Ajouter le PDF si présent
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      // Ajouter les images sélectionnées
      if (selectedImages.length > 0) {
        formData.append('selectedImages', JSON.stringify(selectedImages));
      }

      // Ajouter l'image de couverture personnalisée si présente
      if (imageFile) {
        formData.append('coverImage', imageFile);
      }

      // Utiliser la nouvelle API complète ou l'ancienne selon disponibilité
      let result;
      try {
        const response = await fetch('/api/papers/create-complete', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        result = await response.json();
      } catch (error) {
        // Fallback vers l'ancienne méthode si la nouvelle API n'existe pas
        console.log('Utilisation de l\'ancienne API de sauvegarde');
        
        // ✅ Créer un objet PaperData correct sans categories comme array de nombres
        const paperToSave: PaperData = {
          ...paperData,
          // Ne pas inclure categories ici, l'API les gère séparément
        };
        
        // ✅ Utiliser savePaper avec les catégories comme paramètre séparé si supporté
        result = await paperService.savePaper(paperToSave);
      }
      
      console.log('Article créé:', result);

      // Callback vers le parent
      if (onSave && result.paper) {
        onSave(result.paper);
      }

      // Message de succès détaillé
      const successMessage = [
        `Article "${paperData.title}" créé avec succès !`,
        result.folderName ? `📁 Dossier: ${result.folderName}` : '',
        pdfFile ? `📄 PDF sauvegardé` : '',
        selectedImages.length > 0 ? `🖼️ ${selectedImages.length} images sauvegardées` : ''
      ].filter(Boolean).join('\n');

      success(successMessage, 'Création réussie', 7000);
      
      // Réinitialiser le formulaire après un délai
      setTimeout(() => {
        resetForm();
        if (onClose) onClose();
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
    setSelectedImages([]);
    setShowImageSelection(false);
    setSelectedTags([]);
    setNewTagName('');
    setShowNewTagInput(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Ajouter un nouvel article</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        )}
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
                Entrez le DOI ou l'URL de l'article
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  {pdfFile && (
                    <p className="mt-1 text-sm text-green-600">
                      ✓ {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                    </p>
                  )}
                </div>
                <button
                  onClick={handlePdfSubmit}
                  disabled={isLoading || !pdfFile}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <span className="ml-2 text-gray-600">{paperData.conference || 'Non spécifiée'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Date:</span>
                <span className="ml-2 text-gray-600">{paperData.publication_date || 'Non spécifiée'}</span>
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

          {/* Champs éditables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre *
              </label>
              <input
                type="text"
                value={paperData.title}
                onChange={(e) => setPaperData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auteurs *
              </label>
              <input
                type="text"
                value={paperData.authors}
                onChange={(e) => setPaperData(prev => ({ ...prev, authors: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DOI *
              </label>
              <input
                type="text"
                value={paperData.doi}
                onChange={(e) => setPaperData(prev => ({ ...prev, doi: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conférence
              </label>
              <input
                type="text"
                value={paperData.conference || ''}
                onChange={(e) => setPaperData(prev => ({ ...prev, conference: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de publication
              </label>
              <input
                type="date"
                value={paperData.publication_date || ''}
                onChange={(e) => setPaperData(prev => ({ ...prev, publication_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL *
              </label>
              <input
                type="url"
                value={paperData.url}
                onChange={(e) => setPaperData(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Images extraites du PDF */}
          {extractedImages.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-green-900">
                  Images extraites du PDF ({extractedImages.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setShowImageSelection(true)}
                  className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Sélectionner images
                </button>
              </div>
              
              {selectedImages.length > 0 && (
                <div className="text-sm text-green-800">
                  ✅ {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} sélectionnée{selectedImages.length > 1 ? 's' : ''} 
                  pour sauvegarde dans pdf-images/
                </div>
              )}
            </div>
          )}

          {/* Sélection des tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tags
            </label>
            
            {/* Tags existants */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedTags.includes(tag.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>

              {/* Bouton ajouter nouveau tag */}
              {!showNewTagInput ? (
                <button
                  onClick={() => setShowNewTagInput(true)}
                  className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-full text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  + Nouveau tag
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nom du tag"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTag();
                      } else if (e.key === 'Escape') {
                        setShowNewTagInput(false);
                        setNewTagName('');
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || isCreatingTag}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    {isCreatingTag ? '...' : 'Créer'}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewTagInput(false);
                      setNewTagName('');
                    }}
                    className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Image de couverture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image de couverture (optionnelle)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {imageFile && (
              <p className="mt-1 text-sm text-green-600">
                ✓ {imageFile.name}
              </p>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-between">
            <button
              onClick={resetForm}
              disabled={isLoading}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
            >
              Recommencer
            </button>

            <button
              onClick={handleSavePaper}
              disabled={isLoading || !paperData.title || !paperData.authors || !paperData.doi || !paperData.url}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
                </div>
              ) : (
                'Sauvegarder l\'article'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal de sélection d'images */}
      <ImageSelectionModal
        isOpen={showImageSelection}
        images={extractedImages}
        onClose={() => setShowImageSelection(false)}
        onSave={handleImageSelection}
        paperTitle={paperData.title || 'Article sans titre'}
      />
    </div>
  );
};

export default AddPaper;