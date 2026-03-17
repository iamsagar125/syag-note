import { randomUUID } from 'crypto'
import { getDb } from '../storage/database'

export function upsertTopic(label: string): any {
  const db = getDb()
  const now = new Date().toISOString()
  const normalized = label.trim()

  // Check for existing topic (case-insensitive)
  const existing = db.prepare('SELECT * FROM topics WHERE LOWER(label) = LOWER(?)').get(normalized) as any
  if (existing) {
    db.prepare('UPDATE topics SET last_seen = ? WHERE id = ?').run(now, existing.id)
    return getTopic(existing.id)
  }

  const id = randomUUID()
  db.prepare('INSERT INTO topics (id, label, first_seen, last_seen) VALUES (?, ?, ?, ?)').run(id, normalized, now, now)
  return getTopic(id)
}

export function getTopic(id: string): any | null {
  return getDb().prepare('SELECT * FROM topics WHERE id = ?').get(id) as any ?? null
}

export function getAllTopics(): any[] {
  return getDb().prepare('SELECT * FROM topics ORDER BY last_seen DESC').all() as any[]
}

export function linkTopicToNote(noteId: string, topicId: string): void {
  getDb().prepare('INSERT OR IGNORE INTO note_topics (note_id, topic_id) VALUES (?, ?)').run(noteId, topicId)
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
  return (result as any).changes > 0
}

export function updateTopicLabel(id: string, label: string): boolean {
  getDb().prepare('UPDATE topics SET label = ? WHERE id = ?').run(label.trim(), id)
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
