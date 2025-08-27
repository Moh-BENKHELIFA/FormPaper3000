// services/notesStorage.ts
import type { Block } from '../types/BlockTypes';

// Interface pour les notes sauvegardées
export interface SavedNotes {
  paperId: string;
  lastModified: string;
  version: string;
  blocks: Block[];
  metadata?: {
    wordCount?: number;
    characterCount?: number;
    blockCount?: number;
  };
}

// Interface pour l'export/import complet
export interface NotesExport {
  version: string;
  exportDate: string;
  papers: Array<{
    paperId: string;
    paperTitle: string;
    notes: SavedNotes;
  }>;
}

class NotesStorageService {
  private readonly STORAGE_PREFIX = 'paper_notes_';
  private readonly VERSION = '1.0.0';

  /**
   * Sauvegarder les notes d'un papier
   */
  saveNotes(paperId: string, blocks: Block[]): boolean {
    try {
      const savedNotes: SavedNotes = {
        paperId,
        lastModified: new Date().toISOString(),
        version: this.VERSION,
        blocks,
        metadata: this.calculateMetadata(blocks)
      };

      const key = `${this.STORAGE_PREFIX}${paperId}`;
      localStorage.setItem(key, JSON.stringify(savedNotes));
      
      // Ajouter à l'index des notes
      this.updateNotesIndex(paperId);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notes:', error);
      return false;
    }
  }

  /**
   * Charger les notes d'un papier
   */
  loadNotes(paperId: string): Block[] | null {
    try {
      const key = `${this.STORAGE_PREFIX}${paperId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;
      
      const savedNotes: SavedNotes = JSON.parse(stored);
      
      // Vérifier la compatibilité de version si nécessaire
      if (this.isCompatibleVersion(savedNotes.version)) {
        return savedNotes.blocks;
      }
      
      console.warn('Version incompatible des notes');
      return null;
    } catch (error) {
      console.error('Erreur lors du chargement des notes:', error);
      return null;
    }
  }

  /**
   * Supprimer les notes d'un papier
   */
  deleteNotes(paperId: string): boolean {
    try {
      const key = `${this.STORAGE_PREFIX}${paperId}`;
      localStorage.removeItem(key);
      
      // Retirer de l'index
      this.removeFromNotesIndex(paperId);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression des notes:', error);
      return false;
    }
  }

  /**
   * Vérifier si un papier a des notes sauvegardées
   */
  hasNotes(paperId: string): boolean {
    const key = `${this.STORAGE_PREFIX}${paperId}`;
    return localStorage.getItem(key) !== null;
  }

  /**
   * Obtenir les métadonnées des notes
   */
  getNotesMetadata(paperId: string): SavedNotes['metadata'] | null {
    try {
      const key = `${this.STORAGE_PREFIX}${paperId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;
      
      const savedNotes: SavedNotes = JSON.parse(stored);
      return savedNotes.metadata || null;
    } catch (error) {
      console.error('Erreur lors de la récupération des métadonnées:', error);
      return null;
    }
  }

  /**
   * Obtenir la liste de tous les papiers avec des notes
   */
  getAllNotesIds(): string[] {
    try {
      const index = localStorage.getItem('notes_index');
      return index ? JSON.parse(index) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'index:', error);
      return [];
    }
  }

  /**
   * Exporter toutes les notes en JSON
   */
  exportAllNotes(papers?: Array<{ id: string; title: string }>): string {
    const notesIds = this.getAllNotesIds();
    const exportData: NotesExport = {
      version: this.VERSION,
      exportDate: new Date().toISOString(),
      papers: []
    };

    notesIds.forEach(paperId => {
      const notes = this.loadNotesComplete(paperId);
      if (notes) {
        const paperTitle = papers?.find(p => p.id === paperId)?.title || 'Sans titre';
        exportData.papers.push({
          paperId,
          paperTitle,
          notes
        });
      }
    });

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importer des notes depuis un JSON
   */
  importNotes(jsonData: string): { success: number; failed: number } {
    const result = { success: 0, failed: 0 };
    
    try {
      const importData: NotesExport = JSON.parse(jsonData);
      
      if (!this.isCompatibleVersion(importData.version)) {
        console.warn('Version incompatible pour l\'import');
      }

      importData.papers.forEach(({ notes }) => {
        if (this.saveNotes(notes.paperId, notes.blocks)) {
          result.success++;
        } else {
          result.failed++;
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      result.failed++;
    }

    return result;
  }

  /**
   * Calculer les métadonnées des blocs
   */
  private calculateMetadata(blocks: Block[]): SavedNotes['metadata'] {
    let wordCount = 0;
    let characterCount = 0;

    blocks.forEach(block => {
      if (block.type !== 'image' && block.content) {
        const text = block.content;
        characterCount += text.length;
        wordCount += text.trim().split(/\s+/).filter(word => word.length > 0).length;
      }
    });

    return {
      wordCount,
      characterCount,
      blockCount: blocks.length
    };
  }

  /**
   * Charger les notes complètes avec métadonnées
   */
  private loadNotesComplete(paperId: string): SavedNotes | null {
    try {
      const key = `${this.STORAGE_PREFIX}${paperId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;
      
      return JSON.parse(stored);
    } catch (error) {
      console.error('Erreur lors du chargement complet des notes:', error);
      return null;
    }
  }

  /**
   * Mettre à jour l'index des notes
   */
  private updateNotesIndex(paperId: string): void {
    try {
      const index = this.getAllNotesIds();
      if (!index.includes(paperId)) {
        index.push(paperId);
        localStorage.setItem('notes_index', JSON.stringify(index));
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'index:', error);
    }
  }

  /**
   * Retirer de l'index des notes
   */
  private removeFromNotesIndex(paperId: string): void {
    try {
      const index = this.getAllNotesIds();
      const filtered = index.filter(id => id !== paperId);
      localStorage.setItem('notes_index', JSON.stringify(filtered));
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'index:', error);
    }
  }

  /**
   * Vérifier la compatibilité de version
   */
  private isCompatibleVersion(version: string): boolean {
    // Pour l'instant, accepter toutes les versions 1.x.x
    return version.startsWith('1.');
  }

  /**
   * Nettoyer toutes les notes (utiliser avec précaution)
   */
  clearAllNotes(): void {
    const notesIds = this.getAllNotesIds();
    notesIds.forEach(id => this.deleteNotes(id));
    localStorage.removeItem('notes_index');
  }
}

// Export d'une instance unique (singleton)
export const notesStorage = new NotesStorageService();
export default notesStorage;