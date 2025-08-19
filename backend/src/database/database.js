const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'paperDatabase.db');
const dbDir = path.dirname(dbPath);

// Créer le dossier database s'il n'existe pas
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Instance de la base de données
let db;

/**
 * Fonction pour initialiser la connexion
 * @returns {Promise<sqlite3.Database>}
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Erreur de connexion à la base :', err.message);
        reject(err);
      } else {
        console.log('✅ Connecté à la base de données SQLite.');
        resolve(db);
      }
    });
  });
}

/**
 * Fonction pour supprimer toutes les tables
 * @param {Function} callback 
 */
function clearAllTables(callback) {
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'", (err, tables) => {
    if (err) return callback(err);

    if (tables.length === 0) return callback(null, "Aucune table à supprimer.");

    let remaining = tables.length;

    tables.forEach(({ name }) => {
      const dropSql = `DROP TABLE IF EXISTS ${name}`;
      db.run(dropSql, (err) => {
        if (err) console.error(`❌ Erreur suppression ${name}:`, err);

        remaining--;
        if (remaining === 0) callback(null, "✅ Tables supprimées.");
      });
    });
  });
}

/**
 * Fonction pour créer les tables
 * @param {Function} callback 
 */
function createTables(callback) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      authors TEXT NOT NULL,
      publication_date DATE NOT NULL,
      conference TEXT,
      reading_status TEXT DEFAULT 'non_lu',
      image TEXT,
      doi TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      folder_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS PaperCategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER,
      categorie_id INTEGER,
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE,
      FOREIGN KEY (categorie_id) REFERENCES Categories(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Descriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER UNIQUE,
      texte TEXT,
      images TEXT,
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
    )`, callback);

    // Dans votre fonction createTables, ajouter :
    db.run(`ALTER TABLE Papers ADD COLUMN conference_abbreviation TEXT`, (err) => {
      // Ignorer l'erreur si la colonne existe déjà
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erreur ajout colonne:', err);
      } else {
        console.log('✅ Colonne conference_abbreviation ajoutée');
      }
    });
  });
}

/**
 * Fonction pour lister les tables
 * @param {Function} callback 
 */
function listTables(callback) {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) return callback(err);
    const names = tables.map(t => t.name);
    callback(null, names);
  });
}

/**
 * Fonction principale d'initialisation
 * @returns {Promise<void>}
 */
function startInit() {
  return new Promise((resolve, reject) => {
    clearAllTables((err, message) => {
      if (err) {
        console.error("❌", err);
        return reject(err);
      }
      console.log(message);

      createTables((err) => {
        if (err) {
          console.error("❌ Erreur création:", err);
          return reject(err);
        }
        console.log("✅ Tables créées.");

        listTables((err, tables) => {
          if (err) {
            console.error("❌", err);
            return reject(err);
          }
          console.log("📋 Tables en base:", tables);
          resolve();
        });
      });
    });
  });
}

/**
 * Fonction pour fermer la base de données
 * @returns {Promise<void>}
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error("❌ Erreur fermeture DB:", err.message);
          reject(err);
        } else {
          console.log("🔒 Connexion à la base fermée.");
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

/**
 * Exporter l'instance de la base de données pour utilisation dans d'autres modules
 * @returns {sqlite3.Database}
 */
function getDatabase() {
  return db;
}

module.exports = {
  initDatabase,
  startInit,
  closeDatabase,
  getDatabase
};