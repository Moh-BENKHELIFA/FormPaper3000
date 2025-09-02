import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import TopMenu from './TopMenu';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import PaperNotes from './PaperNotes';
import Modal from './Modal';
import AddPaper from './AddPaper';
import { ToastProvider, useToast } from '../contexts/ToastContext';
import { paperService } from '../services/paperService';
import { notesStorage } from '../services/notesStorage';
import type { PaperData } from '../types/Paper';
import type { Block } from '../types/BlockTypes';

// Extension de l'interface PaperData pour inclure les notes
interface PaperWithNotes extends PaperData {
  notes?: Block[];
  hasNotes?: boolean;
}

// Types pour le système de routes
type Route = 'home' | 'paper';

interface AppState {
  currentRoute: Route;
  currentPaper: PaperWithNotes | null;
  papers: PaperWithNotes[];
  currentPaperIndex: number;
  filteredPapers: PaperWithNotes[];
}

// Composant principal avec gestion d'état
const HomePageContent: React.FC = () => {
  // État principal de l'application
  const [appState, setAppState] = useState<AppState>({
    currentRoute: 'home',
    currentPaper: null,
    papers: [],
    currentPaperIndex: -1,
    filteredPapers: []
  });

  const [activeItem, setActiveItem] = useState('home');
  const [isAddPaperModalOpen, setIsAddPaperModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentPapers, setRecentPapers] = useState<PaperWithNotes[]>([]);  // ✅ AJOUT: Historique des articles récents
  
  const { success, error: showError } = useToast();

  // ✅ AJOUT: Sauvegarder l'historique dans localStorage (déplacé avant son utilisation)
  const updateRecentPapers = useCallback((paper: PaperWithNotes) => {
    setRecentPapers(prev => {
      // Retirer le paper s'il existe déjà dans l'historique
      const filtered = prev.filter(p => p.id !== paper.id);
      // Ajouter le paper au début
      const newRecent = [paper, ...filtered].slice(0, 5);
      // Sauvegarder dans localStorage
      localStorage.setItem('recentPapersHistory', JSON.stringify(newRecent));
      return newRecent;
    });
  }, []);
  
  // ✅ CORRECTION: loadPapers stabilisée avec useCallback sans dépendances
  const loadPapers = useCallback(async () => {
    try {
      setLoading(true);
      const papersData = await paperService.getAllPapers();
      
      // Charger les notes pour chaque paper
      const papersWithNotes: PaperWithNotes[] = papersData.map(paper => {
        const notes = notesStorage.loadNotes(paper.id?.toString() || '');
        return {
          ...paper,
          notes: notes || undefined,
          hasNotes: notes ? notes.length > 0 : undefined
        };
      });
      
      setAppState(prev => ({
        ...prev,
        papers: papersWithNotes,
        filteredPapers: prev.filteredPapers.length === 0 ? papersWithNotes : prev.filteredPapers
      }));
      
    } catch (error) {
      console.error('Erreur lors du chargement des papers:', error);
      showError('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Pas de dépendances pour éviter les re-créations

  // ✅ CORRECTION: useEffect séparé pour le chargement initial
  useEffect(() => {
    loadPapers();
  }, []); // ✅ Charger une seule fois au montage

  // ✅ CORRECTION: useEffect séparé pour la gestion du popstate
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const { route, paperId } = event.state;
        if (route === 'home') {
          setAppState(prev => ({ ...prev, currentRoute: 'home', currentPaper: null }));
          setActiveItem('home');
        } else if (route === 'paper' && paperId) {
          const paper = appState.papers.find(p => p.id === paperId);
          if (paper) {
            const index = appState.filteredPapers.findIndex(p => p.id === paperId);
            setAppState(prev => ({
              ...prev,
              currentRoute: 'paper',
              currentPaper: paper,
              currentPaperIndex: index
            }));
            setActiveItem('paper-view');
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [appState.papers, appState.filteredPapers]); // ✅ Dépendances correctes pour le popstate uniquement

  // Navigation vers la page d'accueil
  const navigateToHome = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      currentRoute: 'home',
      currentPaper: null,
      currentPaperIndex: -1
    }));
    setActiveItem('home');
    window.history.pushState({ route: 'home' }, '', '/');
  }, []);

  // Navigation vers un paper
  const navigateToPaper = useCallback((paper: PaperWithNotes) => {
    const index = appState.filteredPapers.findIndex(p => p.id === paper.id);
    
    // Charger les notes si nécessaire
    const notes = notesStorage.loadNotes(paper.id?.toString() || '');
    const paperWithNotes = {
      ...paper,
      notes: notes || undefined,
      hasNotes: notes ? notes.length > 0 : undefined
    };
    
    // ✅ AJOUT: Mettre à jour l'historique des articles récents
    updateRecentPapers(paperWithNotes);
    
    setAppState(prev => ({
      ...prev,
      currentRoute: 'paper',
      currentPaper: paperWithNotes,
      currentPaperIndex: index
    }));
    setActiveItem('paper-view');
    
    window.history.pushState(
      { route: 'paper', paperId: paper.id },
      '',
      `/paper/${paper.id}`
    );
  }, [appState.filteredPapers, updateRecentPapers]);

  // Navigation vers le paper précédent
  const navigateToPrevious = useCallback(() => {
    if (appState.currentPaperIndex > 0) {
      const previousPaper = appState.filteredPapers[appState.currentPaperIndex - 1];
      navigateToPaper(previousPaper);
    }
  }, [appState.currentPaperIndex, appState.filteredPapers, navigateToPaper]);

  // Navigation vers le paper suivant
  const navigateToNext = useCallback(() => {
    if (appState.currentPaperIndex < appState.filteredPapers.length - 1) {
      const nextPaper = appState.filteredPapers[appState.currentPaperIndex + 1];
      navigateToPaper(nextPaper);
    }
  }, [appState.currentPaperIndex, appState.filteredPapers, navigateToPaper]);

  // Gestion de la mise à jour des papers filtrés
  const handlePapersFiltered = useCallback((filteredPapers: PaperWithNotes[]) => {
    setAppState(prev => ({
      ...prev,
      filteredPapers
    }));
  }, []);

  // Sauvegarde des notes
  const handleSaveNotes = useCallback((blocks: Block[]) => {
    if (appState.currentPaper?.id) {
      notesStorage.saveNotes(appState.currentPaper.id.toString(), blocks);
      
      // Mettre à jour l'état local
      setAppState(prev => ({
        ...prev,
        currentPaper: prev.currentPaper ? { 
          ...prev.currentPaper, 
          notes: blocks,
          hasNotes: blocks.length > 0
        } : null,
        papers: prev.papers.map(p => 
          p.id === prev.currentPaper?.id 
            ? { ...p, notes: blocks, hasNotes: blocks.length > 0 }
            : p
        )
      }));
      
      success('Notes sauvegardées', 'Succès');
    }
  }, [appState.currentPaper, success]);

  // ✅ AJOUT: Gérer le clic sur un article récent
  const handleRecentPaperClick = useCallback((paperId: number) => {
    const paper = appState.papers.find(p => p.id === paperId);
    if (paper) {
      navigateToPaper(paper);
    } else {
      // Si le paper n'est pas dans la liste actuelle, essayer de le charger
      showError('Article non trouvé dans la liste actuelle');
    }
  }, [appState.papers, navigateToPaper, showError]);

  // Gestion des actions de la sidebar
  const handleItemSelect = useCallback((item: string) => {
    if (item === 'home') {
      navigateToHome();
    }
    console.log('Navigation vers:', item);
  }, [navigateToHome]);

  const handleAddPaperClick = useCallback(() => {
    setIsAddPaperModalOpen(true);
  }, []);

  const handleAddPaperClose = useCallback(() => {
    setIsAddPaperModalOpen(false);
  }, []);

  // ✅ CORRECTION: handlePaperSaved avec loadPapers dans les dépendances
  const handlePaperSaved = useCallback(async (paperData: any) => {
    console.log('Article sauvegardé:', paperData);
    
    // Invalider le cache avant de recharger
    paperService.invalidateCache();
    await loadPapers();
    
    setIsAddPaperModalOpen(false);
    success('Article ajouté avec succès', 'Succès');
  }, [loadPapers, success]); // ✅ loadPapers ajouté aux dépendances

  // Rendu conditionnel du contenu principal
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      );
    }

    switch (appState.currentRoute) {
      case 'paper':
        if (!appState.currentPaper) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Article non trouvé</h2>
                <button
                  onClick={navigateToHome}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="flex-1 flex flex-col">
            {/* Barre de navigation pour PaperNotes - pas de margin car pas de sidebar */}
            <div className="bg-white border-b px-6 py-3 flex items-center justify-between mt-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={navigateToHome}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span>Accueil</span>
                </button>
                <div className="text-sm text-gray-500">
                  Article {appState.currentPaperIndex + 1} sur {appState.filteredPapers.length}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={navigateToPrevious}
                  disabled={appState.currentPaperIndex <= 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    appState.currentPaperIndex <= 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border'
                  }`}
                  title="Article précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Précédent</span>
                </button>
                
                <button
                  onClick={navigateToNext}
                  disabled={appState.currentPaperIndex >= appState.filteredPapers.length - 1}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    appState.currentPaperIndex >= appState.filteredPapers.length - 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border'
                  }`}
                  title="Article suivant"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Composant PaperNotes */}
            <div className="flex-1">
              <PaperNotes
                paper={appState.currentPaper}  // Passer l'objet complet
                initialBlocks={appState.currentPaper.notes}
                onClose={navigateToHome}
                onSave={handleSaveNotes}
              />
            </div>
          </div>
        );

      case 'home':
      default:
        return (
          <MainContent 
            papers={appState.papers}
            loading={loading}
            activeView={activeItem}
            onPaperClick={navigateToPaper}
            onPapersFiltered={handlePapersFiltered}
            onReload={loadPapers}
            hasSidebar={true}  // ✅ La sidebar est visible sur la page d'accueil
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Menu du haut - fixe */}
      <TopMenu onTitleClick={navigateToHome} />
      
      {/* Layout avec sidebar et contenu principal */}
      <div className="flex">
        {/* Sidebar - affichée uniquement sur la page d'accueil */}
        {appState.currentRoute === 'home' && (
          <Sidebar 
            activeItem={activeItem}
            onItemSelect={handleItemSelect}
            onAddPaperClick={handleAddPaperClick}
            recentPapers={recentPapers.map(p => ({  // ✅ Passer l'historique à la Sidebar
              id: p.id!,
              title: p.title,
              authors: p.authors,
              reading_status: p.reading_status as string  // ✅ CORRECTION: Cast en string
            }))}
            onRecentPaperClick={handleRecentPaperClick}  // ✅ Callback pour ouvrir un article récent
          />
        )}
        
        {/* Contenu principal - conditionnel */}
        {renderMainContent()}
      </div>
      
      {/* Modal pour ajouter un article */}
      <Modal 
        isOpen={isAddPaperModalOpen} 
        onClose={handleAddPaperClose}
        maxWidth="6xl"
      >
        <AddPaper 
          onClose={handleAddPaperClose}
          onSave={handlePaperSaved}
        />
      </Modal>
    </div>
  );
};

// Composant wrapper avec ToastProvider
const HomePage: React.FC = () => {
  return (
    <ToastProvider>
      <HomePageContent />
    </ToastProvider>
  );
};

export default HomePage;