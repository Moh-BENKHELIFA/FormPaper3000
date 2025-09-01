// frontend/src/services/notesStorageFile.ts - Nouveau service basé sur fichiers
import type { Block } from '../types/BlockTypes';
import type { PaperData } from '../types/Paper';

interface StoredNotes {
  paperId: string;
  title: string;
  blocks: Block[];
  lastModified: string;
  version: string;
  createdAt: string;
}

class NotesFileStorage {
  private readonly VERSION = '2.0.0';
  private readonly API_BASE = '/api'; // Ajustez selon votre configuration

  /**
   * Sauvegarder les notes d'un paper dans son dossier
   */
  public async saveNotes(paper: PaperData, blocks: Block[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/papers/${paper.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paperId: paper.id,
          title: paper.title,
          createdAt: paper.created_at,
          blocks: blocks
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      console.log(`✅ Notes sauvegardées pour paper ${paper.id}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde notes:', error);
      throw new Error('Impossible de sauvegarder les notes');
    }
  }

  /**
   * Charger les notes d'un paper depuis son dossier
   */
  public async loadNotes(paper: PaperData): Promise<Block[] | null> {
    try {
      const response = await fetch(`${this.API_BASE}/papers/${paper.id}/notes?title=${encodeURIComponent(paper.title)}&createdAt=${encodeURIComponent(paper.created_at || '')}`);
      
      if (response.status === 404) {
        return null; // Pas de notes trouvées
      }
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const notesData: StoredNotes = await response.json();
      console.log(`✅ Notes chargées pour paper ${paper.id}`);
      return notesData.blocks;
    } catch (error) {
      console.error('❌ Erreur chargement notes:', error);
      return null;
    }
  }

  /**
   * Supprimer les notes d'un paper
   */
  public async deleteNotes(paper: PaperData): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/papers/${paper.id}/notes`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: paper.title,
          createdAt: paper.created_at
        }),
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      console.log(`✅ Notes supprimées pour paper ${paper.id}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression notes:', error);
      return false;
    }
  }

  /**
   * Vérifier si des notes existent pour un paper
   */
  public async hasNotes(paper: PaperData): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/papers/${paper.id}/notes/exists?title=${encodeURIComponent(paper.title)}&createdAt=${encodeURIComponent(paper.created_at || '')}`);
      
      if (response.status === 404) {
        return false;
      }
      
      return response.ok;
    } catch (error) {
      console.error('❌ Erreur vérification notes:', error);
      return false;
    }
  }

  /**
   * Sauvegarder une image importée
   */
  public async saveImportedImage(paper: PaperData, imageFile: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('paperId', paper.id?.toString() || '');
      formData.append('title', paper.title);
      formData.append('createdAt', paper.created_at || '');

      const response = await fetch(`${this.API_BASE}/papers/${paper.id}/imported-images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Image importée sauvegardée: ${result.path}`);
      return result.path; // Chemin relatif vers l'image
    } catch (error) {
      console.error('❌ Erreur sauvegarde image importée:', error);
      throw new Error('Impossible de sauvegarder l\'image');
    }
  }

  /**
   * Obtenir l'URL complète d'une image sauvegardée
   */
  public getImageUrl(paper: PaperData, relativePath: string): string {
    const folderName = this.formatFolderName(paper.id || 0, paper.title, paper.created_at || '');
    return `${this.API_BASE}/papers/files/${folderName}/${relativePath}`;
  }

  /**
   * Formater le nom du dossier (même logique que le backend)
   */
  private formatFolderName(paperId: number, title: string, createdAt: string): string {
    const date = new Date(createdAt);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;
    
    const cleanTitle = title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    return `${paperId}_${cleanTitle}_${dateStr}`;
  }

  /**
   * Migrer depuis localStorage vers le système de fichiers
   */
  public async migrateFromLocalStorage(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('paper-notes-'));
      let migrated = 0;

      for (const key of keys) {
        try {
          const data = localStorage.getItem(key);
          if (!data) continue;

          const oldNotes = JSON.parse(data);
          const paperId = key.replace('paper-notes-', '');

          // Récupérer les infos du paper depuis l'API
          const paperResponse = await fetch(`${this.API_BASE}/papers/${paperId}`);
          if (!paperResponse.ok) continue;

          const paper: PaperData = await paperResponse.json();

          // Sauvegarder les notes dans le nouveau système
          await this.saveNotes(paper, oldNotes.blocks);

          // Supprimer de localStorage après migration réussie
          localStorage.removeItem(key);
          migrated++;

          console.log(`✅ Paper ${paperId} migré`);
        } catch (error) {
          console.error(`❌ Erreur migration paper ${key}:`, error);
        }
      }

      console.log(`✅ Migration terminée: ${migrated}/${keys.length} papers migrés`);
    } catch (error) {
      console.error('❌ Erreur migration:', error);
      throw new Error('Impossible de migrer les notes');
    }
  }

  /**
   * Exporter toutes les notes
   */
  public async exportAllNotes(): Promise<string> {
    try {
      const response = await fetch(`${this.API_BASE}/papers/notes/export`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const exportData = await response.json();
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ Erreur export notes:', error);
      throw new Error('Impossible d\'exporter les notes');
    }
  }

  /**
   * Importer des notes depuis un backup
   */
  public async importNotes(backupData: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/papers/notes/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: backupData,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      console.log('✅ Notes importées avec succès');
    } catch (error) {
      console.error('❌ Erreur import notes:', error);
      throw new Error('Impossible d\'importer les notes');
    }
  }
}

// Instance singleton
export const notesFileStorage = new NotesFileStorage();
export default notesFileStorage;