// frontend/src/components/ImageSelectionModal.tsx
import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Download } from 'lucide-react';

interface ExtractedImage {
  id: string;
  name: string;
  url: string; // URL blob ou base64
  page: number;
  width?: number;
  height?: number;
  buffer?: Buffer;
}

interface ImageSelectionModalProps {
  isOpen: boolean;
  images: ExtractedImage[];
  onClose: () => void;
  onSave: (selectedImages: ExtractedImage[]) => void;
  paperTitle: string;
}

const ImageSelectionModal: React.FC<ImageSelectionModalProps> = ({
  isOpen,
  images,
  onClose,
  onSave,
  paperTitle
}) => {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Réinitialiser la sélection quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setSelectedImages(new Set());
      setPreviewImage(null);
    }
  }, [isOpen]);

  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
  };

  const selectAll = () => {
    setSelectedImages(new Set(images.map(img => img.id)));
  };

  const selectNone = () => {
    setSelectedImages(new Set());
  };

  const handleSave = () => {
    const selected = images.filter(img => selectedImages.has(img.id));
    onSave(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Sélectionner les images à sauvegarder
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {images.length} image{images.length > 1 ? 's' : ''} extraite{images.length > 1 ? 's' : ''} de "{paperTitle}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contrôles de sélection */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedImages.size} sur {images.length} sélectionnée{selectedImages.size > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Tout sélectionner
              </button>
              <button
                onClick={selectNone}
                className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Tout désélectionner
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={selectedImages.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              Sauvegarder ({selectedImages.size})
            </button>
          </div>
        </div>

        {/* Liste des images */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                  selectedImages.has(image.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.id)}
                    onChange={() => toggleImageSelection(image.id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                {/* Numéro de page */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  Page {image.page}
                </div>

                {/* Image */}
                <div
                  className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden"
                  onClick={() => toggleImageSelection(image.id)}
                >
                  <img
                    src={image.url}
                    alt={`Image extraite ${index + 1}`}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50" y="50" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="12" fill="%236b7280">Erreur</text></svg>';
                    }}
                  />
                </div>

                {/* Informations sur l'image */}
                <div className="p-2 bg-white border-t">
                  <div className="text-xs text-gray-600">
                    {image.name}
                  </div>
                  {image.width && image.height && (
                    <div className="text-xs text-gray-500">
                      {image.width} × {image.height}
                    </div>
                  )}
                </div>

                {/* Bouton aperçu */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(image.url);
                  }}
                  className="absolute bottom-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 p-1 rounded-full shadow"
                  title="Aperçu"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal d'aperçu */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img
              src={previewImage}
              alt="Aperçu"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageSelectionModal;