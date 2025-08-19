import React from 'react';

const TopMenu: React.FC = () => {
  return (
    <header className="bg-blue-600 text-white h-16 flex items-center justify-between px-6 shadow-md fixed top-0 left-0 right-0 z-10">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold">Card Paper Browser</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Barre de recherche */}
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher des papiers..."
            className="bg-blue-700 text-white placeholder-blue-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 w-64"
          />
          <svg
            className="absolute right-3 top-2.5 h-5 w-5 text-blue-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        
        {/* Menu utilisateur */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopMenu;