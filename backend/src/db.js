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

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    meta TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const insertLead = db.prepare(
    `INSERT INTO leads (name, email, phone) VALUES (?, ?, ?)`
);

const insertReview = db.prepare(
    `INSERT INTO reviews (author, meta, text) VALUES (?, ?, ?)`
);

const selectLatestReviews = db.prepare(`
    SELECT id, author, meta, text, created_at
    FROM reviews
    ORDER BY id DESC
    LIMIT ?
`);

export function saveLead({ name, email, phone }) {
    const result = insertLead.run(name, email, phone);
    const rowid = result.lastInsertRowid;
    return { id: typeof rowid === "bigint" ? Number(rowid) : rowid };
}

export function saveReview({ author, meta, text }) {
    const result = insertReview.run(author, meta, text);
    const rowid = result.lastInsertRowid;
    return { id: typeof rowid === "bigint" ? Number(rowid) : rowid };
}

export function getLatestReviews(limit = 20) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    return selectLatestReviews.all(safeLimit);
}
