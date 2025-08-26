import React from 'react';
import type { PaperData } from '../types/Paper';

interface PaperCardProps {
  paper: PaperData;
  onClick?: (paper: PaperData) => void;
  onStatusChange?: (paperId: number, newStatus: PaperData['reading_status']) => void;
  onDelete?: (paperId: number) => void;
}

const PaperCard: React.FC<PaperCardProps> = ({ 
  paper, 
  onClick, 
  onStatusChange, 
  onDelete 
}) => {
  const getStatusConfig = (status: PaperData['reading_status']) => {
    switch (status) {
      case 'non_lu':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '📄',
          text: 'Non lu'
        };
      case 'en_cours':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '📖',
          text: 'En cours'
        };
      case 'lu':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
          text: 'Lu'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '📄',
          text: 'Inconnu'
        };
    }
  };

  const statusConfig = getStatusConfig(paper.reading_status);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date inconnue';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleStatusClick = (e: React.MouseEvent, newStatus: PaperData['reading_status']) => {
    e.stopPropagation();
    if (onStatusChange && paper.id) {
      onStatusChange(paper.id, newStatus);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && paper.id && window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      onDelete(paper.id);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(paper);
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer group"
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="h-48 bg-gray-200 overflow-hidden relative">
        {paper.image ? (
          <img
            src={paper.image}
            alt={paper.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`${paper.image ? 'hidden' : 'flex'} flex-col items-center justify-center h-full text-gray-400`}>
          <svg className="w-16 h-16 mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">Pas d'image</span>
        </div>
        
        {/* Badge de statut en overlay */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
            <span className="mr-1">{statusConfig.icon}</span>
            {statusConfig.text}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4">
        {/* Titre */}
        <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2 leading-tight">
          {paper.title}
        </h3>
        
        {/* Auteurs */}
        <p className="text-gray-600 text-sm mb-2 line-clamp-1">
          <span className="font-medium">Auteurs:</span> {paper.authors}
        </p>
        
        {/* DOI */}
        <div className="text-xs text-blue-600 mb-2 truncate">
          <span className="font-medium">DOI:</span> 
          <a 
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline hover:text-blue-800"
            onClick={(e) => e.stopPropagation()}
          >
            {paper.doi}
          </a>
        </div>
        
        {/* Conférence et Date */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          {(paper.conference_abbreviation || paper.conference) && (
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded truncate max-w-[60%]" title={(paper.conference || paper.conference_abbreviation) ?? undefined}
>
              {paper.conference_abbreviation || paper.conference}
            </span>
          )}
          <span className="text-right">
            {formatDate(paper.publication_date)}
          </span>
        </div>

        {/* Catégories */}
        {paper.categories && paper.categories.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {paper.categories.slice(0, 3).map((category) => (
                <span
                  key={category.id}
                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                  title={category.name}
                >
                  {category.name.length > 10 ? category.name.substring(0, 10) + '...' : category.name}
                </span>
              ))}
              {paper.categories.length > 3 && (
                <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  +{paper.categories.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Changement de statut */}
          <div className="flex space-x-1">
            {(['non_lu', 'en_cours', 'lu'] as const).map((status) => {
              const config = getStatusConfig(status);
              return (
                <button
                  key={status}
                  onClick={(e) => handleStatusClick(e, status)}
                  className={`
                    p-1 rounded text-xs transition-all duration-200
                    ${paper.reading_status === status 
                      ? config.color 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                  title={`Marquer comme ${config.text.toLowerCase()}`}
                >
                  {config.icon}
                </button>
              );
            })}
          </div>
          
          {/* Actions secondaires */}
          <div className="flex items-center space-x-2">
            {/* Lien vers l'article */}
            {paper.url && (
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="Ouvrir l'article"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            
            {/* Supprimer */}
            <button
              onClick={handleDeleteClick}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Supprimer l'article"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            
            {/* Menu plus d'options */}
            <button
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Plus d'options"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperCard;