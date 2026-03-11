import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import type { Request, Response } from "express";

const db = new Database("knowledge.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    category TEXT,
    source_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));

  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  // API Routes
  app.post("/api/upload", upload.array("files"), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const category = req.body.category || "General";
      const results = [];

      for (const file of files) {
        let text = "";
        const extension = path.extname(file.originalname).toLowerCase();

        if (extension === ".pdf") {
          const data = await pdf(file.buffer);
          text = data.text;
        } else if (extension === ".docx") {
          const data = await mammoth.extractRawText({ buffer: file.buffer });
          text = data.value;
        } else if (extension === ".xlsx" || extension === ".xls" || extension === ".csv") {
          const workbook = XLSX.read(file.buffer, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          text = XLSX.utils.sheet_to_txt(worksheet);
        } else if (extension === ".txt" || extension === ".md") {
          text = file.buffer.toString("utf-8");
        }

        if (text.trim()) {
          const stmt = db.prepare("INSERT INTO knowledge (title, content, category, source_type) VALUES (?, ?, ?, ?)");
          const info = stmt.run(file.originalname, text, category, extension);
          results.push({ id: info.lastInsertRowid, title: file.originalname, category });
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process files" });
    }
  });

  app.post("/api/knowledge/text", (req, res) => {
    const { title, content, category } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO knowledge (title, content, category, source_type) VALUES (?, ?, ?, ?)");
      const info = stmt.run(title, content, category, "text");
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to save knowledge" });
    }
  });

  app.get("/api/knowledge", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM knowledge ORDER BY created_at DESC").all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch knowledge" });
    }
  });

  app.delete("/api/knowledge/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM knowledge WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete knowledge" });
    }
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
