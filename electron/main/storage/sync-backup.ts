/**
 * Auto-backup before sync migration — safety net against data loss.
 * Keeps the 3 most recent backups, deletes older ones.
 */

import { copyFileSync, readdirSync, unlinkSync, existsSync } from 'fs'
import { join, basename } from 'path'

const MAX_BACKUPS = 3
const BACKUP_PREFIX = 'syag.db.backup-'

export function createBackup(dbPath: string): string {
  if (!existsSync(dbPath)) {
    throw new Error(`Database not found at ${dbPath}`)
  }

  const dir = join(dbPath, '..')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupName = `${BACKUP_PREFIX}${timestamp}`
  const backupPath = join(dir, backupName)

  copyFileSync(dbPath, backupPath)

  // Also back up WAL and SHM sidecar files if they exist
  const walPath = dbPath + '-wal'
  const shmPath = dbPath + '-shm'
  if (existsSync(walPath)) copyFileSync(walPath, backupPath + '-wal')
  if (existsSync(shmPath)) copyFileSync(shmPath, backupPath + '-shm')

  pruneOldBackups(dir)

  console.log(`[sync-backup] Created backup: ${backupName}`)
  return backupPath
}

export function listBackups(dbDir: string): string[] {
  if (!existsSync(dbDir)) return []
  return readdirSync(dbDir)
    .filter(f => f.startsWith(BACKUP_PREFIX) && !f.endsWith('-wal') && !f.endsWith('-shm'))
    .sort()
    .reverse() // newest first
}

export function restoreBackup(backupPath: string, dbPath: string): void {
  if (!existsSync(backupPath)) {
    throw new Error(`Backup not found at ${backupPath}`)
  }
  copyFileSync(backupPath, dbPath)

  // Restore WAL/SHM if they exist, otherwise remove stale sidecars
  const walBackup = backupPath + '-wal'
  const shmBackup = backupPath + '-shm'
  const walPath = dbPath + '-wal'
  const shmPath = dbPath + '-shm'

  if (existsSync(walBackup)) {
    copyFileSync(walBackup, walPath)
  } else if (existsSync(walPath)) {
    unlinkSync(walPath)
  }

  if (existsSync(shmBackup)) {
    copyFileSync(shmBackup, shmPath)
  } else if (existsSync(shmPath)) {
    unlinkSync(shmPath)
  }

  console.log(`[sync-backup] Restored from: ${basename(backupPath)}`)
}

function pruneOldBackups(dir: string): void {
  const backups = listBackups(dir)
  if (backups.length <= MAX_BACKUPS) return

  for (const old of backups.slice(MAX_BACKUPS)) {
    const fullPath = join(dir, old)
    try {
      unlinkSync(fullPath)
      // Clean up sidecars too
      if (existsSync(fullPath + '-wal')) unlinkSync(fullPath + '-wal')
      if (existsSync(fullPath + '-shm')) unlinkSync(fullPath + '-shm')
    } catch (err) {
      console.warn(`[sync-backup] Failed to prune ${old}:`, err)
    }
  }
}
