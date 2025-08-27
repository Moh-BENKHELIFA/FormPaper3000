// MainContent.tsx - Version intégrée avec PaperNotes
import React, { useState, useEffect, useMemo } from 'react';
import PaperCard from './PaperCard';
import PaperListView from './PaperListView';
import PaperFilters from './PaperFilters';
import PaperNotes from './PaperNotes'; // Import du composant PaperNotes
import { paperService } from '../services/paperService';
import { useToast } from '../contexts/ToastContext';
import { notesStorage } from '../services/notesStorage'; // Import du service de stockage
import type { PaperData } from '../types/Paper'; // Correction de l'import
import type { FilterOptions, SortOptions, ViewMode } from './PaperFilters';
import type { Block } from '../types/BlockTypes';

// Extension de PaperData pour inclure les notes
interface PaperWithNotes extends PaperData {
  notes?: Block[];
}

interface MainContentProps {
  activeView?: string;
}

const MainContent: React.FC<MainContentProps> = ({ activeView = 'home' }) => {
  const [papers, setPapers] = useState<PaperWithNotes[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  
  // États pour PaperNotes
  const [selectedPaper, setSelectedPaper] = useState<PaperWithNotes | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  
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
        const papersWithNotes = papersData.map(paper => {
          const notes = notesStorage.loadNotes(paper.id?.toString() || '');
          return {
            ...paper,
            notes: notes || undefined
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
  }, [activeView]);

  // Fonction pour ouvrir les notes d'un paper (double-clic)
  const handleOpenPaperNotes = (paper: PaperWithNotes) => {
    console.log('Ouverture des notes pour:', paper.title);
    
    // Charger les notes existantes si elles existent
    const existingNotes = notesStorage.loadNotes(paper.id?.toString() || '');
    
    setSelectedPaper({
      ...paper,
      notes: existingNotes || paper.notes
    });
    setShowNotes(true);
  };

  // Fonction pour sauvegarder les notes
  const handleSaveNotes = (blocks: Block[]) => {
    if (selectedPaper && selectedPaper.id) {
      // Sauvegarder dans le localStorage
      const saved = notesStorage.saveNotes(selectedPaper.id.toString(), blocks);
      
      if (saved) {
        // Mettre à jour l'état local
        setPapers(prevPapers =>
          prevPapers.map(paper =>
            paper.id === selectedPaper.id
              ? { ...paper, notes: blocks }
              : paper
          )
        );
        
        // Afficher un message de succès (optionnel)
        console.log('Notes sauvegardées pour:', selectedPaper.title);
      } else {
        showError('Erreur lors de la sauvegarde des notes', 'Erreur');
      }
    }
  };

  // Fonction pour fermer les notes
  const handleCloseNotes = () => {
    setShowNotes(false);
    setSelectedPaper(null);
  };

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
      filtered = filtered.filter(paper => {
        if (!paper.categories) return false;
        return paper.categories.some(cat => 
          filters.categoryFilter.includes(cat.id)
        );
      });
    }

    // Filtrage par date
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

    // Tri
    filtered.sort((a, b) => {
      let aVal: any = a[sortOptions.field as keyof PaperWithNotes];
      let bVal: any = b[sortOptions.field as keyof PaperWithNotes];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (sortOptions.order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [papers, filters, sortOptions]);

  // Récupérer les conférences uniques pour les filtres
  const uniqueConferences = useMemo(() => {
    const conferences = new Set<string>();
    papers.forEach(paper => {
      if (paper.conference) conferences.add(paper.conference);
      if (paper.conference_abbreviation) conferences.add(paper.conference_abbreviation);
    });
    return Array.from(conferences).sort();
  }, [papers]);

  // Gestion du changement de statut
  const handleStatusChange = async (paperId: number, newStatus: PaperData['reading_status']) => {
    try {
      await paperService.updatePaper(paperId, { reading_status: newStatus });
      setPapers(prevPapers =>
        prevPapers.map(paper =>
          paper.id === paperId ? { ...paper, reading_status: newStatus } : paper
        )
      );
      success(`Statut mis à jour`, 'Succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      showError('Erreur lors de la mise à jour du statut', 'Erreur');
    }
  };

  // Gestion de la suppression
  const handleDelete = async (paperId: number) => {
    try {
      await paperService.deletePaper(paperId);
      
      // Supprimer aussi les notes associées
      notesStorage.deleteNotes(paperId.toString());
      
      setPapers(prevPapers => prevPapers.filter(p => p.id !== paperId));
      success('Article supprimé avec succès', 'Succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showError('Erreur lors de la suppression', 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 ml-64 mt-16 p-6 bg-gray-50 min-h-screen">
      <div className="flex-1 p-6">
        {/* Filtres */}
        <PaperFilters
          filters={filters}
          onFiltersChange={setFilters}
          sortOptions={sortOptions}
          onSortChange={setSortOptions}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          conferences={uniqueConferences}
          categories={categories}
          totalCount={papers.length}
          filteredCount={filteredAndSortedPapers.length}
        />

        {/* Affichage des papers */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
            {filteredAndSortedPapers.map((paper) => (
              <div
                key={paper.id}
                onDoubleClick={() => handleOpenPaperNotes(paper)}
                className="cursor-pointer"
                title="Double-cliquez pour ouvrir les notes"
              >
                <PaperCard
                  paper={paper}
                  onClick={() => console.log('Single click:', paper.title)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
                {/* Indicateur de notes existantes */}
                {paper.notes && paper.notes.length > 0 && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100-4h2a1 1 0 100-2 2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-1a1 1 0 100-2h1a4 4 0 014 4v11a4 4 0 01-4 4H6a4 4 0 01-4-4V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <PaperListView
            papers={filteredAndSortedPapers}
            onPaperClick={handleOpenPaperNotes}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            sortField={sortOptions.field}
            sortOrder={sortOptions.order}
            onSort={(field) => setSortOptions({ ...sortOptions, field: field as SortOptions['field'] })}
          />
        )}

        {filteredAndSortedPapers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun article trouvé avec ces critères de recherche.</p>
          </div>
        )}
      </div>

      {/* Modal PaperNotes */}
      {showNotes && selectedPaper && (
        <PaperNotes
          paper={{
            title: selectedPaper.title,
            date: selectedPaper.publication_date,
            tags: selectedPaper.categories?.map(cat => cat.name),
            image: selectedPaper.image || undefined,
            pdfUrl: selectedPaper.url || undefined
          }}
          initialBlocks={selectedPaper.notes}
          onClose={handleCloseNotes}
          onSave={handleSaveNotes}
        />
      )}
      
    </main>
  );
};

export default MainContent;