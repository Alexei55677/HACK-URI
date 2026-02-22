import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import "dotenv/config";
const db = new Database("bess_data.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    stance TEXT,
    surface TEXT,
    total_score INTEGER,
    errors_json TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/sessions", (req, res) => {
    const sessions = db.prepare("SELECT * FROM sessions ORDER BY timestamp DESC").all();
    res.json(sessions.map(s => ({
      ...s,
      errors: JSON.parse(s.errors_json as string)
    })));
  });

  app.post("/api/sessions", (req, res) => {
    const { stance, surface, total_score, errors } = req.body;
    const stmt = db.prepare("INSERT INTO sessions (stance, surface, total_score, errors_json) VALUES (?, ?, ?, ?)");
    const info = stmt.run(stance, surface, total_score, JSON.stringify(errors));
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/sessions/:id", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
