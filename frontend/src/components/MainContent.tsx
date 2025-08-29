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

// Extension de PaperData pour inclure les notes
interface PaperWithNotes extends PaperData {
  notes?: Block[];
  hasNotes?: boolean;
}

// ✅ CORRECTION: Props interface mise à jour pour recevoir les papers
interface MainContentProps {
  papers: PaperWithNotes[];        // ✅ Papers reçus depuis HomePage
  loading: boolean;                 // ✅ État de chargement depuis HomePage
  activeView?: string;
  onPaperClick?: (paper: PaperWithNotes) => void;
  onPapersFiltered?: (papers: PaperWithNotes[]) => void;
  onReload?: () => void;           // ✅ Fonction pour recharger les papers
  hasSidebar?: boolean;            // ✅ AJOUT: Indique si la sidebar est visible
}

const MainContent: React.FC<MainContentProps> = ({ 
  papers: initialPapers,          // ✅ Papers reçus en props
  loading: isLoading,              // ✅ Loading reçu en props
  activeView = 'home',
  onPaperClick,
  onPapersFiltered,
  onReload,
  hasSidebar = true               // ✅ Par défaut, la sidebar est visible
}) => {
  // ✅ CORRECTION: Utiliser les papers reçus en props
  const [papers, setPapers] = useState<PaperWithNotes[]>(initialPapers);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
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

  // ✅ CORRECTION: Mettre à jour les papers quand ils changent dans les props
  useEffect(() => {
    setPapers(initialPapers);
  }, [initialPapers]);

  // ✅ CORRECTION: Charger uniquement les catégories (pas les papers)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await paperService.getAllCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
        showError('Erreur lors du chargement des catégories', 'Erreur');
      }
    };
    
    loadCategories();
  }, []); // ✅ Charger une seule fois

  // Filtrage et tri des papers
  const filteredAndSortedPapers = useMemo(() => {
    let filtered = [...papers];

    // Appliquer les filtres
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(paper => 
        paper.title?.toLowerCase().includes(searchLower) ||
        paper.authors?.toLowerCase().includes(searchLower) ||
        paper.conference?.toLowerCase().includes(searchLower) ||
        paper.doi?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.statusFilter !== 'all') {
      filtered = filtered.filter(paper => paper.reading_status === filters.statusFilter);
    }

    if (filters.dateRange.start) {
      filtered = filtered.filter(paper => 
        new Date(paper.publication_date) >= new Date(filters.dateRange.start)
      );
    }

    if (filters.dateRange.end) {
      filtered = filtered.filter(paper => 
        new Date(paper.publication_date) <= new Date(filters.dateRange.end)
      );
    }

    if (filters.conferenceFilter) {
      filtered = filtered.filter(paper => 
        paper.conference === filters.conferenceFilter ||
        paper.conference_abbreviation === filters.conferenceFilter
      );
    }

    if (filters.categoryFilter.length > 0) {
      filtered = filtered.filter(paper => {
        if (!paper.categories) return false;
        return paper.categories.some(cat => 
          filters.categoryFilter.includes(cat.id)
        );
      });
    }

    // Appliquer le tri
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
      
      // ✅ Invalider le cache pour forcer la mise à jour
      paperService.invalidateCache();
      
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
      
      // Supprimer les notes du localStorage
      notesStorage.deleteNotes(paperId.toString());
      
      // Mettre à jour localement
      setPapers(papers.filter(paper => paper.id !== paperId));
      
      // ✅ Invalider le cache et recharger si possible
      paperService.invalidateCache();
      if (onReload) {
        onReload();
      }
      
      success('Article supprimé', 'Succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showError('Erreur lors de la suppression de l\'article', 'Erreur');
    }
  };

  // Fonction pour rafraîchir les données
  const handleRefresh = () => {
    if (onReload) {
      info('Actualisation des articles...', 'Actualisation');
      onReload();
    }
  };

  // ✅ Utiliser isLoading reçu en props au lieu de loading local
  if (isLoading) {
    // ✅ Ajuster la marge selon la présence de la sidebar
    const marginStyle = hasSidebar ? { marginLeft: '16rem', padding: '2rem' } : { padding: '2rem' };
    
    return (
      <div className="flex-1 mt-16" style={marginStyle}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des articles...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Ajuster la marge selon la présence de la sidebar
  const marginStyle = hasSidebar 
    ? { marginLeft: '16rem', paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '2rem', paddingBottom: '2rem' }
    : { paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '2rem', paddingBottom: '2rem' };

  return (
    <div className="flex-1 mt-16" style={marginStyle}>
      <div className="w-full">
        {/* En-tête avec titre et bouton de rafraîchissement */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {activeView === 'home' ? 'Tous les articles' : 'Articles'}
          </h1>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            title="Actualiser la liste"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Actualiser</span>
          </button>
        </div>
        
        {/* Filtres */}
        <PaperFilters
          filters={filters}
          onFiltersChange={setFilters}
          sortOptions={sortOptions}
          onSortChange={setSortOptions}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          categories={categories}
          conferences={uniqueConferences}
          totalCount={papers.length}
          filteredCount={filteredAndSortedPapers.length}
        />
        
        {/* Liste des papers */}
        {filteredAndSortedPapers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {papers.length === 0 ? 'Aucun article' : 'Aucun résultat'}
            </h2>
            <p className="text-gray-600">
              {papers.length === 0 
                ? 'Commencez par ajouter votre premier article scientifique'
                : 'Essayez de modifier vos critères de recherche'}
            </p>
          </div>
        ) : (
          viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedPapers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  onClick={() => handlePaperClick(paper)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <PaperListView
              papers={filteredAndSortedPapers}
              onPaperClick={handlePaperClick}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          )
        )}
      </div>
    </div>
  );
};

export default MainContent;