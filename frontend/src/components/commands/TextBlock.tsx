// components/commands/TextBlock.tsx - VERSION CORRIGEE
import React, { useRef, useEffect, useCallback } from 'react';
import type { BlockProps } from '../../types/BlockTypes';

export const TextBlock: React.FC<BlockProps> = ({ 
  block, 
  updateContent, 
  onSlashCommand, 
  onEnter, 
  onDelete 
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Synchroniser le contenu sans utiliser dangerouslySetInnerHTML
  useEffect(() => {
    if (contentRef.current) {
      const currentText = contentRef.current.textContent || '';
      const blockContent = block.content || '';
      
      // Seulement mettre à jour si différent pour éviter les boucles
      if (currentText !== blockContent) {
        contentRef.current.textContent = blockContent;
      }
      
      // Focus si nouveau bloc vide
      if (blockContent === '' && document.activeElement !== contentRef.current) {
        contentRef.current.focus();
      }
    }
  }, [block.content]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
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
      // Focus sur le nouveau bloc après sa création
      setTimeout(() => {
        const newBlock = document.querySelector<HTMLDivElement>(`[data-block-id="${newBlockId}"]`);
        if (newBlock) {
          newBlock.focus();
        }
      }, 0);
    }
    
    if (e.key === 'Backspace' && (block.content === '' || !block.content) && cursorAtStart) {
      e.preventDefault();
      onDelete();
    }
  }, [block.id, block.content, onSlashCommand, onEnter, onDelete]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const content = target.textContent || '';
    
    // Mettre à jour immédiatement pour éviter la désynchronisation
    updateContent(block.id, content);
    
    // Détecter si l'utilisateur tape "/" au début
    if (content === '/' && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      const position = {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      };
      onSlashCommand(block.id, position);
    }
  }, [block.id, updateContent, onSlashCommand]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    
    if (!selection || !selection.rangeCount) return;
    
    // Insérer le texte de manière propre
    selection.deleteFromDocument();
    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    
    // Placer le curseur après le texte collé
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Mettre à jour le contenu
    if (contentRef.current) {
      updateContent(block.id, contentRef.current.textContent || '');
    }
  }, [block.id, updateContent]);

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
        className="outline-none py-1 px-2 min-h-[1.5rem] hover:bg-gray-50 rounded transition-colors focus:bg-blue-50"
        style={{
          direction: 'ltr',
          unicodeBidi: 'normal',
          textAlign: 'left'
        }}
        // Ne plus utiliser dangerouslySetInnerHTML !
      />
      
      {(!block.content || block.content === '') && (
        <div 
          className="absolute top-1 left-2 text-gray-400 pointer-events-none select-none"
          style={{ direction: 'ltr' }}
        >
          {block.placeholder || "Commencez à écrire ou tapez '/' pour les commandes..."}
        </div>
      )}

      {/* Poignée de déplacement */}
      <div className="absolute -left-6 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          className="p-1 hover:bg-gray-200 rounded text-gray-400"
          aria-label="Déplacer le bloc"
          onClick={(e) => e.preventDefault()}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0zM17 10a2 2 0 11-4 0 2 2 0 014 0zM7 18a2 2 0 11-4 0 2 2 0 014 0zM17 18a2 2 0 11-4 0 2 2 0 014 0zM17 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TextBlock;