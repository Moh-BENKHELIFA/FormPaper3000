// commands/SlashCommands.tsx
import React, { useCallback, useState } from 'react';
import type { SlashCommand, BlockType, Position, SlashMenuProps } from '../../types/BlockTypes';

// Configuration centralisée de toutes les commandes slash disponibles
export const SlashCommands: Record<string, SlashCommand> = {
  text: {
    name: 'Texte',
    command: '/text',
    icon: '¶',
    type: 'text',
    description: 'Texte simple',
    category: 'basic'
  },
  paragraph: {
    name: 'Paragraphe',
    command: '/paragraph',
    icon: '¶',
    type: 'paragraph',
    description: 'Bloc de paragraphe',
    category: 'basic'
  },
  h1: {
    name: 'Titre 1',
    command: '/h1',
    icon: 'H1',
    type: 'h1',
    description: 'Grand titre',
    category: 'heading'
  },
  h2: {
    name: 'Titre 2',
    command: '/h2',
    icon: 'H2',
    type: 'h2',
    description: 'Titre moyen',
    category: 'heading'
  },
  h3: {
    name: 'Titre 3',
    command: '/h3',
    icon: 'H3',
    type: 'h3',
    description: 'Petit titre',
    category: 'heading'
  },
  bullet: {
    name: 'Liste à puces',
    command: '/bullet',
    icon: '•',
    type: 'bullet',
    description: 'Liste non ordonnée',
    category: 'list'
  },
  list: {
    name: 'Liste numérotée',
    command: '/list',
    icon: '1.',
    type: 'list',
    description: 'Liste ordonnée',
    category: 'list'
  },
  image: {
    name: 'Image',
    command: '/image',
    icon: '🖼',
    type: 'image',
    description: 'Ajouter une image',
    category: 'media'
  }
};

// Composant SlashMenu réutilisable
export const SlashMenu: React.FC<SlashMenuProps> = ({ 
  isOpen,
  position,
  onSelect,
  searchQuery = '',
  commands = Object.values(SlashCommands)
}) => {
  if (!isOpen) return null;

  const filteredCommands = commands.filter(cmd => 
    cmd.command.includes(searchQuery.toLowerCase()) ||
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouper les commandes par catégorie
  const groupedCommands = filteredCommands.reduce<Record<string, SlashCommand[]>>((acc, cmd) => {
    const category = cmd.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(cmd);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    basic: 'Basique',
    heading: 'Titres',
    list: 'Listes',
    media: 'Média',
    other: 'Autre'
  };

  return (
    <div
      className="absolute bg-white shadow-xl rounded-lg border border-gray-200 py-2 z-50 w-64 max-h-96 overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      {Object.entries(groupedCommands).map(([category, cmds]) => (
        <div key={category}>
          {filteredCommands.length > 1 && (
            <div className="px-3 py-1 text-xs text-gray-500 font-semibold uppercase">
              {categoryLabels[category]}
            </div>
          )}
          {cmds.map((cmd) => (
            <button
              key={cmd.command}
              type="button"
              onClick={() => onSelect(cmd.type)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"
            >
              <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-sm font-mono">
                {cmd.icon}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">{cmd.name}</div>
                <div className="text-xs text-gray-500">{cmd.description}</div>
              </div>
              <span className="text-xs text-gray-400">{cmd.command}</span>
            </button>
          ))}
        </div>
      ))}
      
      {filteredCommands.length === 0 && (
        <div className="px-3 py-4 text-center text-sm text-gray-500">
          Aucune commande trouvée
        </div>
      )}
    </div>
  );
};

// Hook personnalisé pour gérer les commandes slash
interface UseSlashCommandsReturn {
  isMenuOpen: boolean;
  menuPosition: Position;
  activeBlockId: string | null;
  openMenu: (blockId: string, position: Position) => void;
  closeMenu: () => void;
  handleCommand: (commandType: BlockType, callback?: (type: BlockType, blockId: string) => void) => void;
}

export const useSlashCommands = (): UseSlashCommandsReturn => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<Position>({ top: 0, left: 0 });
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const openMenu = useCallback((blockId: string, position: Position) => {
    setActiveBlockId(blockId);
    setMenuPosition(position);
    setIsMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setActiveBlockId(null);
  }, []);

  const handleCommand = useCallback((commandType: BlockType, callback?: (type: BlockType, blockId: string) => void) => {
    if (callback && activeBlockId) {
      callback(commandType, activeBlockId);
    }
    closeMenu();
  }, [activeBlockId, closeMenu]);

  return {
    isMenuOpen,
    menuPosition,
    activeBlockId,
    openMenu,
    closeMenu,
    handleCommand
  };
};

// Fonction utilitaire pour détecter si une commande slash est tapée
export const detectSlashCommand = (text: string): SlashCommand | null => {
  if (!text.startsWith('/')) return null;
  
  const command = text.toLowerCase();
  const matchingCommand = Object.values(SlashCommands).find(cmd => 
    cmd.command.startsWith(command)
  );
  
  return matchingCommand || null;
};

// Export des types de blocs disponibles
export const BLOCK_TYPES = {
  TEXT: 'text' as BlockType,
  PARAGRAPH: 'paragraph' as BlockType,
  H1: 'h1' as BlockType,
  H2: 'h2' as BlockType,
  H3: 'h3' as BlockType,
  BULLET: 'bullet' as BlockType,
  LIST: 'list' as BlockType,
  IMAGE: 'image' as BlockType
};

export default SlashCommands;