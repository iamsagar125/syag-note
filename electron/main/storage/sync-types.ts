/**
 * iCloud Drive Sync — Type Definitions
 *
 * Protocol Version 1: iOS-compatible, transport-agnostic sync format.
 * Change records use full-row payloads (not diffs) with LWW conflict resolution.
 */

export interface SyncChangeRecord {
  /** UUID for dedup */
  id: string
  /** Hash of hostname + serial — deterministic per machine */
  deviceId: string
  /** ISO 8601 timestamp */
  timestamp: string
  /** Table name: notes, folders, people, commitments, topics, note_people, note_topics */
  table: SyncableTable
  /** Mutation type */
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  /** Primary key of the affected row */
  entityId: string
  /** Full row data for INSERT/UPDATE; null for DELETE */
  data: Record<string, any> | null
  /** DB schema version — replayer skips records with a higher version */
  schemaVersion: number
  /** Sync protocol version — bump on breaking format changes */
  protocolVersion: 1
}

/** Tables that participate in cross-device sync */
export type SyncableTable =
  | 'notes'
  | 'folders'
  | 'people'
  | 'note_people'
  | 'note_topics'
  | 'commitments'
  | 'topics'
  | 'settings'

/** Tables excluded from sync (device-local data) */
export type LocalOnlyTable =
  | 'kb_chunks'
  | 'local_calendar_blocks'
  | 'schema_version'

/** Settings keys that should NOT sync (device-local paths/services) */
export const LOCAL_ONLY_SETTINGS = new Set([
  'api-enabled',
  'api-token',
  'kb-folder-path',
  'obsidian-vault-path',
  'icloud-sync-enabled',     // sync toggle is device-local
  'sync-device-id',
  'microphone-device-id',
])

export interface SyncStatus {
  enabled: boolean
  icloudAvailable: boolean
  lastSyncAt: string | null
  deviceCount: number
  pendingChanges: number
  state: 'synced' | 'syncing' | 'offline' | 'error' | 'disabled'
  error?: string
}

export interface SyncManifest {
  protocolVersion: 1
  schemaVersion: number
  devices: SyncDeviceEntry[]
  createdAt: string
  updatedAt: string
}

export interface SyncDeviceEntry {
  deviceId: string
  deviceName: string
  platform: 'macos' | 'ios' | 'ipados'
  firstSeen: string
  lastSeen: string
}

/**
 * Transport abstraction — iCloud files for v1, HTTP API for future team sync.
 */
export interface SyncTransport {
  /** Write a change record to the sync store */
  writeChange(record: SyncChangeRecord): Promise<void>
  /** Watch for remote changes; returns unsubscribe function */
  watchRemoteChanges(callback: (records: SyncChangeRecord[]) => void): () => void
  /** Write a full DB snapshot for bootstrapping new devices */
  writeSnapshot(dbPath: string): Promise<void>
  /** Get path to the most recent snapshot, or null if none exists */
  readLatestSnapshot(): Promise<string | null>
  /** Read the current manifest */
  readManifest(): Promise<SyncManifest | null>
  /** Update the manifest (e.g. register this device) */
  writeManifest(manifest: SyncManifest): Promise<void>
}

export interface ReplayResult {
  applied: number
  skipped: number
  conflicts: number
  errors: string[]
}
