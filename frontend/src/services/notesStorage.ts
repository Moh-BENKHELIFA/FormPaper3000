// services/notesStorage.ts
import type { Block } from '../types/BlockTypes';

interface StoredNotes {
  paperId: string;
  blocks: Block[];
  lastModified: string;
  version: string;
}

class NotesStorage {
  private readonly STORAGE_PREFIX = 'paper-notes-';
  private readonly VERSION = '1.0.0';

  // Construire la clé de stockage
  private getStorageKey(paperId: string): string {
    return `${this.STORAGE_PREFIX}${paperId}`;
  }

  // Sauvegarder les notes d'un paper
  public saveNotes(paperId: string, blocks: Block[]): void {
    try {
      const notes: StoredNotes = {
        paperId,
        blocks,
        lastModified: new Date().toISOString(),
        version: this.VERSION
      };

      const serialized = JSON.stringify(notes);
      localStorage.setItem(this.getStorageKey(paperId), serialized);
      
      console.log(`Notes sauvegardées pour le paper ${paperId}:`, blocks.length, 'blocs');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notes:', error);
      throw new Error('Impossible de sauvegarder les notes');
    }
  }

  // Charger les notes d'un paper
  public loadNotes(paperId: string): Block[] | null {
    try {
      const serialized = localStorage.getItem(this.getStorageKey(paperId));
      
      if (!serialized) {
        return null;
      }

      const notes: StoredNotes = JSON.parse(serialized);
      
      // Vérifier la version pour compatibilité future
      if (notes.version !== this.VERSION) {
        console.warn(`Version des notes différente pour ${paperId}: ${notes.version} vs ${this.VERSION}`);
      }

      console.log(`Notes chargées pour le paper ${paperId}:`, notes.blocks.length, 'blocs');
      return notes.blocks;
    } catch (error) {
      console.error('Erreur lors du chargement des notes:', error);
      return null;
    }
  }

