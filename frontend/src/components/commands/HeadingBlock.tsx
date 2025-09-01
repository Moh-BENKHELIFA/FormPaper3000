// components/commands/HeadingBlock.tsx - Votre version originale SANS dangerouslySetInnerHTML
import React, { useRef, useEffect } from 'react';
import type { HeadingBlockProps } from '../../types/BlockTypes';

export const HeadingBlock: React.FC<HeadingBlockProps> = ({ 
  block, 
  level = 'h1',
  updateContent, 
  onSlashCommand, 
  onEnter, 
  onDelete 
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (block.content === '' && contentRef.current) {
      contentRef.current.focus();
    }
    
    // Synchroniser le contenu sans dangerouslySetInnerHTML
    if (contentRef.current && contentRef.current.textContent !== block.content) {
      contentRef.current.textContent = block.content || '';
    }
  }, [block.content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    const cursorAtStart = selection !== null && 
      selection.rangeCount > 0 && 
      selection.getRangeAt(0).startOffset === 0;
    
    if (e.key === '/') {
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        const position = {
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX
        };
        
        setTimeout(() => {
          onSlashCommand(block.id, position);
        }, 0);
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newBlockId = onEnter();
      setTimeout(() => {
        const newBlock = document.querySelector<HTMLDivElement>(`[data-block-id="${newBlockId}"]`);
        if (newBlock) {
          newBlock.focus();
        }
      }, 0);
    }
    
    if (e.key === 'Backspace' && block.content === '' && cursorAtStart) {
      e.preventDefault();
      onDelete();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const content = target.textContent || '';
    updateContent(block.id, content);
    
    if (content === '/' && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      const position = {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      };
      onSlashCommand(block.id, position);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    
    if (!selection || !selection.rangeCount) return;
    
    selection.deleteFromDocument();
    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    
    // Placer le curseur après le texte collé
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    if (contentRef.current) {
      updateContent(block.id, contentRef.current.textContent || '');
    }
  };

  // Déterminer les styles selon le niveau de titre
  const getHeadingStyles = (): string => {
    const styles = {
      h1: 'text-3xl font-bold text-gray-900 mt-6 mb-3',
      h2: 'text-2xl font-semibold text-gray-800 mt-5 mb-2',
      h3: 'text-xl font-medium text-gray-700 mt-4 mb-2'
    };
    return styles[level] || styles.h1;
  };

  const getPlaceholder = (): string => {
    const placeholders = {
      h1: 'Titre 1',
      h2: 'Titre 2',
      h3: 'Titre 3'
    };
    return placeholders[level] || 'Titre';
  };

  return (
    <div className="group relative">
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onPaste={handlePaste}
        data-block-id={block.id}
        className={`outline-none px-2 hover:bg-gray-50 rounded transition-colors ${getHeadingStyles()}`}
        style={{
          direction: 'ltr',
          unicodeBidi: 'normal',
          textAlign: 'left'
        }}
        // SUPPRIME: dangerouslySetInnerHTML - maintenant géré dans useEffect
      />
      
      {block.content === '' && (
        <div className={`absolute top-0 left-2 pointer-events-none opacity-30 ${getHeadingStyles()}`}>
          {getPlaceholder()}
        </div>
      )}

      {/* Indicateur de niveau */}
      <div className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-gray-400 font-mono uppercase">
          {level}
        </span>
      </div>

      {/* Poignée de déplacement */}
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          className="p-1 hover:bg-gray-200 rounded text-gray-400"
          aria-label="Déplacer le bloc"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0zM17 10a2 2 0 11-4 0 2 2 0 014 0zM7 18a2 2 0 11-4 0 2 2 0 014 0zM17 18a2 2 0 11-4 0 2 2 0 014 0zM17 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default HeadingBlock;