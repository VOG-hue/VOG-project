import express from "express";
import session from "express-session";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

// Résolution de __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📁 Chemins
const dbFile = path.join(__dirname, "db.json");
const animesFolder = path.join(__dirname, "..", "publique", "anime");

// 📁 Initialisation DB
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);
await db.read();
db.data ||= { users: [], animes: [] };

// 👤 Superadmin auto si base vide
if (db.data.users.length === 0) {
  const hash = await bcrypt.hash("admin123", 10);
  db.data.users.push({
    id: uuidv4(),
    username: "superadmin",
    password: hash,
    role: "superadmin",
  });
  console.log("🔐 Superadmin ajouté (user: superadmin / pass: admin123)");
}

// 🔄 Recharge les animes depuis les info.json
const animes = [];

function scanAnimeFolders(dir) {
  if (!fs.existsSync(dir)) {
    console.warn("⚠️ Dossier animes introuvable :", dir);
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanAnimeFolders(fullPath);
    } else if (entry.name === "info.json") {
      try {
        const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
        const relativePath = path.relative(path.join(__dirname, "..", "publique"), path.dirname(fullPath));
        
        const coverPath = "/" + path.join(relativePath, "cover.jpg").replace(/\\/g, "/");
        const episode = data.episodes?.[0];

        animes.push({
          id: uuidv4(),
          title: data.title || "Sans titre",
          description: data.description || "",
          cover: coverPath,
          video: episode ? "/" + path.join(relativePath, episode.file).replace(/\\/g, "/") : null,
        });
      } catch (err) {
        console.error("❌ Erreur lecture :", fullPath, err);
      }
    }
  }
}

scanAnimeFolders(animesFolder);
db.data.animes = animes;
await db.write();
console.log(`📥 ${animes.length} animes chargés.`);

// 🚀 App Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration du moteur de template
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Middlewares de parsing (AVANT les routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration multer pour FormData
const upload = multer();

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "../publique")));

// Configuration des sessions
app.use(session({
  secret: "super-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false },
}));

// Configuration Helmet
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://unpkg.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      styleSrcElem: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  })
);

// 🏠 Page d'accueil
app.get("/", (req, res) => {
  const user = req.session.user || null;
  const animes = db.data.animes || [];
  res.render("index", { user, animes });
});

// 🔐 Connexion
app.post("/login", upload.none(), async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username et password requis" });
    }

    const user = db.data.users.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect" });
    }

    // ✅ Ajout de l'avatar dans la session
   req.session.user = {
  id: user.id,
  username: user.username,
  role: user.role,
  avatar: user.avatar || "/uploads/avatar-default.jpg"
};

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erreur login:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


// 📝 Inscription
app.post("/register", upload.none(), async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username et password requis" });
    }

    const userExists = db.data.users.find(u => u.username === username);
    if (userExists) {
      return res.status(409).json({ error: "Nom d'utilisateur déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      role: "user"
    };

    db.data.users.push(newUser);
    await db.write();

    req.session.user = { id: newUser.id, username: newUser.username, role: newUser.role };
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erreur register:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ✅ Route correcte — En dehors de toute autre déclaration
app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Non autorisé");
  }

  const userId = req.session.user.id;
  const avatarPath = `/uploads/avatar-${userId}.jpg`;

  // Sauvegarde du fichier
  const filePath = path.join(__dirname, "../publique", avatarPath);
  fs.writeFileSync(filePath, req.file.buffer);

  // Enregistrement dans la DB + mise à jour session
  const user = db.data.users.find(u => u.id === userId);
  if (user) {
    user.avatar = avatarPath;
    await db.write();

    // MAJ directe de la session pour affichage correct après redirection
    req.session.user.avatar = avatarPath;
  }

  res.redirect("/");
});



// 🚪 Déconnexion
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Erreur logout:", err);
    }
    res.redirect("/");
  });
});

// 🔎 Voir un anime
app.get("/anime/:id", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }

  const anime = db.data.animes.find(a => a.id === req.params.id);
  if (!anime) {
    return res.status(404).send("Anime non trouvé");
  }

  res.render("anime", { user: req.session.user, anime });
});

// 🔍 Recherche dynamique (barre de recherche)
app.get("/search", (req, res) => {
  const query = req.query.q?.toLowerCase() || "";

  const results = db.data.animes
    .filter(anime => anime.title.toLowerCase().includes(query))
    .sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(query) ? -1 : 0;
      const bStarts = b.title.toLowerCase().startsWith(query) ? -1 : 0;
      return aStarts - bStarts;
    })
    .slice(0, 5); // 

  res.json(results);
});

// ▶️ Lancer serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
