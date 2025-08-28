import React, { useState, useEffect, useMemo } from 'react';
import PaperCard from './PaperCard';
import PaperListView from './PaperListView';
import PaperFilters from './PaperFilters';
import { paperService } from '../services/paperService';
import { useToast } from '../contexts/ToastContext';
import { notesStorage } from '../services/notesStorage';
import type { PaperData } from '../types/Paper';
import type { Block } from '../types/BlockTypes';
import type { FilterOptions, SortOptions, ViewMode } from './PaperFilters';

// CORRECTION : Extension de PaperData pour inclure les notes
interface PaperWithNotes extends PaperData {
  notes?: Block[];
  hasNotes?: boolean;
}

// CORRECTION : Props interface avec PaperWithNotes
interface MainContentProps {
  activeView?: string;
  onPaperClick?: (paper: PaperWithNotes) => void;
  onPapersFiltered?: (papers: PaperWithNotes[]) => void;
}

const MainContent: React.FC<MainContentProps> = ({ 
  activeView = 'home',
  onPaperClick,
  onPapersFiltered 
}) => {
  const [papers, setPapers] = useState<PaperWithNotes[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  
  const { success, error: showError, info } = useToast();

  // États pour les filtres et le tri
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    statusFilter: 'all',
    dateRange: { start: '', end: '' },
    conferenceFilter: '',
    categoryFilter: []
  });

  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'created_at',
    order: 'desc'
  });

  // Charger les papers depuis la base de données
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        info('Chargement des articles...', 'Chargement');
        
        // Charger les papers et les catégories en parallèle
        const [papersData, categoriesData] = await Promise.all([
          paperService.getAllPapers(),
          paperService.getAllCategories()
        ]);
        
        // Charger les notes pour chaque paper depuis le localStorage
        const papersWithNotes: PaperWithNotes[] = papersData.map(paper => {
          const notes = notesStorage.loadNotes(paper.id?.toString() || '');
          return {
            ...paper,
            notes: notes || undefined,
            hasNotes: notes ? notes.length > 0 : undefined
          };
        });
        
        setPapers(papersWithNotes);
        setCategories(categoriesData);
        success(`${papersData.length} article${papersData.length > 1 ? 's' : ''} chargé${papersData.length > 1 ? 's' : ''}`, 'Succès');
      } catch (error) {
        console.error('Erreur lors du chargement:', error);
        showError('Erreur lors du chargement des données', 'Erreur');
      } finally {
        setLoading(false);
      }
    };

    if (activeView === 'home') {
      loadData();
    }
  }, [activeView, success, showError, info]);

  // Fonctions de filtrage et tri
  const filteredAndSortedPapers = useMemo(() => {
    let filtered = [...papers];

    // Filtrage par terme de recherche
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(paper =>
        paper.title.toLowerCase().includes(searchLower) ||
        paper.authors.toLowerCase().includes(searchLower) ||
        paper.doi.toLowerCase().includes(searchLower) ||
        (paper.conference && paper.conference.toLowerCase().includes(searchLower))
      );
    }

    // Filtrage par statut
    if (filters.statusFilter !== 'all') {
      filtered = filtered.filter(paper => paper.reading_status === filters.statusFilter);
    }

    // Filtrage par conférence
    if (filters.conferenceFilter) {
      filtered = filtered.filter(paper => 
        paper.conference === filters.conferenceFilter ||
        paper.conference_abbreviation === filters.conferenceFilter
      );
    }

    // Filtrage par catégories
    if (filters.categoryFilter.length > 0) {
      filtered = filtered.filter(paper => 
        paper.categories && paper.categories.some(cat => 
          filters.categoryFilter.includes(cat.id)
        )
      );
    }

    // Filtrage par plage de dates
    if (filters.dateRange.start) {
      filtered = filtered.filter(paper => 
        paper.publication_date >= filters.dateRange.start
      );
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(paper => 
        paper.publication_date <= filters.dateRange.end
      );
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortOptions.field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'authors':
          aValue = a.authors.toLowerCase();
          bValue = b.authors.toLowerCase();
          break;
        case 'publication_date':
          aValue = new Date(a.publication_date || '1970-01-01');
          bValue = new Date(b.publication_date || '1970-01-01');
          break;
        case 'conference':
          aValue = (a.conference || '').toLowerCase();
          bValue = (b.conference || '').toLowerCase();
          break;
        case 'reading_status':
          const statusOrder: Record<string, number> = { 'non_lu': 0, 'en_cours': 1, 'lu': 2, 'favoris': 3 };  // ✅ Complet
          aValue = statusOrder[a.reading_status] ?? 0;
          bValue = statusOrder[b.reading_status];
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at || '1970-01-01');
          bValue = new Date(b.created_at || '1970-01-01');
          break;
      }

      if (aValue < bValue) return sortOptions.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOptions.order === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [papers, filters, sortOptions]);

  // Notifier le parent quand les papers filtrés changent
  useEffect(() => {
    if (onPapersFiltered) {
      onPapersFiltered(filteredAndSortedPapers);
    }
  }, [filteredAndSortedPapers, onPapersFiltered]);

  // Extraction des conférences uniques pour le filtre
  const uniqueConferences = useMemo(() => {
    const conferences = papers
      .map(paper => ({
        name: paper.conference,
        abbreviation: paper.conference_abbreviation
      }))
      .filter((conf) => conf.name || conf.abbreviation);

    // Supprimer les doublons
    const seen = new Set();
    return conferences.filter(conf => {
      const key = `${conf.name}-${conf.abbreviation}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [papers]);

  // Gestion du clic sur un paper
  const handlePaperClick = (paper: PaperWithNotes) => {
    if (onPaperClick) {
      onPaperClick(paper);
    }
  };

  const handleStatusChange = async (paperId: number, newStatus: PaperData['reading_status']) => {
    try {
      await paperService.updatePaper(paperId, { reading_status: newStatus });
      
      // Mettre à jour localement
      setPapers(papers.map(paper => 
        paper.id === paperId ? { ...paper, reading_status: newStatus } : paper
      ));
      
      success('Statut mis à jour', 'Succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      showError('Erreur lors de la mise à jour du statut', 'Erreur');
    }
  };

  const handleDelete = async (paperId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet article et ses notes ?')) {
      return;
    }

    try {
      await paperService.deletePaper(paperId);
      
      // Supprimer aussi les notes
      notesStorage.deleteNotes(paperId.toString());
      
      // Supprimer localement
      setPapers(papers.filter(paper => paper.id !== paperId));
      success('Article supprimé', 'Succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showError('Erreur lors de la suppression', 'Erreur');
    }
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSortOptions: SortOptions) => {
    setSortOptions(newSortOptions);
  };

  const handleSortFieldChange = (field: string) => {
    setSortOptions(prev => ({
      field: field as SortOptions['field'],
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode);
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Chargement des articles...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes Articles</h1>
          <p className="mt-2 text-gray-600">
            {papers.length} article{papers.length > 1 ? 's' : ''} au total
            {filteredAndSortedPapers.length !== papers.length && (
              <span>, {filteredAndSortedPapers.length} affiché{filteredAndSortedPapers.length > 1 ? 's' : ''}</span>
            )}
            {papers.filter(p => p.hasNotes).length > 0 && (
              <span className="ml-2 text-sm text-blue-600">
                • {papers.filter(p => p.hasNotes).length} avec des notes
              </span>
            )}
          </p>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-8">
          <PaperFilters
          filters={filters}
          sortOptions={sortOptions}
          viewMode={viewMode}
          categories={categories}
          conferences={uniqueConferences}
          totalCount={papers.length}
          filteredCount={filteredAndSortedPapers.length}   // ✅ correction
          onFiltersChange={setFilters}
          onSortChange={setSortOptions}
          onViewModeChange={setViewMode}
        />

          
        </div>

        {/* Contenu */}
        {filteredAndSortedPapers.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">
              {papers.length === 0 ? 'Aucun article trouvé' : 'Aucun résultat'}
            </h3>
            <p>
              {papers.length === 0 
                ? 'Commencez par ajouter votre premier article de recherche.'
                : 'Essayez de modifier vos critères de recherche.'
              }
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              /* Vue en cartes avec indicateur de notes */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedPapers.map((paper) => (
                  <div 
                    key={paper.id} 
                    className="relative"
                    title="Cliquez pour ouvrir les notes"
                  >
                    <PaperCard
                      paper={paper}
                      onClick={() => handlePaperClick(paper)}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                    {/* Indicateur de notes existantes */}
                    {paper.hasNotes && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1 shadow-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Vue en liste */
              <PaperListView
                papers={filteredAndSortedPapers}
                onPaperClick={handlePaperClick}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                sortField={sortOptions.field}
                sortOrder={sortOptions.order}
                onSort={handleSortFieldChange}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default MainContent;