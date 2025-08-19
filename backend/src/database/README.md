# Paper Database

Une base de données SQLite complète pour gérer vos articles scientifiques avec stockage automatique des fichiers PDF et images.

## 🚀 Fonctionnalités

- **Gestion complète des articles** : titre, auteurs, date, conférence, DOI, URL
- **Système de catégories** : organisation flexible de vos papers
- **Descriptions détaillées** : notes et images pour chaque article
- **Stockage automatique des fichiers** :
  - Création automatique de dossiers uniques pour chaque paper
  - Sauvegarde des PDFs
  - Extraction et stockage des images
- **Statuts de lecture** : non lu, en cours, lu, favoris
- **Recherche avancée** : par titre, auteurs, catégories
- **API complète** : toutes les opérations CRUD

## 📁 Structure du projet

```
database/
├── database.js          # Connexion et initialisation SQLite
├── models.js            # Modèles de données et validation
├── operations.js        # Opérations CRUD complètes
├── fileOperations.js    # Gestion des fichiers et dossiers
├── init-db.js          # Script d'initialisation
├── index.js            # Point d'entrée principal
├── package.json        # Configuration NPM
└── README.md           # Cette documentation

MyPapers/               # Créé automatiquement
├── paper_1/
│   ├── document.pdf
│   └── images/
│       ├── image_1.png
│       └── image_2.png
└── paper_2/
    ├── article.pdf
    └── images/
```

## 📦 Installation

1. **Installer les dépendances** :
```bash
npm install
```

2. **Initialiser la base de données** :
```bash
npm run init-db
```

## 🛠️ Usage

### Import du module

```javascript
const { paperDB, paperOperations, categoryOperations } = require('./database');

// Connexion à la base
await paperDB.connect();
```

### Créer un paper complet

```javascript
const paperData = {
  title: "Machine Learning in Scientific Research",
  authors: "John Doe, Jane Smith",
  publication_date: "2024-01-15",
  conference: "ICML 2024",
  doi: "10.1000/example.doi",
  url: "https://example.com/paper"
};

// Avec PDF et images
const paperId = await paperDB.createCompletePaper(
  paperData,
  pdfBuffer,           // Buffer du PDF
  "research.pdf",      // Nom du fichier
  extractedImages,     // Tableau d'images [{name, buffer}]
  [1, 2, 3],          // IDs des catégories
  { texte: "Résumé du paper..." } // Description
);
```

### Opérations sur les papers

```javascript
// Récupérer tous les papers
const allPapers = await paperOperations.getAll();

// Récupérer un paper avec détails
const paperWithDetails = await paperOperations.getByIdWithDetails(1);

// Rechercher des papers
const results = await paperOperations.search("machine learning");

// Mettre à jour un paper
await paperOperations.update(1, { reading_status: 'lu' });

// Supprimer un paper (avec fichiers)
await paperDB.deleteCompletePaper(1);
```

### Gestion des catégories

```javascript
// Créer une catégorie
const categoryId = await categoryOperations.create("Intelligence Artificielle");

// Ajouter une catégorie à un paper
await paperCategoryOperations.addCategoryToPaper(paperId, categoryId);

// Récupérer les catégories d'un paper
const categories = await paperCategoryOperations.getCategoriesForPaper(paperId);
```

### Gestion des descriptions

```javascript
// Ajouter/modifier une description
await descriptionOperations.createOrUpdate(paperId, {
  texte: "Description détaillée du paper...",
  images: JSON.stringify(["/path/to/image1.png", "/path/to/image2.png"])
});
```

### Statistiques

```javascript
// Obtenir des statistiques
const stats = await paperDB.getStats();
console.log(stats);
/*
{
  totalPapers: 15,
  totalCategories: 5,
  readingStats: { non_lu: 8, en_cours: 3, lu: 4 },
  papersByYear: { 2024: 10, 2023: 5 }
}
*/
```

## 🗃️ Schéma de la base de données

### Table Papers
```sql
CREATE TABLE Papers (
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
);
```

### Table Categories
```sql
CREATE TABLE Categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
```

### Table PaperCategories (liaison)
```sql
CREATE TABLE PaperCategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER,
  categorie_id INTEGER,
  FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE,
  FOREIGN KEY (categorie_id) REFERENCES Categories(id) ON DELETE CASCADE
);
```

### Table Descriptions
```sql
CREATE TABLE Descriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER UNIQUE,
  texte TEXT,
  images TEXT,
  FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
);
```

## 📋 Statuts de lecture

```javascript
const { READING_STATUS } = require('./database');

// Valeurs possibles :
READING_STATUS.NON_LU    // 'non_lu'
READING_STATUS.EN_COURS  // 'en_cours'
READING_STATUS.LU        // 'lu'
READING_STATUS.FAVORIS   // 'favoris'
```

## 🔧 API Express.js

Exemple d'intégration avec Express :

```javascript
const express = require('express');
const multer = require('multer');
const { paperDB } = require('./database');

const app = express();
const upload = multer();

// Connecter la base au démarrage
app.listen(3000, async () => {
  await paperDB.connect();
  console.log('Serveur démarré sur le port 3000');
});

// Route pour créer un paper avec PDF
app.post('/papers', upload.single('pdf'), async (req, res) => {
  try {
    const paperData = req.body;
    const pdfBuffer = req.file?.buffer;
    const pdfName = req.file?.originalname;
    
    const paper = await paperDB.createCompletePaper(
      paperData, 
      pdfBuffer, 
      pdfName
    );
    
    res.json({ success: true, paper });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🛡️ Gestion des erreurs

Toutes les fonctions retournent des Promises et gèrent les erreurs :

```javascript
try {
  const paper = await paperOperations.create(invalidData);
} catch (error) {
  if (error.message.includes('UNIQUE constraint failed')) {
    console.log('DOI déjà existant');
  } else if (error.message.includes('Données du paper invalides')) {
    console.log('Données manquantes ou incorrectes');
  }
}
```

## 📝 Scripts disponibles

```bash
# Initialiser la base de données
npm run init-db

# Démarrer l'application
npm start

# Tests (si implémentés)
npm test
```

## 🚨 Points importants

1. **Dossiers automatiques** : Chaque paper créé génère un dossier `MyPapers/paper_{id}/`
2. **Cleanup automatique** : La suppression d'un paper supprime aussi ses fichiers
3. **Validation** : Tous les champs obligatoires sont vérifiés
4. **Unicité** : Le DOI doit être unique
5. **Relations** : Les suppressions en cascade sont gérées automatiquement

## 🤝 Contribution

N'hésitez pas à contribuer en ouvrant des issues ou des pull requests !

## 📄 License

MIT