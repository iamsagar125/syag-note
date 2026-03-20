/**
 * Sync Change Logger — Appends JSONL change records to a device-specific file in iCloud.
 *
 * Each device writes to its own file (changes-{deviceId}.jsonl) to avoid write conflicts.
 * Records use full-row payloads for simplicity and LWW conflict resolution.
 *
 * Optimization: Buffers records in memory and flushes to disk every 2 seconds
 * (or on explicit flush/shutdown), avoiding synchronous I/O on every DB mutation.
 */

import { appendFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { SyncChangeRecord, SyncableTable } from './sync-types'
import { LOCAL_ONLY_SETTINGS } from './sync-types'

const FLUSH_INTERVAL_MS = 2_000

export class SyncChangeLogger {
  private logPath: string
  private diskLineCount = 0
  private buffer: string[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private containerPath: string,
    private deviceId: string,
    private schemaVersion: number,
  ) {
    this.logPath = join(containerPath, `changes-${deviceId}.jsonl`)

    // Count existing lines for pending count
    if (existsSync(this.logPath)) {
      const content = readFileSync(this.logPath, 'utf-8').trim()
      this.diskLineCount = content ? content.split('\n').length : 0
    }

    // Periodic flush timer
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS)
  }

  logChange(
    table: SyncableTable,
    operation: SyncChangeRecord['operation'],
    entityId: string,
    data: Record<string, any> | null,
  ): void {
    // Skip settings that should not sync
    if (table === 'settings' && data?.key && LOCAL_ONLY_SETTINGS.has(data.key)) {
      return
    }

    const record: SyncChangeRecord = {
      id: randomUUID(),
      deviceId: this.deviceId,
      timestamp: new Date().toISOString(),
      table,
      operation,
      entityId,
      data,
      schemaVersion: this.schemaVersion,
      protocolVersion: 1,
    }

    this.buffer.push(JSON.stringify(record))
  }

  /** Flush buffered records to disk. Call on shutdown or when immediate persistence is needed. */
  flush(): void {
    if (this.buffer.length === 0) return
    const lines = this.buffer.join('\n') + '\n'
    this.diskLineCount += this.buffer.length
    this.buffer = []
    appendFileSync(this.logPath, lines)
  }

  /** Stop the flush timer and write remaining records. */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flush()
  }

  getPendingCount(): number {
    return this.diskLineCount + this.buffer.length
  }

  getLogPath(): string {
    return this.logPath
  }
}
