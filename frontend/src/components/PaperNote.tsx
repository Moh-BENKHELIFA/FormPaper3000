// PaperNotes.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, FileText, Calendar, Tag, ExternalLink, Plus } from 'lucide-react';
import type { Block, BlockType, Position } from '../types/BlockTypes';
import { SlashCommands } from './commands/SlashCommands';
import { TextBlock } from './commands/TextBlock';
import { HeadingBlock } from './commands/HeadingBlock';
import { ListBlock } from './commands/ListBlock';
import { ImageBlock } from './commands/ImageBlock';

// Interface pour les props du papier
interface Paper {
  id?: string;
  title: string;
  date: string;
  tags?: string[];
  image?: string;
  pdfUrl?: string;
  content?: string;
}

// Interface pour les props du composant
interface PaperNotesProps {
  paper: Paper;
  onClose: () => void;
  onSave?: (content: Block[]) => void;
}

// Interface pour les commandes
interface Command {
  name: string;
  command: string;
  icon: string;
  type: BlockType;
  description: string;
}

const PaperNotes: React.FC<PaperNotesProps> = ({ paper, onClose, onSave }) => {
  const [blocks, setBlocks] = useState<Block[]>([
    { 
      id: '1', 
      type: 'text', 
      content: '', 
      placeholder: "Commencez à écrire ou tapez '/' pour les commandes..." 
    }
  ]);
  const [showSlashMenu, setShowSlashMenu] = useState<boolean>(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState<Position>({ top: 0, left: 0 });
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Commandes disponibles
  const commands: Command[] = [
    { name: 'Texte', command: '/text', icon: '¶', type: 'text', description: 'Texte simple' },
    { name: 'Paragraphe', command: '/paragraph', icon: '¶', type: 'text', description: 'Bloc de paragraphe' },
    { name: 'Titre 1', command: '/h1', icon: 'H1', type: 'h1', description: 'Grand titre' },
    { name: 'Titre 2', command: '/h2', icon: 'H2', type: 'h2', description: 'Titre moyen' },
    { name: 'Titre 3', command: '/h3', icon: 'H3', type: 'h3', description: 'Petit titre' },
    { name: 'Liste à puces', command: '/bullet', icon: '•', type: 'bullet', description: 'Liste non ordonnée' },
    { name: 'Liste', command: '/list', icon: '1.', type: 'list', description: 'Liste numérotée' },
    { name: 'Image', command: '/image', icon: '🖼', type: 'image', description: 'Ajouter une image' },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.command.includes(searchQuery.toLowerCase()) ||
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Gérer l'ouverture du menu slash
  const handleSlashCommand = useCallback((blockId: string, position: Position): void => {
    setActiveBlockId(blockId);
    setSlashMenuPosition(position);
    setShowSlashMenu(true);
    setSearchQuery('');
  }, []);

  // Sélectionner une commande
  const selectCommand = useCallback((commandType: BlockType): void => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type: commandType,
      content: commandType === 'image' ? '' : '',
      placeholder: getPlaceholderForType(commandType)
    };

    setBlocks(prevBlocks => {
      const index = prevBlocks.findIndex(b => b.id === activeBlockId);
      const updatedBlocks = [...prevBlocks];
      updatedBlocks[index] = newBlock;
      // Ajouter un nouveau bloc vide après
      updatedBlocks.splice(index + 1, 0, {
        id: (Date.now() + 1).toString(),
        type: 'text',
        content: '',
        placeholder: "Continuez à écrire ou tapez '/'"
      });
      return updatedBlocks;
    });

    setShowSlashMenu(false);
    setSearchQuery('');
  }, [activeBlockId]);

  // Obtenir le placeholder selon le type
  const getPlaceholderForType = (type: BlockType): string => {
    const placeholders: Record<string, string> = {
      text: 'Écrivez du texte...',
      paragraph: 'Écrivez un paragraphe...',
      h1: 'Titre 1',
      h2: 'Titre 2',
      h3: 'Titre 3',
      bullet: 'Élément de liste',
      list: 'Élément de liste',
      image: 'Cliquez pour ajouter une image'
    };
    return placeholders[type] || 'Écrivez...';
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

  // Sauvegarder les notes (optionnel)
  useEffect(() => {
    if (onSave) {
      const timer = setTimeout(() => {
        onSave(blocks);
      }, 1000); // Auto-save après 1 seconde d'inactivité
      
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

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden flex flex-col">
      {/* Header avec les informations du papier */}
      <div className="border-b bg-gradient-to-b from-gray-50 to-white">
        <div className="relative h-48 overflow-hidden">
          {paper.image && (
            <img 
              src={paper.image} 
              alt={paper.title}
              className="w-full h-full object-cover opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
          
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-8 right-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{paper.title}</h1>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {paper.date}
              </span>
              {paper.tags && paper.tags.length > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  {paper.tags.join(', ')}
                </span>
              )}
              {paper.pdfUrl && (
                <a
                  href={paper.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Ouvrir le PDF
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zone d'édition des notes */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
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
    </div>
  );
};

export default PaperNotes;