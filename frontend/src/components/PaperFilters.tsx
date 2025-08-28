import React, { useState } from 'react';
import type { PaperData } from '../types/Paper';

export interface FilterOptions {
  searchTerm: string;
  statusFilter: PaperData['reading_status'] | 'all';
  dateRange: {
    start: string;
    end: string;
  };
  conferenceFilter: string;
  categoryFilter: number[];
}

export interface SortOptions {
  field: 'title' | 'authors' | 'publication_date' | 'conference' | 'created_at' | 'reading_status';
  order: 'asc' | 'desc';
}

export type ViewMode = 'cards' | 'list';

interface PaperFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  sortOptions: SortOptions;
  onSortChange: (sort: SortOptions) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  conferences: { name: string | null | undefined; abbreviation: string | null | undefined }[];
  categories: { id: number; name: string }[];
  totalCount: number;
  filteredCount: number;
}

const PaperFilters: React.FC<PaperFiltersProps> = ({
  filters,
  onFiltersChange,
  sortOptions,
  onSortChange,
  viewMode,
  onViewModeChange,
  conferences,
  categories,
  totalCount,
  filteredCount
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleSearchChange = (searchTerm: string) => {
    onFiltersChange({ ...filters, searchTerm });
  };

  const handleStatusFilterChange = (statusFilter: FilterOptions['statusFilter']) => {
    onFiltersChange({ ...filters, statusFilter });
  };

  const handleConferenceFilterChange = (conferenceFilter: string) => {
    onFiltersChange({ ...filters, conferenceFilter });
  };

  const handleCategoryFilterChange = (categoryId: number) => {
    const newCategoryFilter = filters.categoryFilter.includes(categoryId)
      ? filters.categoryFilter.filter(id => id !== categoryId)
      : [...filters.categoryFilter, categoryId];
    onFiltersChange({ ...filters, categoryFilter: newCategoryFilter });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: { ...filters.dateRange, [field]: value }
    });
  };

  const handleSortFieldChange = (field: SortOptions['field']) => {
    onSortChange({ ...sortOptions, field });
  };

  const toggleSortOrder = () => {
    onSortChange({
      ...sortOptions,
      order: sortOptions.order === 'asc' ? 'desc' : 'asc'
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      statusFilter: 'all',
      dateRange: { start: '', end: '' },
      conferenceFilter: '',
      categoryFilter: []
    });
  };

  const hasActiveFilters = filters.searchTerm || 
                          filters.statusFilter !== 'all' || 
                          filters.dateRange.start || 
                          filters.dateRange.end || 
                          filters.conferenceFilter ||
                          filters.categoryFilter.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {/* Ligne principale */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        {/* Recherche */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher dans les articles..."
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
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
        </div>

        {/* Contrôles de tri et vue */}
        <div className="flex items-center space-x-4">
          {/* Sélecteur de tri */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Trier par:</span>
            <select
              value={sortOptions.field}
              onChange={(e) => handleSortFieldChange(e.target.value as SortOptions['field'])}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="created_at">Date d'ajout</option>
              <option value="publication_date">Date de publication</option>
              <option value="title">Titre</option>
              <option value="authors">Auteurs</option>
              <option value="conference">Conférence</option>
              <option value="reading_status">Statut</option>
            </select>
            
            <button
              onClick={toggleSortOrder}
              className="p-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              title={`Ordre ${sortOptions.order === 'asc' ? 'croissant' : 'décroissant'}`}
            >
              {sortOptions.order === 'asc' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
            </button>
          </div>

          {/* Sélecteur de vue */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('cards')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              title="Vue en cartes"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              title="Vue en liste"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Bouton filtres avancés */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3 py-2 border rounded-lg transition-colors ${
              showAdvancedFilters || hasActiveFilters
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm">Filtres</span>
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {[
                    filters.statusFilter !== 'all', 
                    !!filters.conferenceFilter, 
                    !!filters.dateRange.start, 
                    !!filters.dateRange.end,
                    filters.categoryFilter.length > 0
                  ].filter(Boolean).length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Filtres rapides */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">Statut:</span>
        {(['all', 'non_lu', 'en_cours', 'lu'] as const).map((status) => (
          <button
            key={status}
            onClick={() => handleStatusFilterChange(status)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filters.statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status === 'all' ? 'Tous' :
             status === 'non_lu' ? '📄 Non lu' :
             status === 'en_cours' ? '📖 En cours' :
             '✅ Lu'}
          </button>
        ))}
      </div>

      {/* Filtres avancés */}
      {showAdvancedFilters && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtre par conférence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conférence
              </label>
              <select
                value={filters.conferenceFilter}
                onChange={(e) => handleConferenceFilterChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toutes les conférences</option>
                {conferences.map((conference, idx) => (
                  <option
                    key={conference.abbreviation ?? conference.name ?? idx}
                    value={conference.abbreviation ?? conference.name ?? ''}
                  >
                    {conference.name ?? conference.abbreviation ?? 'Unknown'}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par date de début */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de publication (début)
              </label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtre par date de fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de publication (fin)
              </label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Bouton pour effacer les filtres */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Effacer tous les filtres
              </button>
            </div>
          )}
        </div>
      )}

      {/* Compteur de résultats */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-600">
          {filteredCount === totalCount ? (
            <span>{totalCount} article{totalCount > 1 ? 's' : ''} au total</span>
          ) : (
            <span>
              {filteredCount} article{filteredCount > 1 ? 's' : ''} trouvé{filteredCount > 1 ? 's' : ''} sur {totalCount}
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <div className="text-sm text-blue-600">
            Filtres actifs
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperFilters;