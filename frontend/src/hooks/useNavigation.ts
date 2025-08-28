// hooks/useNavigation.ts
import { useState, useCallback } from 'react';

interface Route {
  type: 'home' | 'paper' | 'category' | 'search';
  paperId?: number;
  categoryId?: number;
  searchTerm?: string;
  data?: any;
}

interface NavigationState {
  currentRoute: Route;
  history: Route[];
  historyIndex: number;
}

interface UseNavigationOptions {
  initialRoute?: Route;
  maxHistorySize?: number;
}

interface UseNavigationReturn {
  currentRoute: Route;
  navigateTo: (route: Route) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  historyLength: number;
  clearHistory: () => void;
  replaceCurrentRoute: (route: Route) => void;
}

export const useNavigation = (options: UseNavigationOptions = {}): UseNavigationReturn => {
  const {
    initialRoute = { type: 'home' },
    maxHistorySize = 50
  } = options;

  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentRoute: initialRoute,
    history: [initialRoute],
    historyIndex: 0
  });

  // Naviguer vers une nouvelle route
  const navigateTo = useCallback((route: Route) => {
    setNavigationState(prev => {
      // Supprimer l'historique après l'index actuel (pour gérer les nouvelles branches)
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(route);
      
      // Limiter la taille de l'historique
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }
      
      return {
        currentRoute: route,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  }, [maxHistorySize]);

  // Aller en arrière dans l'historique
  const goBack = useCallback(() => {
    setNavigationState(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        const route = prev.history[newIndex];
        
        return {
          ...prev,
          currentRoute: route,
          historyIndex: newIndex
        };
      }
      return prev;
    });
  }, []);

  // Aller en avant dans l'historique
  const goForward = useCallback(() => {
    setNavigationState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        const route = prev.history[newIndex];
        
        return {
          ...prev,
          currentRoute: route,
          historyIndex: newIndex
        };
      }
      return prev;
    });
  }, []);

  // Remplacer la route actuelle sans ajouter à l'historique
  const replaceCurrentRoute = useCallback((route: Route) => {
    setNavigationState(prev => {
      const newHistory = [...prev.history];
      newHistory[prev.historyIndex] = route;
      
      return {
        currentRoute: route,
        history: newHistory,
        historyIndex: prev.historyIndex
      };
    });
  }, []);

  // Vider l'historique et revenir à l'accueil
  const clearHistory = useCallback(() => {
    const homeRoute = { type: 'home' as const };
    setNavigationState({
      currentRoute: homeRoute,
      history: [homeRoute],
      historyIndex: 0
    });
  }, []);

  return {
    currentRoute: navigationState.currentRoute,
    navigateTo,
    goBack,
    goForward,
    canGoBack: navigationState.historyIndex > 0,
    canGoForward: navigationState.historyIndex < navigationState.history.length - 1,
    historyLength: navigationState.history.length,
    clearHistory,
    replaceCurrentRoute
  };
};

// Hook pour la navigation entre papers
export const usePaperNavigation = (papers: any[], currentPaperId?: number) => {
  const currentIndex = papers.findIndex(paper => paper.id === currentPaperId);
  
  const canGoToPrevious = currentIndex > 0;
  const canGoToNext = currentIndex < papers.length - 1;
  
  const getPreviousPaper = () => {
    if (canGoToPrevious) {
      return papers[currentIndex - 1];
    }
    return null;
  };
  
  const getNextPaper = () => {
    if (canGoToNext) {
      return papers[currentIndex + 1];
    }
    return null;
  };
  
  return {
    currentIndex: currentIndex >= 0 ? currentIndex : 0,
    totalCount: papers.length,
    canGoToPrevious,
    canGoToNext,
    getPreviousPaper,
    getNextPaper
  };
};