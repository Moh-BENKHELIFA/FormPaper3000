// frontend/src/components/AddPaper.tsx
import React, { useState, useEffect } from 'react';
import { paperService } from '../services/paperService';
import { useToast } from '../contexts/ToastContext';
import AddPaperByDOI from './AddPaperByDOI';
import AddPaperByPDF from './AddPaperByPDF';
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

interface AddPaperProps {
  onClose?: () => void;
  onSave?: (paperData: PaperData) => void;
}

const InputMethodValues = ['doi', 'pdf', 'form'] as const;
type InputMethod = typeof InputMethodValues[number];

const AddPaper: React.FC<AddPaperProps> = ({ onClose, onSave }) => {
  // États de navigation
const [currentStep, setCurrentStep] = useState<InputMethod>('doi');
  const [isLoading, setIsLoading] = useState(false);

  // États des données
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
  
  // États PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<ExtractedImage[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // États pour les tags
  const [tags, setTags] = useState<Category[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const { success, error: showError, warning, info } = useToast();

  // Charger les tags au montage
  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tagsList = await paperService.getAllCategories();
      setTags(tagsList);
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
      showError('Erreur lors du chargement des tags', 'Erreur');
    }
  };

  // Créer un nouveau tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    setIsCreatingTag(true);
    try {
      const result = await paperService.createCategory(newTagName.trim());
      
      await loadTags();
      setSelectedTags(prev => [...prev, result.id]);
      
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

  // Callbacks pour les sous-composants
  const handleDOISuccess = (data: PaperData) => {
    setPaperData(data);
    setCurrentStep('form');
  };

  const handlePDFSuccess = (result: { paperData: PaperData; pdfFile: File; selectedImages: ExtractedImage[] }) => {
    setPaperData(result.paperData);
    setPdfFile(result.pdfFile);
    setSelectedImages(result.selectedImages);
    setCurrentStep('form');
  };

  const handleBackToSelection = () => {
    setCurrentStep('doi');
    // Reset des états
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
    setPdfFile(null);
    setSelectedImages([]);
    setImageFile(null);
    setSelectedTags([]);
  };

  // Sauvegarde finale
  const handleSavePaper = async () => {
    try {
      setIsLoading(true);
      
      // Validation
      if (!paperData.title || !paperData.authors || !paperData.doi || !paperData.url) {
        warning('Veuillez remplir tous les champs obligatoires (titre, auteurs, DOI, URL)');
        return;
      }
      
      info('Création de l\'article en cours...', 'Traitement');
      
      // Préparer les données pour l'API
      const formData = new FormData();
      
      // Ajouter les données du paper
      Object.entries(paperData).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value.toString());
        }
      });

      // Ajouter les tags sélectionnés
      if (selectedTags.length > 0) {
        formData.append('categories', JSON.stringify(selectedTags));
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

      // Tentative nouvelle API, fallback vers ancienne
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
        // Fallback vers l'ancienne méthode
        console.log('Utilisation de l\'ancienne API de sauvegarde');
        
        const paperToSave: PaperData = {
          ...paperData,
        };
        
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
      
      // Réinitialiser après un délai
      setTimeout(() => {
        handleBackToSelection();
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

  // Upload d'image de couverture
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  // Rendu conditionnel selon l'étape
  const renderContent = () => {
    switch (currentStep) {
      case 'doi':
        return (
          <div className="space-y-6">
            {/* Navigation entre DOI et PDF */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                <button
                  onClick={() => setCurrentStep('doi')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentStep === 'doi'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  Par DOI
                </button>
                <button
                  onClick={() => setCurrentStep('pdf')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentStep === 'pdf'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  Par PDF
                </button>
              </div>
            </div>
            
            <AddPaperByDOI
              onSuccess={handleDOISuccess}
              onCancel={() => {}}
            />
          </div>
        );

      case 'pdf':
        return (
          <div className="space-y-6">
            {/* Navigation entre DOI et PDF */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                <button
                  onClick={() => setCurrentStep('doi')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentStep === 'doi'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  Par DOI
                </button>
                <button
                  onClick={() => setCurrentStep('pdf')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentStep === 'pdf'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  Par PDF
                </button>
              </div>
            </div>
            
            <AddPaperByPDF
              onSuccess={handlePDFSuccess}
              onCancel={() => {}}
            />
          </div>
        );

      case 'form':
        return (
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
            {selectedImages.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">
                  Images sélectionnées ({selectedImages.length})
                </h4>
                <div className="text-sm text-green-800">
                  {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} seront sauvegardées dans le dossier pdf-images/
                </div>
              </div>
            )}

            {/* Sélection des tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tags
              </label>
              
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
                onClick={handleBackToSelection}
                disabled={isLoading}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                ← Retour
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
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header fixe */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">
            {currentStep === 'doi' && 'Récupération par DOI'}
            {currentStep === 'pdf' && 'Import par PDF'}  
            {currentStep === 'form' && 'Finaliser l\'article'}
          </h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Contenu avec scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AddPaper;