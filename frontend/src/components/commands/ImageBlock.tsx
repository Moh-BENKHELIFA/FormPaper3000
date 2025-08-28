// commands/ImageBlock.tsx
import React, { useState, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';import { Upload, X, Image, Link, Loader } from 'lucide-react';
import type { BlockProps } from '../../types/BlockTypes';

export const ImageBlock: React.FC<BlockProps> = ({ 
  block, 
  updateContent, 
  onEnter, 
  onDelete 
}) => {
  const [imageUrl, setImageUrl] = useState<string>(block.content || '');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('L\'image ne doit pas dépasser 10MB');
        return;
      }

      setIsLoading(true);
      setError('');

      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setImageUrl(url);
        updateContent(block.id, url);
        setIsLoading(false);
      };
      reader.onerror = () => {
        setError('Erreur lors du chargement de l\'image');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    const url = urlInputRef.current?.value;
    if (url) {
      setImageUrl(url);
      updateContent(block.id, url);
      setShowUrlInput(false);
      setError('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    }
    
    if (e.key === 'Backspace' && !imageUrl) {
      e.preventDefault();
      onDelete();
    }
  };

  const handleCaptionKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    }
  };

  const removeImage = () => {
    setImageUrl('');
    updateContent(block.id, '');
    setError('');
    setCaption('');
  };

  const handleImageError = () => {
    setError('Impossible de charger l\'image');
  };

  const handleUrlInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUrlSubmit();
    }
    if (e.key === 'Escape') {
      setShowUrlInput(false);
    }
  };

  return (
    <div 
      className="group relative my-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {!imageUrl ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-2">
              <Loader className="w-8 h-8 text-gray-400 animate-spin" />
              <p className="text-sm text-gray-500">Chargement de l'image...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center space-y-4">
                <Image className="w-12 h-12 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Cliquez pour télécharger ou glissez-déposez une image
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Télécharger
                    </button>
                    <span className="text-gray-400">ou</span>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(true)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
                    >
                      <Link className="w-4 h-4" />
                      URL
                    </button>
                  </div>
                </div>

                {/* Input pour URL */}
                {showUrlInput && (
                  <div className="w-full max-w-md">
                    <div className="flex gap-2">
                      <input
                        ref={urlInputRef}
                        type="url"
                        placeholder="https://exemple.com/image.jpg"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={handleUrlInputKeyDown}
                      />
                      <button
                        type="button"
                        onClick={handleUrlSubmit}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Ajouter
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(false)}
                        className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Message d'erreur */}
                {error && (
                  <div className="text-red-500 text-sm mt-2">
                    {error}
                  </div>
                )}
              </div>

              {/* Input file caché */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </>
          )}
        </div>
      ) : (
        <div className="relative">
          <img
            src={imageUrl}
            alt="Image uploadée"
            onError={handleImageError}
            className="max-w-full rounded-lg shadow-md"
          />
          
          {/* Bouton de suppression */}
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>

          {/* Caption (optionnel) */}
          <input
            type="text"
            placeholder="Ajouter une légende..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full mt-2 px-2 py-1 text-sm text-gray-600 border-b border-transparent hover:border-gray-300 focus:border-gray-400 focus:outline-none transition-colors"
            onKeyDown={handleCaptionKeyDown}
          />
        </div>
      )}

      {/* Poignée de déplacement */}
      <div className="absolute -left-6 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          type="button"
          className="p-1 hover:bg-gray-200 rounded text-gray-400"
          aria-label="Déplacer le bloc"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0zM17 10a2 2 0 11-4 0 2 2 0 014 0zM7 18a2 2 0 11-4 0 2 2 0 014 0zM17 18a2 2 0 11-4 0 2 2 0 014 0zM17 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ImageBlock;