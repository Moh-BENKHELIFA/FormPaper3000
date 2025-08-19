import React, { useState, useEffect, useMemo } from 'react';
import PaperCard from './PaperCard';
import PaperListView from './PaperListView';
import PaperFilters from './PaperFilters';
import { paperService } from '../services/paperService';
import { useToast } from '../contexts/ToastContext';
import type { PaperData } from '../services/paperService';
import type { FilterOptions, SortOptions, ViewMode } from './PaperFilters';

interface MainContentProps {
  activeView?: string;
}

const MainContent: React.FC<MainContentProps> = ({ activeView = 'home' }) => {
  const [papers, setPapers] = useState<PaperData[]>([]);
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
        
        setPapers(papersData);
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
  }, [activeView]);

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
          const statusOrder = { 'non_lu': 0, 'en_cours': 1, 'lu': 2 };
          aValue = statusOrder[a.reading_status];
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

  // Extraction des conférences uniques pour le filtre
  const uniqueConferences = useMemo(() => {
    const conferences = papers
      .map(paper => ({
        name: paper.conference,
        abbreviation: paper.conference_abbreviation
      }))
      .filter((conf) => !!conf.name)
      .reduce((acc, conf) => {
        const key = conf.abbreviation || conf.name;
        if (!acc.find(c => c === key)) {
          acc.push(key);
        }
        return acc;
      }, [] as string[])
      .sort();
    return conferences;
  }, [papers]);

  // Gestionnaires d'événements
  const handlePaperClick = (paper: PaperData) => {
    console.log('Clic sur paper:', paper);
    // Ici vous pourriez ouvrir un modal de détails ou naviguer vers une page de détails
  };

  const handleStatusChange = async (paperId: number, newStatus: PaperData['reading_status']) => {
    try {
      info(`Mise à jour du statut...`, 'Traitement');
      await paperService.updatePaper(paperId, { reading_status: newStatus });
      
      // Mettre à jour l'état local
      setPapers(prevPapers =>
        prevPapers.map(paper =>
          paper.id === paperId
            ? { ...paper, reading_status: newStatus }
            : paper
        )
      );
      
      const statusText = newStatus === 'non_lu' ? 'Non lu' : 
                        newStatus === 'en_cours' ? 'En cours' : 'Lu';
      success(`Statut mis à jour: ${statusText}`, 'Succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      showError('Erreur lors de la mise à jour du statut', 'Erreur');
    }
  };

  const handleDelete = async (paperId: number) => {
    try {
      info('Suppression en cours...', 'Traitement');
      await paperService.deletePaper(paperId);
      
      // Mettre à jour l'état local
      setPapers(prevPapers => prevPapers.filter(paper => paper.id !== paperId));
      success('Article supprimé avec succès', 'Succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showError('Erreur lors de la suppression', 'Erreur');
    }
  };

  const handleSortChange = (newSort: SortOptions) => {
    setSortOptions(newSort);
  };

  const handleSortFieldChange = (field: string) => {
    if (sortOptions.field === field) {
      // Si on clique sur le même champ, inverser l'ordre
      setSortOptions(prev => ({
        ...prev,
        order: prev.order === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      // Nouveau champ, ordre par défaut
      setSortOptions({
        field: field as SortOptions['field'],
        order: field === 'title' || field === 'authors' || field === 'conference' ? 'asc' : 'desc'
      });
    }
  };

  // Rendu pour les autres vues
  if (activeView !== 'home') {
    return (
      <main className="flex-1 ml-64 mt-16 p-6 bg-white">
        <div className="text-center text-gray-500 mt-20">
          <h2 className="text-2xl font-bold mb-4">Contenu pour: {activeView}</h2>
          <p>Cette section sera implémentée prochainement.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 ml-64 mt-16 p-6 bg-gray-50 min-h-screen">
      {/* En-tête de section */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-2xl">📚</span>
          <h2 className="text-2xl font-bold text-gray-800">
            Bibliothèque d'articles
          </h2>
        </div>
      </div>

      {/* Filtres et contrôles */}
      <PaperFilters
        filters={filters}
        onFiltersChange={setFilters}
        sortOptions={sortOptions}
        onSortChange={handleSortChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        conferences={uniqueConferences}
        categories={categories}
        totalCount={papers.length}
        filteredCount={filteredAndSortedPapers.length}
      />

      {/* Contenu principal */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Chargement des articles...</span>
        </div>
      ) : filteredAndSortedPapers.length === 0 ? (
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
            /* Vue en cartes */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedPapers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  onClick={handlePaperClick}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
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
    </main>
  );
};

export default MainContent;