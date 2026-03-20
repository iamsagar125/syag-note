/**
 * Sync Change Watcher — Detects remote changes via fs.watch + polling fallback.
 *
 * Watches the iCloud container directory for changes to other devices' JSONL files.
 * Debounces rapid iCloud sync bursts (500ms). Falls back to 60s polling in case
 * fs.watch misses events (known macOS issue with network-backed filesystems).
 *
 * Optimizations:
 * - Reads JSONL from byte cursor (not full file) via openSync + readSync
 * - Skips read entirely if file size unchanged (statSync check)
 * - Caches remote device file list (re-scans only on new file detection)
 */

import { watch, readdirSync, existsSync, writeFileSync, readFileSync, openSync, readSync, closeSync, statSync, FSWatcher } from 'fs'
import { join } from 'path'
import type { SyncChangeRecord } from './sync-types'

const DEBOUNCE_MS = 500
const POLL_INTERVAL_MS = 60_000
const CURSORS_FILE = 'sync-cursors.json'

export class SyncChangeWatcher {
  private fsWatcher: FSWatcher | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private cursors: Record<string, number> = {} // deviceId -> byte offset
  private cursorsPath: string
  /** Cached list of remote device JSONL filenames (invalidated on new file detection) */
  private cachedRemoteFiles: string[] | null = null

  constructor(
    private containerPath: string,
    private localDeviceId: string,
    private onChanges: (records: SyncChangeRecord[]) => void,
  ) {
    // Cursors stored locally (not in iCloud) to track read positions
    this.cursorsPath = join(containerPath, '..', CURSORS_FILE)
    this.loadCursors()
  }

  start(): void {
    // fs.watch on the iCloud container directory
    try {
      this.fsWatcher = watch(this.containerPath, { persistent: false }, (_eventType, filename) => {
        if (filename && filename.startsWith('changes-') && filename.endsWith('.jsonl')) {
          // Skip our own device's change file
          const remoteDeviceId = filename.replace('changes-', '').replace('.jsonl', '')
          if (remoteDeviceId === this.localDeviceId) return
          // Invalidate cached file list if this is a new device file
          if (this.cachedRemoteFiles && !this.cachedRemoteFiles.includes(filename)) {
            this.cachedRemoteFiles = null
          }
          this.debounceCheck()
        }
      })
    } catch (err) {
      console.warn('[sync-watcher] fs.watch failed, relying on polling:', err)
    }

    // Polling fallback — catches anything fs.watch misses
    this.pollTimer = setInterval(() => this.checkForChanges(), POLL_INTERVAL_MS)

    // Initial check on start
    this.checkForChanges()
  }

  stop(): void {
    if (this.fsWatcher) {
      this.fsWatcher.close()
      this.fsWatcher = null
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.saveCursors()
  }

  /** Force an immediate check (e.g. on app focus) */
  forceCheck(): void {
    this.checkForChanges()
  }

  private debounceCheck(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => this.checkForChanges(), DEBOUNCE_MS)
  }

  /** Get remote device JSONL files, using cache when available */
  private getRemoteFiles(): string[] {
    if (this.cachedRemoteFiles) return this.cachedRemoteFiles
    this.cachedRemoteFiles = readdirSync(this.containerPath)
      .filter(f => f.startsWith('changes-') && f.endsWith('.jsonl'))
      .filter(f => {
        const deviceId = f.replace('changes-', '').replace('.jsonl', '')
        return deviceId !== this.localDeviceId
      })
    return this.cachedRemoteFiles
  }

  private checkForChanges(): void {
    if (!existsSync(this.containerPath)) return

    const files = this.getRemoteFiles()
    const allNewRecords: SyncChangeRecord[] = []

    for (const file of files) {
      const deviceId = file.replace('changes-', '').replace('.jsonl', '')
      const filePath = join(this.containerPath, file)

      if (!existsSync(filePath)) continue

      const cursor = this.cursors[deviceId] ?? 0

      // Check file size first — skip read entirely if unchanged
      let fileSize: number
      try {
        fileSize = statSync(filePath).size
      } catch {
        continue
      }
      if (fileSize <= cursor) continue

      // Read only new bytes past the cursor position
      const bytesToRead = fileSize - cursor
      const buffer = Buffer.alloc(bytesToRead)
      let fd: number | null = null
      let newContent: string
      try {
        fd = openSync(filePath, 'r')
        readSync(fd, buffer, 0, bytesToRead, cursor)
        newContent = buffer.toString('utf-8')
      } catch (err) {
        console.warn(`[sync-watcher] Failed to read ${file} from cursor:`, err)
        continue
      } finally {
        if (fd !== null) closeSync(fd)
      }

      if (!newContent.trim()) continue

      const lines = newContent.trim().split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const record = JSON.parse(line) as SyncChangeRecord
          allNewRecords.push(record)
        } catch (err) {
          console.warn(`[sync-watcher] Failed to parse change record from ${file}:`, err)
        }
      }

      // Update cursor to end of file
      this.cursors[deviceId] = fileSize
    }

    if (allNewRecords.length > 0) {
      // Sort by timestamp for consistent replay order
      allNewRecords.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      this.saveCursors()
      this.onChanges(allNewRecords)
    }
  }

  private loadCursors(): void {
    if (!existsSync(this.cursorsPath)) return
    try {
      this.cursors = JSON.parse(readFileSync(this.cursorsPath, 'utf-8'))
    } catch {
      this.cursors = {}
    }
  }

  private saveCursors(): void {
    try {
      writeFileSync(this.cursorsPath, JSON.stringify(this.cursors, null, 2))
    } catch (err) {
      console.warn('[sync-watcher] Failed to save cursors:', err)
    }
  }
}
