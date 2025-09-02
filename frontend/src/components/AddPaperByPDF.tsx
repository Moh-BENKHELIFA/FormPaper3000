// frontend/src/components/AddPaperByPDF.tsx
import React, { useState } from 'react';
import { paperService } from '../services/paperService';
import { useToast } from '../contexts/ToastContext';
import ImageSelectionModal from './ImageSelectionModal';
import type { PaperData } from '../types/Paper';

interface ExtractedImage {
  id: string;
  name: string;
  url: string;
  page: number;
  width?: number;
  height?: number;
  buffer?: Buffer;
}

interface AddPaperByPDFResult {
  paperData: PaperData;
  pdfFile: File;
  selectedImages: ExtractedImage[];
}

interface AddPaperByPDFProps {
  onSuccess: (result: AddPaperByPDFResult) => void;
  onCancel: () => void;
}

const AddPaperByPDF: React.FC<AddPaperByPDFProps> = ({ onSuccess, onCancel }) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<ExtractedImage[]>([]);
  const [showImageSelection, setShowImageSelection] = useState(false);
  const [paperData, setPaperData] = useState<PaperData | null>(null);

  const { success, error: showError, info } = useToast();

  // Extraction des images depuis un PDF  
  const extractImagesFromPdf = async (file: File): Promise<ExtractedImage[]> => {
    try {
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

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      // Reset des états précédents
      setExtractedImages([]);
      setSelectedImages([]);
      setPaperData(null);
    } else {
      showError('Veuillez sélectionner un fichier PDF valide', 'Format invalide');
    }
  };

  const handleSubmit = async () => {
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
      
      // Afficher la sélection d'images si des images ont été trouvées
      if (images.length > 0) {
        setShowImageSelection(true);
        success(`Extraction réussie ! ${images.length} images trouvées`, 'Succès');
      } else {
        success('Métadonnées extraites avec succès !', 'Succès');
        // Pas d'images, passer directement au formulaire
        onSuccess({
          paperData: metadata,
          pdfFile,
          selectedImages: []
        });
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

    // Passer au formulaire avec toutes les données
    if (paperData) {
      onSuccess({
        paperData,
        pdfFile: pdfFile!,
        selectedImages: images
      });
    }
  };

  const handleSkipImageSelection = () => {
    if (paperData) {
      onSuccess({
        paperData,
        pdfFile: pdfFile!,
        selectedImages: []
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Import par PDF
        </h3>
        <p className="text-gray-600">
          Importez un fichier PDF pour extraire automatiquement les métadonnées et les images
        </p>
      </div>

      <div className="space-y-4">
        {/* Upload PDF */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
          <div className="text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            
            <div className="mb-4">
              <label className="cursor-pointer">
                <span className="text-lg font-medium text-gray-900 hover:text-blue-600">
                  Sélectionner un fichier PDF
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>
              <p className="text-sm text-gray-500 mt-1">
                ou glissez-déposez votre fichier ici
              </p>
            </div>

            {pdfFile && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center text-green-700">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{pdfFile.name}</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  {Math.round(pdfFile.size / 1024)} KB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex space-x-3">
          <button
            onClick={handleSubmit}
            disabled={isLoading || !pdfFile}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Extraction en cours...
              </div>
            ) : (
              'Extraire les données'
            )}
          </button>
        </div>

        {/* Indicateur de progression */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <div>
                <p className="text-sm font-medium text-blue-900">Extraction en cours...</p>
                <p className="text-xs text-blue-700">
                  Extraction des métadonnées et des images du PDF
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Images extraites - aperçu */}
        {extractedImages.length > 0 && !showImageSelection && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-yellow-900">
                  {extractedImages.length} images extraites
                </h4>
                <p className="text-sm text-yellow-700">
                  Sélectionnez les images à conserver
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowImageSelection(true)}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Sélectionner
                </button>
                <button
                  onClick={handleSkipImageSelection}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de sélection d'images */}
      <ImageSelectionModal
        isOpen={showImageSelection}
        images={extractedImages}
        onClose={() => setShowImageSelection(false)}
        onSave={handleImageSelection}
        paperTitle={paperData?.title || 'Article sans titre'}
      />
    </div>
  );
};

export default AddPaperByPDF;