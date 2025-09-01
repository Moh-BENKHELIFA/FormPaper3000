// components/commands/ListBlock.tsx - VERSION CORRIGEE avec logique originale
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { ListBlockProps } from '../../types/BlockTypes';

export const ListBlock: React.FC<ListBlockProps> = ({ 
  block, 
  isOrdered = false,
  updateContent, 
  onSlashCommand, 
  onEnter, 
  onDelete 
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<string[]>(
    block.content ? block.content.split('\n').filter(item => item) : ['']
  );

  useEffect(() => {
    if (block.content === '' && contentRef.current) {
      const firstItem = contentRef.current.querySelector<HTMLDivElement>('[contenteditable]');
      if (firstItem) {
        firstItem.focus();
      }
    }
  }, [block.content]);

  useEffect(() => {
    // Synchroniser le contenu avec le bloc parent
    updateContent(block.id, items.join('\n'));
  }, [items, block.id, updateContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    const selection = window.getSelection();
    const cursorAtStart = selection !== null && 
      selection.rangeCount > 0 && 
      selection.getRangeAt(0).startOffset === 0;
    const target = e.currentTarget;
    const currentItem = target.textContent || '';
    
    if (e.key === '/') {
      const rect = target.getBoundingClientRect();
      const position = {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      };
      
      setTimeout(() => {
        onSlashCommand(block.id, position);
      }, 0);
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Si l'élément actuel est vide et c'est le dernier, créer un nouveau bloc text
      if (currentItem === '' && index === items.length - 1) {
        onEnter();
      } else {
        // Sinon, ajouter un nouvel élément à la liste
        const newItems = [...items];
        newItems.splice(index + 1, 0, '');
        setItems(newItems);
        
        // Focus sur le nouvel élément
        setTimeout(() => {
          if (contentRef.current) {
            const listItems = contentRef.current.querySelectorAll<HTMLDivElement>('[contenteditable]');
            if (listItems[index + 1]) {
              listItems[index + 1].focus();
            }
          }
        }, 0);
      }
    }
    
    if (e.key === 'Backspace') {
      if (currentItem === '' && cursorAtStart) {
        e.preventDefault();
        
        if (items.length === 1) {
          // Si c'est le seul élément, supprimer le bloc
          onDelete();
        } else {
          // Sinon, supprimer cet élément de la liste
          const newItems = items.filter((_, i) => i !== index);
          setItems(newItems);
          
          // Focus sur l'élément précédent
          if (index > 0) {
            setTimeout(() => {
              if (contentRef.current) {
                const listItems = contentRef.current.querySelectorAll<HTMLDivElement>('[contenteditable]');
                if (listItems[index - 1]) {
                  listItems[index - 1].focus();
                  // Placer le curseur à la fin
                  const range = document.createRange();
                  const sel = window.getSelection();
                  if (sel) {
                    range.selectNodeContents(listItems[index - 1]);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                  }
                }
              }
            }, 0);
          }
        }
      }
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      // Future implémentation : indentation des listes
    }
  }, [items, block.id, onSlashCommand, onEnter, onDelete]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>, index: number) => {
    const target = e.currentTarget;
    const content = target.textContent || '';
    
    // Mettre à jour l'item dans la liste
    const newItems = [...items];
    newItems[index] = content;
    setItems(newItems);
  }, [items]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    
    if (!selection || !selection.rangeCount) return;
    
    selection.deleteFromDocument();
    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Mettre à jour l'item
    const target = e.currentTarget;
    const newItems = [...items];
    newItems[index] = target.textContent || '';
    setItems(newItems);
  }, [items]);

  const getListMarker = (index: number): string => {
    return isOrdered ? `${index + 1}.` : '•';
  };

  return (
    <div className="group relative">
      <div ref={contentRef} className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 relative">
            <span className="text-gray-400 select-none pt-1 w-6 text-right flex-shrink-0">
              {getListMarker(index)}
            </span>
            <div
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => handleKeyDown(e, index)}
              onInput={(e) => handleInput(e, index)}
              onPaste={(e) => handlePaste(e, index)}
              data-list-item={index}
              className="flex-1 outline-none py-1 px-2 min-h-[1.5rem] hover:bg-gray-50 rounded transition-colors focus:bg-blue-50"
              style={{
                direction: 'ltr',
                unicodeBidi: 'normal',
                textAlign: 'left'
              }}
              // On utilise une ref callback pour synchroniser le contenu
              ref={(el) => {
                if (el && el.textContent !== item) {
                  el.textContent = item;
                }
              }}
            />
            {item === '' && (
              <div 
                className="absolute left-8 top-1 pointer-events-none text-gray-400 select-none"
                style={{ direction: 'ltr' }}
              >
                Élément de liste
              </div>
            )}
          </div>
        ))}
      </div>

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

export default ListBlock;