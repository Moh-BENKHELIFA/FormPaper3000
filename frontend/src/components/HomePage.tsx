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

// CORRECTION : Étendre l'interface PaperData
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
  
  const { success, error: showError } = useToast();

  // Charger les papers au démarrage
  useEffect(() => {
    loadPapers();
    
    // Gérer les événements de navigation du navigateur
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
  }, [appState.papers, appState.filteredPapers]);

  // Charger tous les papers
  const loadPapers = async () => {
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
        filteredPapers: papersWithNotes
      }));
      
    } catch (error) {
      console.error('Erreur lors du chargement des papers:', error);
      showError('Erreur lors du chargement des articles', 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Navigation vers un paper
  const navigateToPaper = useCallback((paper: PaperWithNotes) => {
    const paperIndex = appState.filteredPapers.findIndex(p => p.id === paper.id);
    
    // Charger les notes du paper
    const notes = notesStorage.loadNotes(paper.id?.toString() || '');
    const paperWithNotes: PaperWithNotes = { 
      ...paper, 
      notes: notes || undefined,
      hasNotes: notes ? notes.length > 0 : undefined
    };
    
    // Mettre à jour l'état
    setAppState(prev => ({
      ...prev,
      currentRoute: 'paper',
      currentPaper: paperWithNotes,
      currentPaperIndex: paperIndex
    }));
    
    setActiveItem('paper-view');
    
    // Mettre à jour l'URL et l'historique
    const url = `/paper/${paper.id}`;
    const state = { route: 'paper', paperId: paper.id };
    window.history.pushState(state, '', url);
  }, [appState.filteredPapers]);

  // Navigation vers l'accueil
  const navigateToHome = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      currentRoute: 'home',
      currentPaper: null,
      currentPaperIndex: -1
    }));
    
    setActiveItem('home');
    
    // Mettre à jour l'URL
    const state = { route: 'home' };
    window.history.pushState(state, '', '/');
  }, []);

  // Navigation vers le paper suivant
  const navigateToNext = useCallback(() => {
    const nextIndex = appState.currentPaperIndex + 1;
    if (nextIndex < appState.filteredPapers.length) {
      const nextPaper = appState.filteredPapers[nextIndex];
      navigateToPaper(nextPaper);
    }
  }, [appState.currentPaperIndex, appState.filteredPapers, navigateToPaper]);

  // Navigation vers le paper précédent
  const navigateToPrevious = useCallback(() => {
    const prevIndex = appState.currentPaperIndex - 1;
    if (prevIndex >= 0) {
      const prevPaper = appState.filteredPapers[prevIndex];
      navigateToPaper(prevPaper);
    }
  }, [appState.currentPaperIndex, appState.filteredPapers, navigateToPaper]);

  // Gérer les changements de filtres dans MainContent
  const handlePapersFiltered = useCallback((filteredPapers: PaperWithNotes[]) => {
    setAppState(prev => ({ ...prev, filteredPapers }));
  }, []);

  // Sauvegarder les notes d'un paper
  const handleSaveNotes = useCallback((blocks: Block[]) => {
    if (appState.currentPaper) {
      notesStorage.saveNotes(appState.currentPaper.id?.toString() || '', blocks);
      
      // Mettre à jour l'état local
      setAppState(prev => ({
        ...prev,
        currentPaper: prev.currentPaper ? { 
          ...prev.currentPaper, 
          notes: blocks,
          hasNotes: blocks.length > 0
        } : null
      }));
      
      success('Notes sauvegardées', 'Succès');
    }
  }, [appState.currentPaper, success]);

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

  const handlePaperSaved = useCallback(async (paperData: any) => {
    console.log('Article sauvegardé:', paperData);
    await loadPapers();
    setIsAddPaperModalOpen(false);
    success('Article ajouté avec succès', 'Succès');
  }, [success]);

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
            {/* Barre de navigation pour PaperNotes */}
            <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
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
              <div className="flex items-center space-x-2">  // ✅ Container ajouté
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
                paper={{
                  title: appState.currentPaper.title,
                  date: appState.currentPaper.publication_date,
                  tags: appState.currentPaper.categories?.map(cat => cat.name),
                  image: appState.currentPaper.image || undefined,
                  pdfUrl: appState.currentPaper.url || undefined
                }}
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
            activeView={activeItem}
            onPaperClick={navigateToPaper}
            onPapersFiltered={handlePapersFiltered}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Menu du haut - fixe */}
      <TopMenu />
      
      {/* Layout avec sidebar et contenu principal */}
      <div className="flex">
        {/* Sidebar - fixe */}
        <Sidebar 
          activeItem={activeItem}
          onItemSelect={handleItemSelect}
          onAddPaperClick={handleAddPaperClick}
        />
        
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