import React, { useState } from 'react';
import TopMenu from './TopMenu';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import Modal from './Modal';
import AddPaper from './AddPaper';
import { ToastProvider } from '../contexts/ToastContext';

const HomePage: React.FC = () => {
  const [activeItem, setActiveItem] = useState('home');
  const [isAddPaperModalOpen, setIsAddPaperModalOpen] = useState(false);

  const handleItemSelect = (item: string) => {
    setActiveItem(item);
    console.log('Navigation vers:', item);
  };

  const handleAddPaperClick = () => {
    setIsAddPaperModalOpen(true);
  };

  const handleAddPaperClose = () => {
    setIsAddPaperModalOpen(false);
  };

  const handlePaperSaved = (paperData: any) => {
    console.log('Article sauvegardé:', paperData);
    // Ici vous pourriez rafraîchir la liste des articles
    setIsAddPaperModalOpen(false);
  };

  return (
    <ToastProvider>
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
          
          {/* Contenu principal - scrollable */}
          <MainContent activeView={activeItem} />
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
    </ToastProvider>
  );
};

export default HomePage;