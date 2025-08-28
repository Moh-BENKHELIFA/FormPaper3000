// types/navigation.ts
export interface Route {
  type: 'home' | 'paper' | 'category' | 'search';
  paperId?: number;
  categoryId?: number;
  searchTerm?: string;
  data?: any;
}

export interface NavigationState {
  currentRoute: Route;
  history: Route[];
  historyIndex: number;
}

export interface NavigationContextType {
  navigationState: NavigationState;
  navigateTo: (route: Route) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

// Hook personnalisé pour la navigation
export interface UseNavigationReturn {
  currentRoute: Route;
  navigateTo: (route: Route) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  historyLength: number;
}

// Types pour les props des composants
export interface NavigationAwareProps {
  onNavigate?: (route: Route) => void;
  currentRoute?: Route;
}

// Types pour le contexte de navigation global
export interface AppNavigationState {
  activeView: string;
  navigationHistory: Route[];
  currentRouteIndex: number;
  filteredPapers: any[];
  currentPaperIndex: number;
}