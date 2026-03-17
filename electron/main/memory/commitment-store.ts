import { randomUUID } from 'crypto'
import { getDb } from '../storage/database'

export function getAllCommitments(filters?: { status?: string; assigneeId?: string }): any[] {
  let sql = 'SELECT * FROM commitments'
  const conditions: string[] = []
  const values: any[] = []

  if (filters?.status) {
    conditions.push('status = ?')
    values.push(filters.status)
  }
  if (filters?.assigneeId) {
    conditions.push('assignee_id = ?')
    values.push(filters.assigneeId)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  sql += ' ORDER BY created_at DESC'

  return getDb().prepare(sql).all(...values) as any[]
}

export function getCommitment(id: string): any | null {
  return getDb().prepare('SELECT * FROM commitments WHERE id = ?').get(id) as any ?? null
}

export function getCommitmentsForNote(noteId: string): any[] {
  return getDb().prepare('SELECT * FROM commitments WHERE note_id = ? ORDER BY created_at ASC').all(noteId) as any[]
}

export function getOpenCommitments(): any[] {
  return getDb().prepare(`
    SELECT c.*, p.name as assignee_name
    FROM commitments c
    LEFT JOIN people p ON p.id = c.assignee_id
    WHERE c.status = 'open'
    ORDER BY
      CASE WHEN c.due_date IS NULL THEN 1 ELSE 0 END,
      c.due_date ASC,
      c.created_at ASC
  `).all() as any[]
}

export function addCommitment(data: {
  noteId?: string
  text: string
  owner?: string
  assigneeId?: string
  dueDate?: string
  jiraIssueKey?: string
  jiraIssueUrl?: string
}): any {
  const id = randomUUID()
  const now = new Date().toISOString()
  getDb().prepare(`
    INSERT INTO commitments (id, note_id, text, owner, assignee_id, due_date, jira_issue_key, jira_issue_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(
    id,
    data.noteId ?? null,
    data.text,
    data.owner ?? 'you',
    data.assigneeId ?? null,
    data.dueDate ?? null,
    data.jiraIssueKey ?? null,
    data.jiraIssueUrl ?? null,
    now,
    now
  )
  return getCommitment(id)
}

export function updateCommitmentStatus(id: string, status: 'open' | 'completed' | 'overdue' | 'cancelled'): boolean {
  const completedAt = status === 'completed' ? new Date().toISOString() : null
  const now = new Date().toISOString()
  getDb().prepare(`
    UPDATE commitments SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?
  `).run(status, completedAt, now, id)
  return true
}

export function updateCommitment(id: string, data: any): boolean {
  const fields: string[] = []
  const values: any[] = []

  if (data.text !== undefined) { fields.push('text = ?'); values.push(data.text) }
  if (data.owner !== undefined) { fields.push('owner = ?'); values.push(data.owner) }
  if (data.assigneeId !== undefined) { fields.push('assignee_id = ?'); values.push(data.assigneeId) }
  if (data.dueDate !== undefined) { fields.push('due_date = ?'); values.push(data.dueDate) }
  if (data.status !== undefined) {
    fields.push('status = ?'); values.push(data.status)
    if (data.status === 'completed') {
      fields.push('completed_at = ?'); values.push(new Date().toISOString())
    }
  }
  if (data.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(data.completedAt) }
  if (data.jiraIssueKey !== undefined) { fields.push('jira_issue_key = ?'); values.push(data.jiraIssueKey) }
  if (data.jiraIssueUrl !== undefined) { fields.push('jira_issue_url = ?'); values.push(data.jiraIssueUrl) }
  if (data.noteId !== undefined) { fields.push('note_id = ?'); values.push(data.noteId) }

  if (fields.length === 0) return false

  fields.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  getDb().prepare(`UPDATE commitments SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return true
}

export function markOverdueCommitments(): void {
  const now = new Date().toISOString()
  getDb().prepare(`
    UPDATE commitments SET status = 'overdue', updated_at = ?
    WHERE status = 'open' AND due_date < date('now')
  `).run(now)
}
