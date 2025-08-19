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

  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'add-paper', label: 'Ajouter un Article', icon: '📄', isSpecial: true },
    { id: 'settings', label: 'Paramètres', icon: '⚙️' }
  ];

  useEffect(() => {
    loadStats();
    // Recharger les stats toutes les 30 secondes
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await paperService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleItemClick = (itemId: string) => {
    if (itemId === 'add-paper') {
      onAddPaperClick?.();
    } else {
      onItemSelect?.(itemId);
    }
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
        
        {loadingStats ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {/* Total d'articles */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total articles:</span>
              <span className="font-medium text-gray-900 bg-blue-100 px-2 py-1 rounded-full">
                {stats.totalPapers}
              </span>
            </div>
            
            {/* Articles non lus */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">📄</span>
                Non lus:
              </span>
              <span className="font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                {stats.unreadPapers}
              </span>
            </div>
            
            {/* Articles en cours */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">📖</span>
                En cours:
              </span>
              <span className="font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                {stats.inProgressPapers}
              </span>
            </div>
            
            {/* Articles lus */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">✅</span>
                Lus:
              </span>
              <span className="font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                {stats.readPapers}
              </span>
            </div>
            
            {/* Catégories */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <span className="mr-1">🏷️</span>
                Catégories:
              </span>
              <span className="font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                {stats.totalCategories}
              </span>
            </div>
            
            {/* Barre de progression de lecture */}
            {stats.totalPapers > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progression de lecture</span>
                  <span>{Math.round((stats.readPapers / stats.totalPapers) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(stats.readPapers / stats.totalPapers) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{stats.readPapers} lus</span>
                  <span>{stats.totalPapers - stats.readPapers} restants</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Bouton de rafraîchissement */}
        <button
          onClick={loadStats}
          disabled={loadingStats}
          className="mt-4 w-full px-3 py-2 text-xs bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          title="Actualiser les statistiques"
        >
          {loadingStats ? '🔄 Actualisation...' : '🔄 Actualiser'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;