import React, { useState, useEffect } from 'react';
import { paperService } from '../services/paperService';

interface SidebarProps {
  activeItem?: string;
  onItemSelect?: (item: string) => void;
  onAddPaperClick?: () => void;
}

interface Stats {
  totalPapers: number;
  readPapers: number;
  inProgressPapers: number;
  unreadPapers: number;
  totalCategories: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem = 'home', onItemSelect, onAddPaperClick }) => {
  const [stats, setStats] = useState<Stats>({
    totalPapers: 0,
    readPapers: 0,
    inProgressPapers: 0,
    unreadPapers: 0,
    totalCategories: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'add-paper', label: 'Ajouter un Article', icon: '📄', isSpecial: true },
    { id: 'settings', label: 'Paramètres', icon: '⚙️' }
  ];

  useEffect(() => {
    loadStats();
    // Recharger les stats toutes les 30 secondes
    const interval = setInterval(() => {
      if (!loadingStats) {
        loadStats();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      setConnectionError(false);
      
      // Test de connexion d'abord
      console.log('🔄 Test de connexion au serveur...');
      const isConnected = await paperService.testConnection();
      
      if (!isConnected) {
        console.warn('⚠️ Serveur non accessible');
        setConnectionError(true);
        return;
      }

      console.log('✅ Connexion OK, récupération des stats...');
      const statsData = await paperService.getStats();
      
      console.log('📊 Statistiques reçues:', statsData);
      setStats(statsData);
      setRetryCount(0);
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des statistiques:', error);
      setConnectionError(true);
      setRetryCount(prev => prev + 1);
      
      // Garder les anciennes stats en cas d'erreur
      console.log('⚠️ Conservation des statistiques existantes');
      
    } finally {
      setLoadingStats(false);
    }
  };

  const handleRetryStats = () => {
    console.log('🔄 Nouvelle tentative de récupération des stats...');
    loadStats();
  };

  const handleItemClick = (itemId: string) => {
    if (itemId === 'add-paper') {
      onAddPaperClick?.();
    } else {
      onItemSelect?.(itemId);
    }
  };

  const renderStatsSection = () => {
    if (loadingStats && stats.totalPapers === 0) {
      return (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          <div className="h-3 bg-gray-300 rounded w-2/3"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        </div>
      );
    }

    if (connectionError && stats.totalPapers === 0) {
      return (
        <div className="space-y-3">
          <div className="text-red-600 text-sm flex items-center">
            <span className="mr-2">⚠️</span>
            <span>Connexion impossible</span>
          </div>
          <button
            onClick={handleRetryStats}
            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
            disabled={loadingStats}
          >
            {loadingStats ? 'Connexion...' : 'Réessayer'}
          </button>
          <div className="text-xs text-gray-500">
            Tentatives: {retryCount}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {connectionError && (
          <div className="text-orange-600 text-xs flex items-center mb-2">
            <span className="mr-1">⚠️</span>
            <span>Données en cache</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total Papers</span>
          <span className="font-bold text-blue-600">{stats.totalPapers}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Lus</span>
          <span className="font-medium text-green-600">{stats.readPapers}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">En cours</span>
          <span className="font-medium text-yellow-600">{stats.inProgressPapers}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Non lus</span>
          <span className="font-medium text-gray-600">{stats.unreadPapers}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Catégories</span>
          <span className="font-medium text-purple-600">{stats.totalCategories}</span>
        </div>

        {/* Barre de progression */}
        {stats.totalPapers > 0 && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-1">Progression de lecture</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.round((stats.readPapers / stats.totalPapers) * 100)}%` 
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round((stats.readPapers / stats.totalPapers) * 100)}% complété
            </div>
          </div>
        )}

        {/* Bouton de rafraîchissement */}
        <button
          onClick={handleRetryStats}
          disabled={loadingStats}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center mt-3"
        >
          <span className={`mr-1 ${loadingStats ? 'animate-spin' : ''}`}>
            🔄
          </span>
          {loadingStats ? 'Mise à jour...' : 'Actualiser'}
        </button>
      </div>
    );
  };

  return (
    <aside className="bg-gray-100 w-64 h-full fixed left-0 top-16 bottom-0 overflow-y-auto shadow-lg">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleItemClick(item.id)}
                className={`
                  w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3
                  ${item.isSpecial 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : activeItem === item.id 
                      ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                      : 'text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Section statistiques */}
      <div className="border-t border-gray-200 mt-6 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Statistiques
        </h3>
        
        {renderStatsSection()}
      </div>

      {/* Section statut de connexion */}
      <div className="border-t border-gray-200 mt-6 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Statut
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionError ? 'bg-red-500' : loadingStats ? 'bg-yellow-500' : 'bg-green-500'
            }`}></div>
            <span className="text-xs text-gray-600">
              {connectionError ? 'Hors ligne' : loadingStats ? 'Synchronisation...' : 'En ligne'}
            </span>
          </div>
          
          <div className="text-xs text-gray-400">
            Dernière MAJ: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;