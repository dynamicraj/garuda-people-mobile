/**
 * Offline punch queue — SQLite via expo-sqlite (next API).
 *
 * Schema:
 *   punches(
 *     id TEXT PRIMARY KEY,    -- client-generated UUID
 *     punch_type TEXT,         -- 'in' | 'out' | 'auto'
 *     created_at TEXT,         -- ISO timestamp the client made this punch
 *     latitude REAL, longitude REAL, accuracy REAL,
 *     selfie_uri TEXT,         -- local file URI; uploaded on sync
 *     device_info TEXT,
 *     synced INTEGER DEFAULT 0,
 *     attempts INTEGER DEFAULT 0,
 *     last_error TEXT
 *   )
 */
import * as SQLite from 'expo-sqlite'

let _db: SQLite.SQLiteDatabase | null = null

async function db(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db
  _db = await SQLite.openDatabaseAsync('garuda-people.db')
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS punches (
      id TEXT PRIMARY KEY,
      punch_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      latitude REAL, longitude REAL, accuracy REAL,
      selfie_uri TEXT,
      device_info TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_punches_synced ON punches(synced);
    CREATE INDEX IF NOT EXISTS ix_punches_created_at ON punches(created_at);
  `)
  return _db
}

export type QueuedPunch = {
  id: string
  punch_type: 'in' | 'out' | 'auto'
  created_at: string
  latitude: number
  longitude: number
  accuracy: number | null
  selfie_uri: string | null
  device_info: string | null
  synced: number
  attempts: number
  last_error: string | null
}

export async function enqueuePunch(p: Omit<QueuedPunch, 'synced' | 'attempts' | 'last_error'>) {
  const d = await db()
  await d.runAsync(
    `INSERT INTO punches (id, punch_type, created_at, latitude, longitude, accuracy, selfie_uri, device_info, synced, attempts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [p.id, p.punch_type, p.created_at, p.latitude, p.longitude, p.accuracy, p.selfie_uri, p.device_info]
  )
}

export async function pendingPunches(): Promise<QueuedPunch[]> {
  const d = await db()
  return d.getAllAsync<QueuedPunch>(
    `SELECT * FROM punches WHERE synced = 0 ORDER BY created_at ASC LIMIT 50`
  )
}

export async function markSynced(ids: string[]) {
  if (!ids.length) return
  const d = await db()
  const placeholders = ids.map(() => '?').join(',')
  await d.runAsync(`UPDATE punches SET synced = 1 WHERE id IN (${placeholders})`, ids)
}

export async function bumpAttempt(id: string, error?: string) {
  const d = await db()
  await d.runAsync(
    `UPDATE punches SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
    [error ?? null, id]
  )
}

export async function pendingCount(): Promise<number> {
  const d = await db()
  const row = await d.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM punches WHERE synced = 0`)
  return row?.n ?? 0
}

export async function clearSynced(olderThanDays = 30) {
  const d = await db()
  await d.runAsync(
    `DELETE FROM punches WHERE synced = 1 AND date(created_at) < date('now', ?)`,
    [`-${olderThanDays} days`]
  )
}
