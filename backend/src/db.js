import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "leads.sqlite");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const insertLead = db.prepare(
    `INSERT INTO leads (name, email, phone) VALUES (?, ?, ?)`
);

export function saveLead({ name, email, phone }) {
    const result = insertLead.run(name, email, phone);
    const rowid = result.lastInsertRowid;
    return { id: typeof rowid === "bigint" ? Number(rowid) : rowid };
}
