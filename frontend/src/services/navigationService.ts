// services/navigationService.ts
import React from 'react';

export type RouteType = 'home' | 'paper';

export interface NavigationRoute {
  type: RouteType;
  paperId?: number;
  params?: Record<string, any>;
}

export interface NavigationState {
  currentRoute: NavigationRoute;
  history: NavigationRoute[];
  currentIndex: number;
}

class NavigationService {
  private listeners: ((state: NavigationState) => void)[] = [];
  private state: NavigationState = {
    currentRoute: { type: 'home' },
    history: [{ type: 'home' }],
    currentIndex: 0
  };

  constructor() {
    // Écouter les changements d'historique du navigateur
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    // Initialiser depuis l'URL actuelle
    this.initializeFromURL();
  }

  // Initialiser l'état depuis l'URL courante
  private initializeFromURL(): void {
    const path = window.location.pathname;
    const route = this.parseURLToRoute(path);
    
    this.state = {
      currentRoute: route,
      history: [route],
      currentIndex: 0
    };
  }

  // Parser une URL en route
  private parseURLToRoute(path: string): NavigationRoute {
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      return { type: 'home' };
    }
    
    if (segments[0] === 'paper' && segments[1]) {
      const paperId = parseInt(segments[1], 10);
      if (!isNaN(paperId)) {
        return { type: 'paper', paperId };
      }
    }
    
    return { type: 'home' };
  }

  // Convertir une route en URL
  private routeToURL(route: NavigationRoute): string {
    switch (route.type) {
      case 'paper':
        return route.paperId ? `/paper/${route.paperId}` : '/';
      case 'home':
      default:
        return '/';
    }
  }

  // Gérer les événements popstate
  private handlePopState(event: PopStateEvent): void {
    if (event.state && event.state.route) {
      const route = event.state.route as NavigationRoute;
      this.state.currentRoute = route;
      this.notifyListeners();
    } else {
      // Fallback: parser l'URL
      const route = this.parseURLToRoute(window.location.pathname);
      this.state.currentRoute = route;
      this.notifyListeners();
    }
  }

  // Ajouter un listener
  public subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.push(listener);
    
    // Retourner une fonction de désabonnement
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notifier tous les listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Naviguer vers une nouvelle route
  public navigateTo(route: NavigationRoute, replace: boolean = false): void {
    const url = this.routeToURL(route);
    const state = { route };
    
    if (replace) {
      window.history.replaceState(state, '', url);
    } else {
      window.history.pushState(state, '', url);
      
      // Ajouter à l'historique interne
      this.state.history = this.state.history.slice(0, this.state.currentIndex + 1);
      this.state.history.push(route);
      this.state.currentIndex = this.state.history.length - 1;
    }
    
    this.state.currentRoute = route;
    this.notifyListeners();
  }

  // Naviguer en arrière
  public goBack(): boolean {
    if (this.canGoBack()) {
      window.history.back();
      return true;
    }
    return false;
  }

  // Naviguer en avant
  public goForward(): boolean {
    if (this.canGoForward()) {
      window.history.forward();
      return true;
    }
    return false;
  }

  // Vérifier si on peut aller en arrière
  public canGoBack(): boolean {
    return this.state.currentIndex > 0;
  }

  // Vérifier si on peut aller en avant
  public canGoForward(): boolean {
    return this.state.currentIndex < this.state.history.length - 1;
  }

  // Obtenir l'état actuel
  public getState(): NavigationState {
    return { ...this.state };
  }

  // Obtenir la route actuelle
  public getCurrentRoute(): NavigationRoute {
    return { ...this.state.currentRoute };
  }

  // Nettoyer l'historique
  public clearHistory(): void {
    const currentRoute = { type: 'home' as RouteType };
    this.state = {
      currentRoute,
      history: [currentRoute],
      currentIndex: 0
    };
    
    this.navigateTo(currentRoute, true);
  }

  // Remplacer la route actuelle
  public replaceRoute(route: NavigationRoute): void {
    this.navigateTo(route, true);
  }
}

// Instance singleton
export const navigationService = new NavigationService();

// Hook React pour utiliser le service de navigation
export const useNavigation = () => {
  const [state, setState] = React.useState<NavigationState>(navigationService.getState());
  
  React.useEffect(() => {
    return navigationService.subscribe(setState);
  }, []);
  
  return {
    currentRoute: state.currentRoute,
    canGoBack: navigationService.canGoBack(),
    canGoForward: navigationService.canGoForward(),
    navigateTo: navigationService.navigateTo.bind(navigationService),
    goBack: navigationService.goBack.bind(navigationService),
    goForward: navigationService.goForward.bind(navigationService),
    replaceRoute: navigationService.replaceRoute.bind(navigationService),
    clearHistory: navigationService.clearHistory.bind(navigationService)
  };
};

// Utilitaires pour construire des routes
export const createRoute = {
  home: (): NavigationRoute => ({ type: 'home' }),
  paper: (paperId: number, params?: Record<string, any>): NavigationRoute => ({
    type: 'paper',
    paperId,
    params
  })
};

export default navigationService;