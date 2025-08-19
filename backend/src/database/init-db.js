const { initDatabase, startInit, closeDatabase } = require('./database');

/**
 * Script principal d'initialisation
 */
async function main() {
  try {
    console.log('🚀 Initialisation de la base de données...');
    
    // Initialiser la connexion
    await initDatabase();
    
    // Créer les tables
    await startInit();
    
    // Fermer la connexion
    await closeDatabase();
    
    console.log('✅ Initialisation terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur durant l\'initialisation:', error);
    process.exit(1);
  }
}

/**
 * Fonction d'initialisation exportée
 */
async function initializeDatabase() {
  return main();
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

module.exports = { 
  initializeDatabase,
  main
};