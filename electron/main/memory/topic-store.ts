import { randomUUID } from 'crypto'
import { getDb } from '../storage/database'
import { isSyncEnabled, getChangeLogger } from '../storage/icloud-sync'

function logTopicSync(op: 'INSERT' | 'UPDATE' | 'DELETE', id: string, data: Record<string, any> | null): void {
  if (!isSyncEnabled()) return
  getChangeLogger()?.logChange('topics', op, id, data)
}

function logNoteTopicSync(op: 'INSERT' | 'DELETE', noteId: string, topicId: string, data: Record<string, any> | null): void {
  if (!isSyncEnabled()) return
  getChangeLogger()?.logChange('note_topics', op, `${noteId}::${topicId}`, data)
}

export function upsertTopic(label: string): any {
  const db = getDb()
  const now = new Date().toISOString()
  const normalized = label.trim()

  // Check for existing topic (case-insensitive)
  const existing = db.prepare('SELECT * FROM topics WHERE LOWER(label) = LOWER(?)').get(normalized) as any
  if (existing) {
    db.prepare('UPDATE topics SET last_seen = ? WHERE id = ?').run(now, existing.id)
    const updated = getTopic(existing.id)
    if (updated) logTopicSync('UPDATE', existing.id, updated)
    return updated
  }

  const id = randomUUID()
  db.prepare('INSERT INTO topics (id, label, first_seen, last_seen) VALUES (?, ?, ?, ?)').run(id, normalized, now, now)
  const created = getTopic(id)
  if (created) logTopicSync('INSERT', id, created)
  return created
}

export function getTopic(id: string): any | null {
  return getDb().prepare('SELECT * FROM topics WHERE id = ?').get(id) as any ?? null
}

export function getAllTopics(): any[] {
  return getDb().prepare('SELECT * FROM topics ORDER BY last_seen DESC').all() as any[]
}

export function linkTopicToNote(noteId: string, topicId: string): void {
  getDb().prepare('INSERT OR IGNORE INTO note_topics (note_id, topic_id) VALUES (?, ?)').run(noteId, topicId)
  logNoteTopicSync('INSERT', noteId, topicId, { note_id: noteId, topic_id: topicId })
}

export function getNoteTopics(noteId: string): any[] {
  return getDb().prepare(`
    SELECT t.*
    FROM topics t
    JOIN note_topics nt ON nt.topic_id = t.id
    WHERE nt.note_id = ?
  `).all(noteId) as any[]
}

export function unlinkTopicFromNote(noteId: string, topicId: string): boolean {
  const result = getDb().prepare('DELETE FROM note_topics WHERE note_id = ? AND topic_id = ?').run(noteId, topicId)
  if ((result as any).changes > 0) logNoteTopicSync('DELETE', noteId, topicId, null)
  return (result as any).changes > 0
}

export function updateTopicLabel(id: string, label: string): boolean {
  getDb().prepare('UPDATE topics SET label = ? WHERE id = ?').run(label.trim(), id)
  const updated = getTopic(id)
  if (updated) logTopicSync('UPDATE', id, updated)
  return true
}

export function getTopicMeetings(topicId: string): any[] {
  return getDb().prepare(`
    SELECT n.id, n.title, n.date, n.time, n.duration, n.time_range
    FROM notes n
    JOIN note_topics nt ON nt.note_id = n.id
    WHERE nt.topic_id = ?
    ORDER BY n.date DESC, n.time DESC
  `).all(topicId) as any[]
}
