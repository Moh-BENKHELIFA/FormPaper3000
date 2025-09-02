// frontend/src/components/AddPaperByDOI.tsx
import React, { useState } from 'react';
import { paperService } from '../services/paperService';
import { useToast } from '../contexts/ToastContext';
import type { PaperData } from '../types/Paper';

interface AddPaperByDOIProps {
  onSuccess: (paperData: PaperData) => void;
  onCancel: () => void;
}

const AddPaperByDOI: React.FC<AddPaperByDOIProps> = ({ onSuccess, onCancel }) => {
  const [doiUrl, setDoiUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { success, error: showError, warning, info } = useToast();

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

  const handleSubmit = async () => {
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
      
      success('Métadonnées récupérées avec succès !', 'Succès');
      onSuccess(metadata);
      
    } catch (error) {
      console.error('Erreur complète:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showError(`Erreur lors de la récupération des métadonnées: ${errorMessage}`, 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Récupération par DOI
        </h3>
        <p className="text-gray-600">
          Entrez l'URL ou le DOI de l'article pour récupérer automatiquement les métadonnées
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            DOI ou URL de l'article
          </label>
          <input
            type="url"
            value={doiUrl}
            onChange={(e) => setDoiUrl(e.target.value)}
            placeholder="https://dl-acm-org.gorgone.univ-toulouse.fr/doi/pdf/10.1145/3532106.3533472"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <p className="mt-1 text-sm text-gray-500">
            Formats acceptés : URL complète, DOI (ex: 10.1145/3532106.3533472)
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSubmit}
            disabled={isLoading || !doiUrl.trim()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Récupération...
              </div>
            ) : (
              'Récupérer les métadonnées'
            )}
          </button>
        </div>
      </div>

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Récupération des métadonnées...</span>
        </div>
      )}
    </div>
  );
};

export default AddPaperByDOI;