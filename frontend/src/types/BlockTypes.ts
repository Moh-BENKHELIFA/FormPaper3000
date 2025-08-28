// types/BlockTypes.ts

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  placeholder?: string;
  metadata?: Record<string, any>;
}

export type BlockType = 
  | 'text' 
  | 'paragraph' 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'bullet' 
  | 'list' 
  | 'image';

export interface Position {
  top: number;
  left: number;
}

export interface BlockProps {
  block: Block;
  updateContent: (blockId: string, content: string) => void;
  onSlashCommand: (blockId: string, position: Position) => void;
  onEnter: () => string; // Retourne l'ID du nouveau bloc
  onDelete: () => void;
}

export interface HeadingBlockProps extends BlockProps {
  level: 'h1' | 'h2' | 'h3';
}

export interface ListBlockProps extends BlockProps {
  isOrdered: boolean;
}

export interface SlashCommand {
  name: string;
  command: string;
  icon: string;
  type: BlockType;
  description: string;
  category: 'basic' | 'heading' | 'list' | 'media' | 'other';
}

export interface SlashMenuProps {
  isOpen: boolean;
  position: Position;
  onSelect: (commandType: BlockType) => void;
  searchQuery?: string;
  commands?: SlashCommand[];
}