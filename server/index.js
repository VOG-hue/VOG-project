const express = require('express');
const path = require('path');
const app = express();

// Sert les fichiers statiques depuis /publique
app.use(express.static(path.join(__dirname, '../publique')));

// Configuration de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Route principale
app.get('/', (req, res) => {
  res.render('index');
});

// Lancer le serveur
app.listen(3000, () => {
  console.log('✅ Server running on http://localhost:3000');
});
