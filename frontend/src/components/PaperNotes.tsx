// PaperNotes.tsx - Version avec raccourci Ctrl+S
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Calendar, Tag, ExternalLink, Plus, Check, Download, Save } from 'lucide-react';
import type { Block, BlockType, Position } from '../types/BlockTypes';
import { TextBlock } from './commands/TextBlock';
import { HeadingBlock } from './commands/HeadingBlock';
import { ListBlock } from './commands/ListBlock';
import { ImageBlock } from './commands/ImageBlock';

// Interface pour les props du papier
interface PaperInfo {
  title: string;
  date: string;
  tags?: string[];
  image?: string;
  pdfUrl?: string;
}

// Interface pour les props du composant
interface PaperNotesProps {
  paper: PaperInfo;
  initialBlocks?: Block[];
  onClose: () => void;
  onSave?: (blocks: Block[]) => void;
}

// Interface pour les commandes
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
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [showSaveNotification, setShowSaveNotification] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Commandes disponibles
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
        cmd.command.includes(searchQuery)
      )
    : commands;

  // Fonction pour obtenir le placeholder selon le type
  const getPlaceholderForType = (type: BlockType): string => {
    switch (type) {
      case 'h1': return 'Titre principal';
      case 'h2': return 'Sous-titre';
      case 'h3': return 'Titre de section';
      case 'bullet': return 'Élément de liste';
      case 'list': return 'Élément numéroté';
      case 'image': return "Entrez l'URL de l'image";
      default: return "Commencez à écrire ou tapez '/' pour les commandes...";
    }
  };

  // Gérer la commande slash
  const handleSlashCommand = useCallback((blockId: string, position: Position): void => {
    setActiveBlockId(blockId);
    setSlashMenuPosition(position);
    setShowSlashMenu(true);
    setSearchQuery('');
  }, []);

  // Sélectionner une commande
  const selectCommand = useCallback((type: BlockType): void => {
    if (activeBlockId) {
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
    setShowSlashMenu(false);
    setSearchQuery('');
    setActiveBlockId(null);
  }, [activeBlockId]);

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

  // ✅ AJOUT: Sauvegarder manuellement avec feedback visuel amélioré
  const handleSave = useCallback(() => {
    if (onSave) {
      setIsSaving(true);
      setShowSaveNotification(true);
      onSave(blocks);
      setLastSaveTime(new Date());
      
      // Masquer l'indicateur de sauvegarde après 1 seconde
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
      
      // Masquer la notification après 3 secondes
      setTimeout(() => {
        setShowSaveNotification(false);
      }, 3000);
    }
  }, [blocks, onSave]);

  // ✅ AJOUT: Gestionnaire de raccourci clavier Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Vérifier si Ctrl+S (Windows/Linux) ou Cmd+S (Mac) est pressé
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Empêcher le comportement par défaut du navigateur
        handleSave();
      }
      
      // Raccourci Escape pour fermer le menu slash
      if (e.key === 'Escape' && showSlashMenu) {
        setShowSlashMenu(false);
        setSearchQuery('');
      }
    };

    // Ajouter l'écouteur d'événements
    document.addEventListener('keydown', handleKeyDown);

    // Nettoyer l'écouteur lors du démontage
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave, showSlashMenu]);

  // Exporter les notes en JSON
  const handleExport = useCallback(() => {
    const exportData = {
      paper: {
        title: paper.title,
        date: paper.date,
        tags: paper.tags
      },
      blocks: blocks,
      metadata: {
        blockCount: blocks.length,
        wordCount: blocks.reduce((acc, block) => {
          if (block.type !== 'image' && block.content) {
            return acc + block.content.trim().split(/\s+/).length;
          }
          return acc;
        }, 0),
        exportDate: new Date().toISOString()
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${paper.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [blocks, paper]);

  // Auto-save avec debounce
  useEffect(() => {
    if (onSave) {
      const timer = setTimeout(() => {
        onSave(blocks);
        setLastSaveTime(new Date());
      }, 2000); // Auto-save après 2 secondes d'inactivité
      
      return () => clearTimeout(timer);
    }
  }, [blocks, onSave]);

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSlashMenu(false);
        setSearchQuery('');
      }
    };

    if (showSlashMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSlashMenu]);

  // Rendre le bon composant selon le type de bloc
  const renderBlock = (block: Block): React.ReactElement => {
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

  // Formater l'heure de la dernière sauvegarde
  const formatLastSaveTime = () => {
    if (!lastSaveTime) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaveTime.getTime()) / 1000);
    
    if (diff < 60) return 'Sauvegardé à l\'instant';
    if (diff < 3600) return `Sauvegardé il y a ${Math.floor(diff / 60)} min`;
    return `Sauvegardé à ${lastSaveTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="h-full bg-white overflow-hidden flex flex-col">
      {/* Header avec les informations du papier - plus compact */}
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
          
          {/* Boutons d'action */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            {/* ✅ MODIFICATION: Bouton Sauvegarder avec indicateur et raccourci */}
            <button
              type="button"
              onClick={handleSave}
              className={`px-3 py-2 rounded-lg shadow-lg transition-all flex items-center gap-2 ${
                isSaving 
                  ? 'bg-green-600 text-white animate-pulse' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              title="Sauvegarder (Ctrl+S / Cmd+S)"
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </span>
              <kbd className="hidden sm:inline-block text-xs bg-green-600 px-1 rounded">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+S
              </kbd>
            </button>
            
            {/* Bouton Exporter */}
            <button
              type="button"
              onClick={handleExport}
              className="p-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
              title="Exporter les notes"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-3 left-6 right-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1 line-clamp-2">{paper.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {paper.date}
              </span>
              {paper.tags && paper.tags.length > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {paper.tags.slice(0, 2).join(', ')}
                  {paper.tags.length > 2 && ` +${paper.tags.length - 2}`}
                </span>
              )}
              {paper.pdfUrl && (
                <a
                  href={paper.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  PDF
                  <ExternalLink className="w-2 h-2" />
                </a>
              )}
              {/* ✅ AJOUT: Indicateur de dernière sauvegarde */}
              {lastSaveTime && (
                <span className="text-xs text-gray-500 ml-auto">
                  {formatLastSaveTime()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zone d'édition des notes */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="space-y-2">
            {blocks.map((block) => (
              <div key={block.id} className="relative">
                {renderBlock(block)}
              </div>
            ))}
          </div>

          {/* Bouton pour ajouter un nouveau bloc */}
          <button
            type="button"
            onClick={() => addNewBlock(blocks[blocks.length - 1].id)}
            className="mt-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un bloc
          </button>
        </div>
      </div>

      {/* Menu Slash */}
      {showSlashMenu && (
        <div
          ref={menuRef}
          className="absolute bg-white shadow-xl rounded-lg border border-gray-200 py-2 z-50 w-64"
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

      {/* ✅ AJOUT: Notification de sauvegarde réussie */}
      {showSaveNotification && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in-up">
          <Check className="w-5 h-5" />
          <div>
            <p className="font-medium">Notes sauvegardées</p>
            <p className="text-xs opacity-90">{formatLastSaveTime()}</p>
          </div>
        </div>
      )}

      {/* ✅ AJOUT: Aide pour les raccourcis clavier */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-200">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+S
          </kbd>
          <span>pour sauvegarder</span>
        </div>
      </div>
    </div>
  );
};

export default PaperNotes;