const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

// 📁 Base de données principale
const dbPath = path.join(__dirname, 'users.json');

// 📁 Dossier racine des animes
const animesFolder = path.join(__dirname, '..', 'animes');

// Création du fichier DB si inexistant
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ users: [], animes: [] }, null, 2));
}

const adapter = new JSONFile(dbPath);
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { users: [], animes: [] };

  // 🔄 Charger dynamiquement les animes depuis les fichiers info.json
  const animes = [];

  // Fonction récursive pour trouver tous les info.json
  function scanAnimeFolders(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanAnimeFolders(fullPath);
      } else if (entry.name === 'info.json') {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          const relativePath = path.relative(path.join(__dirname, '..'), path.dirname(fullPath));
          
          const coverPath = path.join('/', relativePath, 'cover.jpg').replace(/\\/g, '/');
          const episode = data.episodes?.[0];

          animes.push({
            id: crypto.randomUUID(),
            title: data.title || 'Sans titre',
            description: data.description || '',
            cover: coverPath,
            video: episode ? path.join('/', relativePath, episode.file).replace(/\\/g, '/') : null
          });
        } catch (err) {
          console.error('❌ Erreur de lecture de :', fullPath, err);
        }
      }
    }
  }

  scanAnimeFolders(animesFolder);

  // 🔄 Met à jour la base
  db.data.animes = animes;
  await db.write();

  console.log(`✅ Base de données initialisée avec ${animes.length} animes.`);
}

initDB();

module.exports = db;