  // Supprimer les notes d'un paper
  public deleteNotes(paperId: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(paperId));
      console.log(`Notes supprimées pour le paper ${paperId}`);
    } catch (error) {
      console.error('Erreur lors de la suppression des notes:', error);
    }
  }

  // Vérifier si des notes existent pour un paper
  public hasNotes(paperId: string): boolean {
    try {
      return localStorage.getItem(this.getStorageKey(paperId)) !== null;
    } catch (error) {
      return false;
    }
  }

  // Obtenir la liste de tous les papers avec des notes
  public getAllNotedPapers(): string[] {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith(this.STORAGE_PREFIX))
        .map(key => key.replace(this.STORAGE_PREFIX, ''));
    } catch (error) {
      console.error('Erreur lors de la récupération des papers notés:', error);
      return [];
    }
  }

  // Obtenir les métadonnées des notes d'un paper
  public getNotesMetadata(paperId: string): { 
    lastModified: string; 
    blockCount: number; 
    wordCount: number; 
  } | null {
    try {
      const serialized = localStorage.getItem(this.getStorageKey(paperId));
      
      if (!serialized) {
        return null;
      }

      const notes: StoredNotes = JSON.parse(serialized);
      
      const wordCount = notes.blocks.reduce((acc, block) => {
        if (block.type !== 'image' && block.content) {
          return acc + block.content.trim().split(/\s+/).filter(word => word.length > 0).length;
        }
        return acc;
      }, 0);

      return {
        lastModified: notes.lastModified,
        blockCount: notes.blocks.length,
        wordCount
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des métadonnées:', error);
      return null;
    }
  }

  // Exporter toutes les notes
  public exportAllNotes(): { [paperId: string]: StoredNotes } {
    try {
      const allNotes: { [paperId: string]: StoredNotes } = {};
      const notedPapers = this.getAllNotedPapers();
      
      notedPapers.forEach(paperId => {
        const serialized = localStorage.getItem(this.getStorageKey(paperId));
        if (serialized) {
          allNotes[paperId] = JSON.parse(serialized);
        }
      });
      
      return allNotes;
    } catch (error) {
      console.error('Erreur lors de l\'export des notes:', error);
      return {};
    }
  }

  // Importer des notes
  public importNotes(notesData: { [paperId: string]: StoredNotes }): void {
    try {
      Object.entries(notesData).forEach(([paperId, notes]) => {
        this.saveNotes(paperId, notes.blocks);
      });
      
      console.log('Notes importées avec succès pour', Object.keys(notesData).length, 'papers');
    } catch (error) {
      console.error('Erreur lors de l\'import des notes:', error);
      throw new Error('Impossible d\'importer les notes');
    }
  }

  // Nettoyer les notes orphelines (papers qui n'existent plus)
  public cleanupOrphanedNotes(existingPaperIds: string[]): number {
    try {
      const notedPapers = this.getAllNotedPapers();
      const existingIds = new Set(existingPaperIds);
      
      let cleanedCount = 0;
      notedPapers.forEach(paperId => {
        if (!existingIds.has(paperId)) {
          this.deleteNotes(paperId);
          cleanedCount++;
        }
      });
      
      console.log(`${cleanedCount} notes orphelines supprimées`);
      return cleanedCount;
    } catch (error) {
      console.error('Erreur lors du nettoyage des notes:', error);
      return 0;
    }
  }

  // Obtenir les statistiques de stockage - VERSION CORRIGÉE
  public getStorageStats(): {
  totalNotes: number;
  totalSize: number;
  totalBlocks: number;
  totalWords: number;
  oldestNote: string | null;
  newestNote: string | null;
} {
  try {
    const notedPapers = this.getAllNotedPapers();
    let totalSize = 0;
    let totalBlocks = 0;
    let totalWords = 0;
    let oldestDate: Date | null = null;   // ✅
    let newestDate: Date | null = null;   // ✅

    notedPapers.forEach(paperId => {
      const serialized = localStorage.getItem(this.getStorageKey(paperId));
      if (serialized) {
        totalSize += serialized.length;

        const notes: StoredNotes = JSON.parse(serialized);
        totalBlocks += notes.blocks.length;

        totalWords += notes.blocks.reduce((acc, block) => {
          if (block.type !== 'image' && block.content) {
            return acc + block.content.trim().split(/\s+/).filter(word => word.length > 0).length;
          }
          return acc;
        }, 0);

        const noteDate = new Date(notes.lastModified);
        if (!oldestDate || noteDate.getTime() < oldestDate.getTime()) {
          oldestDate = noteDate;
        }
        if (!newestDate || noteDate.getTime() > newestDate.getTime()) {
          newestDate = noteDate;
        }
      }
    });

    return {
      totalNotes: notedPapers.length,
      totalSize,
      totalBlocks,
      totalWords,
      oldestNote: oldestDate ? (oldestDate as Date).toISOString() : null,
      newestNote: newestDate ? (newestDate as Date).toISOString() : null

    };
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    return {
      totalNotes: 0,
      totalSize: 0,
      totalBlocks: 0,
      totalWords: 0,
      oldestNote: null,
      newestNote: null
    };
  }
}


  // Rechercher dans toutes les notes
  public searchInNotes(query: string): Array<{
    paperId: string;
    blockId: string;
    blockType: string;
    content: string;
    context: string;
  }> {
    try {
      const results: Array<{
        paperId: string;
        blockId: string;
        blockType: string;
        content: string;
        context: string;
      }> = [];
      
      const queryLower = query.toLowerCase();
      const notedPapers = this.getAllNotedPapers();
      
      notedPapers.forEach(paperId => {
        const blocks = this.loadNotes(paperId);
        if (blocks) {
          blocks.forEach(block => {
            if (block.content && block.content.toLowerCase().includes(queryLower)) {
              // Créer un contexte (50 caractères avant et après)
              const index = block.content.toLowerCase().indexOf(queryLower);
              const start = Math.max(0, index - 50);
              const end = Math.min(block.content.length, index + query.length + 50);
              const context = (start > 0 ? '...' : '') + 
                           block.content.substring(start, end) + 
                           (end < block.content.length ? '...' : '');
              
              results.push({
                paperId,
                blockId: block.id,
                blockType: block.type,
                content: block.content,
                context
              });
            }
          });
        }
      });
      
      return results;
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      return [];
    }
  }

  // Dupliquer les notes d'un paper vers un autre
  public duplicateNotes(sourcePaperId: string, targetPaperId: string): boolean {
    try {
      const sourceBlocks = this.loadNotes(sourcePaperId);
      if (sourceBlocks) {
        // Créer de nouveaux IDs pour éviter les conflits
        const duplicatedBlocks = sourceBlocks.map(block => ({
          ...block,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        
        this.saveNotes(targetPaperId, duplicatedBlocks);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la duplication des notes:', error);
      return false;
    }
  }

  // Backup complet au format JSON
  public createBackup(): string {
    try {
      const backup = {
        version: this.VERSION,
        timestamp: new Date().toISOString(),
        notes: this.exportAllNotes(),
        stats: this.getStorageStats()
      };
      
      return JSON.stringify(backup, null, 2);
    } catch (error) {
      console.error('Erreur lors de la création du backup:', error);
      throw new Error('Impossible de créer le backup');
    }
  }

  // Restaurer depuis un backup
  public restoreFromBackup(backupString: string): void {
    try {
      const backup = JSON.parse(backupString);
      
      if (backup.version !== this.VERSION) {
        console.warn('Version de backup différente, tentative de restauration...');
      }
      
      if (backup.notes) {
        this.importNotes(backup.notes);
      }
      
      console.log('Backup restauré avec succès');
    } catch (error) {
      console.error('Erreur lors de la restauration du backup:', error);
      throw new Error('Impossible de restaurer le backup');
    }
  }
}

// Instance singleton
export const notesStorage = new NotesStorage();

export default notesStorage;