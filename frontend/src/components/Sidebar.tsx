import React, { useState, useEffect } from 'react';
import { paperService } from '../services/paperService';

interface SidebarProps {
  activeItem?: string;
  onItemSelect?: (item: string) => void;
  onAddPaperClick?: () => void;
  recentPapers?: Array<{  // ✅ AJOUT: Liste des articles récents
    id: number;
    title: string;
    authors: string;
    reading_status: string;  // ✅ CORRECTION: Utiliser string au lieu du type strict
  }>;
  onRecentPaperClick?: (paperId: number) => void;  // ✅ AJOUT: Callback pour ouvrir un article récent
}

interface Stats {
  totalPapers: number;
  readPapers: number;
  inProgressPapers: number;
  unreadPapers: number;
  totalCategories: number;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeItem = 'home', 
  onItemSelect, 
  onAddPaperClick,
  recentPapers = [],
  onRecentPaperClick
}) => {
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

  // ✅ AJOUT: Fonction pour obtenir l'icône du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'lu': return '✅';
      case 'en_cours': return '📖';
      default: return '📄';
    }
  };

  // ✅ AJOUT: Fonction pour tronquer le texte
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderStatsSection = () => {
    if (connectionError && stats.totalPapers === 0) {
      return (
        <div className="text-center py-4">
          <div className="text-red-500 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">Connexion impossible</p>
          <button
            onClick={handleRetryStats}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            disabled={loadingStats}
          >
            {loadingStats ? 'Connexion...' : 'Réessayer'}
          </button>
          <div className="text-xs text-gray-500 mt-2">
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
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center mt-3 w-full justify-center"
        >
          <span className={`mr-1 ${loadingStats ? 'animate-spin' : ''}`}>
            🔄
          </span>
          {loadingStats ? 'Mise à jour...' : 'Actualiser'}
        </button>
      </div>
    );
  };

  // ✅ CORRECTION: Ajout de z-20 pour que la sidebar soit au-dessus du contenu
  return (
    <aside className="bg-gray-100 w-64 h-full fixed left-0 top-16 bottom-0 overflow-y-auto shadow-lg z-20">
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
      
      {/* ✅ AJOUT: Section historique récent */}
      {recentPapers.length > 0 && (
        <div className="border-t border-gray-200 mt-6 p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center justify-between">
            <span>Récemment consultés</span>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {recentPapers.length}
            </span>
          </h3>
          
          <div className="space-y-2">
            {recentPapers.map((paper) => (
              <div
                key={paper.id}
                onClick={() => onRecentPaperClick?.(paper.id)}
                className="group cursor-pointer p-2 rounded-lg hover:bg-gray-200 transition-colors"
                title={`${paper.title}\nAuteurs: ${paper.authors}`}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-sm mt-0.5" title={`Statut: ${paper.reading_status}`}>
                    {getStatusIcon(paper.reading_status)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                      {truncateText(paper.title, 35)}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {truncateText(paper.authors, 30)}
                    </p>
                  </div>
                  <svg 
                    className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
          
          {recentPapers.length === 5 && (
            <p className="text-xs text-gray-400 text-center mt-2">
              Affichage des 5 derniers
            </p>
          )}
        </div>
      )}
      
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