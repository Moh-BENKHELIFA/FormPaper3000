import React from 'react';
import type { PaperData } from '../types/Paper';

interface PaperListViewProps {
  papers: PaperData[];
  onPaperClick?: (paper: PaperData) => void;
  onStatusChange?: (paperId: number, newStatus: PaperData['reading_status']) => void;
  onDelete?: (paperId: number) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

const PaperListView: React.FC<PaperListViewProps> = ({
  papers,
  onPaperClick,
  onStatusChange,
  onDelete,
  sortField,
  sortOrder,
  onSort
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

  const handleStatusClick = (e: React.MouseEvent, paperId: number | undefined, newStatus: PaperData['reading_status']) => {
    e.stopPropagation();
    if (onStatusChange && paperId) {
      onStatusChange(paperId, newStatus);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, paperId: number | undefined) => {
    e.stopPropagation();
    if (onDelete && paperId && window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      onDelete(paperId);
    }
  };

  const handleSort = (field: string) => {
    if (onSort) {
      onSort(field);
    }
  };

  const SortButton: React.FC<{ field: string; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
    >
      <span>{children}</span>
      {sortField === field && (
        <span className="text-blue-600">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  if (papers.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-semibold mb-2">Aucun papier trouvé</h3>
        <p>Commencez par ajouter votre premier article de recherche.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* En-tête du tableau */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-700">
          <div className="col-span-1">
            <SortButton field="image">Image</SortButton>
          </div>
          <div className="col-span-3">
            <SortButton field="title">Titre</SortButton>
          </div>
          <div className="col-span-2">
            <SortButton field="authors">Auteurs</SortButton>
          </div>
          <div className="col-span-2">
            <SortButton field="conference">Conférence</SortButton>
          </div>
          <div className="col-span-1">
            <SortButton field="publication_date">Date</SortButton>
          </div>
          <div className="col-span-1">
            <SortButton field="reading_status">Statut</SortButton>
          </div>
          <div className="col-span-2">
            <span>Actions</span>
          </div>
        </div>
      </div>

      {/* Corps du tableau */}
      <div className="divide-y divide-gray-200">
        {papers.map((paper) => {
          const statusConfig = getStatusConfig(paper.reading_status);
          
          return (
            <div
              key={paper.id}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onPaperClick?.(paper)}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Image */}
                <div className="col-span-1">
                  <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                    {paper.image ? (
                      <img
                        src={paper.image}
                        alt={paper.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${paper.image ? 'hidden' : 'flex'} items-center justify-center h-full text-gray-400`}>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Titre */}
                <div className="col-span-3">
                  <h3 className="font-medium text-gray-900 truncate pr-2" title={paper.title}>
                    {paper.title}
                  </h3>
                  <p className="text-sm text-blue-600 truncate mt-1">
                    <a 
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                      title={paper.doi}
                    >
                      {paper.doi}
                    </a>
                  </p>
                </div>

                {/* Auteurs */}
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 truncate" title={paper.authors}>
                    {paper.authors}
                  </p>
                </div>

                {/* Conférence */}
                <div className="col-span-2">
                  {(paper.conference_abbreviation || paper.conference) && (
                    <span 
                      className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded truncate max-w-full"
                      title={(paper.conference || paper.conference_abbreviation) ?? undefined}
                    >
                      {paper.conference_abbreviation || paper.conference}
                    </span>
                  )}
                </div>

                {/* Date */}
                <div className="col-span-1">
                  <span className="text-sm text-gray-600">
                    {formatDate(paper.publication_date)}
                  </span>
                </div>

                {/* Statut */}
                <div className="col-span-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                    <span className="mr-1">{statusConfig.icon}</span>
                    <span className="hidden sm:inline">{statusConfig.text}</span>
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    {/* Changement de statut */}
                    <div className="flex space-x-1">
                      {(['non_lu', 'en_cours', 'lu'] as const).map((status) => {
                        const config = getStatusConfig(status);
                        return (
                          <button
                            key={status}
                            onClick={(e) => handleStatusClick(e, paper.id, status)}
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
                      onClick={(e) => handleDeleteClick(e, paper.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Supprimer l'article"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaperListView;