import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlValue } from "sql.js";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "spotify.db");
// Located via a plain fs path (not require.resolve) so bundlers never see a
// module reference to the .wasm file and try to bundle/trace it — we just
// read the bytes with fs at runtime.
const WASM_PATH = path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS auth_tokens (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  spotify_user_id TEXT,
  display_name TEXT
);

CREATE TABLE IF NOT EXISTS plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  played_at TEXT NOT NULL,
  track_uri TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  duration_ms INTEGER NOT NULL,
  ms_played INTEGER NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_plays_dedup ON plays(track_uri, played_at);
CREATE INDEX IF NOT EXISTS idx_plays_played_at ON plays(played_at);
CREATE INDEX IF NOT EXISTS idx_plays_artist ON plays(artist_name);
`;

type GlobalWithDb = typeof globalThis & {
  __spotifyDbPromise?: Promise<Database>;
};

const g = globalThis as GlobalWithDb;

async function loadDb(): Promise<Database> {
  const wasmBinary = new Uint8Array(fs.readFileSync(WASM_PATH)).buffer;
  const SQL = await initSqlJs({
    locateFile: () => WASM_PATH,
    wasmBinary,
  });

  fs.mkdirSync(DATA_DIR, { recursive: true });

  let db: Database;
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(SCHEMA);
  persist(db);
  return db;
}

export async function getDb(): Promise<Database> {
  if (!g.__spotifyDbPromise) {
    g.__spotifyDbPromise = loadDb();
  }
  return g.__spotifyDbPromise;
}

export function persist(db: Database): void {
  const data = db.export();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

type Params = SqlValue[] | Record<string, SqlValue>;

export function run(db: Database, sql: string, params: Params = []): void {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    stmt.step();
  } finally {
    stmt.free();
  }
}

export function all<T = Record<string, SqlValue>>(
  db: Database,
  sql: string,
  params: Params = [],
): T[] {
  const stmt = db.prepare(sql);
  const rows: T[] = [];
  try {
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
  } finally {
    stmt.free();
  }
  return rows;
}

export function get<T = Record<string, SqlValue>>(
  db: Database,
  sql: string,
  params: Params = [],
): T | undefined {
  const rows = all<T>(db, sql, params);
  return rows[0];
}
