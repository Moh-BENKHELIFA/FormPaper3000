// frontend/src/components/PaperNotes.tsx - Mis à jour pour le système de fichiers
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Calendar, Tag, ExternalLink, Plus, Check, Download, Upload, Save } from 'lucide-react';
import type { Block, BlockType, Position } from '../types/BlockTypes';
import type { PaperData } from '../types/Paper';
import { TextBlock } from './commands/TextBlock';
import { HeadingBlock } from './commands/HeadingBlock';
import { ListBlock } from './commands/ListBlock';
import { ImageBlock } from './commands/ImageBlock';
import { notesFileStorage } from '../services/notesStorageFile';
import { useToast } from '../contexts/ToastContext';

interface PaperNotesProps {
  paper: PaperData;
  initialBlocks?: Block[];
  onClose: () => void;
  onSave?: (blocks: Block[]) => void;
}

interface Command {
  name: string;
  command: string;
  icon: string;
  type: BlockType;
  description: string;
}

const PaperNotes: React.FC<PaperNotesProps> = ({ 
  paper, 
  initialBlocks, 
  onClose, 
  onSave 
}) => {
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks && initialBlocks.length > 0 
      ? initialBlocks
      : [{ 
          id: '1', 
          type: 'text', 
          content: '', 
          placeholder: "Commencez à écrire ou tapez '/' pour les commandes..." 
        }]
  );
  
  const [showSlashMenu, setShowSlashMenu] = useState<boolean>(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState<Position>({ top: 0, left: 0 });
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { success, error: showError, info } = useToast();

  // Commandes disponibles avec upload d'image
  const commands: Command[] = [
    { name: 'Texte', command: '/text', icon: '¶', type: 'text', description: 'Texte simple' },
    { name: 'Paragraphe', command: '/paragraph', icon: '¶', type: 'text', description: 'Bloc de paragraphe' },
    { name: 'Titre 1', command: '/h1', icon: 'H1', type: 'h1', description: 'Grand titre' },
    { name: 'Titre 2', command: '/h2', icon: 'H2', type: 'h2', description: 'Titre moyen' },
    { name: 'Titre 3', command: '/h3', icon: 'H3', type: 'h3', description: 'Petit titre' },
    { name: 'Liste à puces', command: '/bullet', icon: '•', type: 'bullet', description: 'Liste non ordonnée' },
    { name: 'Liste', command: '/list', icon: '1.', type: 'list', description: 'Liste ordonnée' },
    { name: 'Image', command: '/image', icon: '🖼', type: 'image', description: 'Insérer une image' }
  ];

  // Filtrer les commandes selon la recherche
  const filteredCommands = searchQuery 
    ? commands.filter(cmd => 
        cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.command.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : commands;

  // Auto-sauvegarde toutes les 30 secondes
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const interval = setInterval(() => {
      handleAutoSave();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [blocks, autoSaveEnabled]);

  // Charger les notes au montage du composant
  useEffect(() => {
    loadNotes();
  }, [paper.id]);

  const loadNotes = async () => {
    try {
      const loadedBlocks = await notesFileStorage.loadNotes(paper);
      if (loadedBlocks && loadedBlocks.length > 0) {
        setBlocks(loadedBlocks);
        console.log(`Notes chargées: ${loadedBlocks.length} blocs`);
      }
    } catch (error) {
      console.error('Erreur chargement notes:', error);
      showError('Erreur lors du chargement des notes', 'Chargement');
    }
  };

  const handleAutoSave = async () => {
    if (blocks.length === 0 || (blocks.length === 1 && !blocks[0].content)) {
      return; // Ne pas sauvegarder si pas de contenu
    }

    try {
      await notesFileStorage.saveNotes(paper, blocks);
      console.log('Auto-sauvegarde réussie');
    } catch (error) {
      console.error('Erreur auto-sauvegarde:', error);
    }
  };

  const handleManualSave = async () => {
    try {
      setIsSaving(true);
      info('Sauvegarde des notes...', 'Sauvegarde');
      
      await notesFileStorage.saveNotes(paper, blocks);
      
      success('Notes sauvegardées avec succès !', 'Sauvegarde', 3000);
      
      // Callback vers le parent si fourni
      if (onSave) {
        onSave(blocks);
      }
    } catch (error) {
      console.error('Erreur sauvegarde manuelle:', error);
      showError('Erreur lors de la sauvegarde des notes', 'Erreur');
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  // Obtenir le placeholder selon le type de bloc
  const getPlaceholderForType = (type: BlockType): string => {
    switch (type) {
      case 'h1': return 'Titre principal...';
      case 'h2': return 'Sous-titre...';
      case 'h3': return 'Titre de section...';
      case 'bullet': return 'Élément de liste...';
      case 'list': return '1. Premier élément...';
      case 'image': return 'Cliquez pour importer une image...';
      default: return 'Tapez \'/\' pour les commandes...';
    }
  };

  // Gérer les commandes slash
  const handleSlashCommand = useCallback((blockId: string, position: Position): void => {
    setActiveBlockId(blockId);
    setSlashMenuPosition(position);
    setShowSlashMenu(true);
    setSearchQuery('');
  }, []);

  // Sélectionner une commande
  const selectCommand = useCallback((type: BlockType): void => {
    if (activeBlockId) {
      if (type === 'image') {
        // Pour les images, déclencher l'upload
        triggerImageUpload(activeBlockId);
      } else {
        // Pour les autres types
        setBlocks(prevBlocks => 
          prevBlocks.map(block => 
            block.id === activeBlockId 
              ? { 
                  ...block, 
                  type, 
                  content: block.content.replace(/\/$/, ''), 
                  placeholder: getPlaceholderForType(type) 
                }
              : block
          )
        );
      }
    }
    setShowSlashMenu(false);
    setSearchQuery('');
    setActiveBlockId(null);
  }, [activeBlockId]);

  // Déclencher l'upload d'image
  const triggerImageUpload = (blockId: string) => {
    if (imageInputRef.current) {
      imageInputRef.current.dataset.blockId = blockId;
      imageInputRef.current.click();
    }
  };

  // Gérer l'upload d'image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const blockId = e.target.dataset.blockId;
    
    if (!file || !blockId) return;

    try {
      info('Upload de l\'image...', 'Upload');
      
      // Sauvegarder l'image dans le dossier du paper
      const relativePath = await notesFileStorage.saveImportedImage(paper, file);
      
      // Créer l'URL complète pour affichage
      const imageUrl = notesFileStorage.getImageUrl(paper, relativePath);
      
      // Mettre à jour le bloc avec l'URL de l'image
      setBlocks(prevBlocks =>
        prevBlocks.map(block =>
          block.id === blockId
            ? {
                ...block,
                type: 'image',
                content: imageUrl,
                placeholder: ''
              }
            : block
        )
      );

      success('Image importée et sauvegardée !', 'Upload', 3000);
      
    } catch (error) {
      console.error('Erreur upload image:', error);
      showError('Erreur lors de l\'import de l\'image', 'Upload');
    }
    
    // Réinitialiser l'input
    e.target.value = '';
  };

  // Mettre à jour le contenu d'un bloc
  const updateBlockContent = useCallback((blockId: string, content: string): void => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === blockId ? { ...block, content } : block
      )
    );
  }, []);

  // Ajouter un nouveau bloc
  const addNewBlock = useCallback((afterBlockId: string, type: BlockType = 'text'): string => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: '',
      placeholder: getPlaceholderForType(type)
    };

    setBlocks(prevBlocks => {
      const index = prevBlocks.findIndex(b => b.id === afterBlockId);
      const updatedBlocks = [...prevBlocks];
      updatedBlocks.splice(index + 1, 0, newBlock);
      return updatedBlocks;
    });

    return newBlock.id;
  }, []);

  // Supprimer un bloc
  const deleteBlock = useCallback((blockId: string): void => {
    setBlocks(prevBlocks => {
      if (prevBlocks.length === 1) {
        return [{
          id: Date.now().toString(),
          type: 'text',
          content: '',
          placeholder: "Commencez à écrire ou tapez '/'"
        }];
      }
      return prevBlocks.filter(b => b.id !== blockId);
    });
  }, []);

  // Exporter les notes
  const handleExport = useCallback(async () => {
    try {
      const exportData = await notesFileStorage.exportAllNotes();
      
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `papernotes-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      success('Export terminé !', 'Export');
    } catch (error) {
      console.error('Erreur export:', error);
      showError('Erreur lors de l\'export', 'Export');
    }
  }, []);

  // Render d'un bloc selon son type
  const renderBlock = (block: Block) => {
    const commonProps = {
      block,
      updateContent: updateBlockContent,
      onSlashCommand: handleSlashCommand,
      onEnter: () => addNewBlock(block.id),
      onDelete: () => deleteBlock(block.id)
    };

    switch (block.type) {
      case 'h1':
      case 'h2':
      case 'h3':
        return <HeadingBlock {...commonProps} level={block.type} />;
      case 'bullet':
      case 'list':
        return <ListBlock {...commonProps} isOrdered={block.type === 'list'} />;
      case 'image':
        return <ImageBlock {...commonProps} />;
      default:
        return <TextBlock {...commonProps} />;
    }
  };

  return (
    <div className="h-full bg-white overflow-hidden flex flex-col">
      {/* Header avec les informations du papier */}
      <div className="border-b bg-gradient-to-b from-gray-50 to-white">
        <div className="relative h-32 overflow-hidden">
          {paper.image && (
            <img 
              src={paper.image} 
              alt={paper.title}
              className="w-full h-full object-cover opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
          
          {/* Informations du paper */}
          <div className="absolute bottom-4 left-6 right-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {paper.title}
            </h1>
            <div className="flex items-center text-sm text-gray-600 space-x-4">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {paper.publication_date || 'Date non spécifiée'}
              </div>
              {paper.authors && (
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  {paper.authors.length > 50 ? `${paper.authors.substring(0, 50)}...` : paper.authors}
                </div>
              )}
              {paper.url && (
                <a 
                  href={paper.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center hover:text-blue-600"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Lien original
                </a>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            {/* Toggle auto-sauvegarde */}
            <button
              type="button"
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`p-2 rounded-full shadow-lg transition-all text-sm ${
                autoSaveEnabled 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}
              title={autoSaveEnabled ? 'Auto-sauvegarde activée' : 'Auto-sauvegarde désactivée'}
            >
              AUTO
            </button>

            {/* Bouton Sauvegarder manuel */}
            <button
              type="button"
              onClick={handleManualSave}
              className={`p-2 rounded-full shadow-lg transition-all ${
                isSaving 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              title="Sauvegarder maintenant"
            >
              {isSaving ? (
                <div className="w-5 h-5 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
            </button>

            {/* Bouton Export */}
            <button
              type="button"
              onClick={handleExport}
              className="p-2 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-all"
              title="Exporter toutes les notes"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all"
              title="Fermer"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* Zone d'édition des notes */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-2">
          {blocks.map((block) => (
            <div key={block.id}>
              {renderBlock(block)}
            </div>
          ))}
        </div>
      </div>

      {/* Input caché pour upload d'images */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Menu des commandes slash */}
      {showSlashMenu && (
        <div 
          ref={menuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-80"
          style={{
            top: `${slashMenuPosition.top}px`,
            left: `${slashMenuPosition.left}px`
          }}
        >
          <div className="px-3 py-2 border-b">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une commande..."
              className="w-full text-sm outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredCommands.map((cmd) => (
              <button
                key={cmd.command}
                type="button"
                onClick={() => selectCommand(cmd.type)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"
              >
                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-sm font-mono">
                  {cmd.icon}
                </span>
                <div>
                  <div className="text-sm font-medium">{cmd.name}</div>
                  <div className="text-xs text-gray-500">{cmd.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Indicateur de statut */}
      <div className="border-t bg-gray-50 px-6 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>{blocks.length} bloc{blocks.length > 1 ? 's' : ''}</span>
            <span>
              {blocks.reduce((acc, block) => {
                if (block.content) {
                  return acc + block.content.trim().split(/\s+/).length;
                }
                return acc;
              }, 0)} mots
            </span>
            <span className={`flex items-center ${autoSaveEnabled ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full mr-1 ${autoSaveEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              Auto-sauvegarde {autoSaveEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          
          <div className="text-gray-400">
            Sauvegardé dans: MyPaperList/{paper.id}_{paper.title?.substring(0, 20)}...
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperNotes;