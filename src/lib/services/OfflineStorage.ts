'use client'

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Note, NoteChange } from '@/types/notes'

interface NotesDB extends DBSchema {
  notes: {
    key: string
    value: Note
    indexes: {
      'by-created': string
      'by-sync-status': string
    }
  }
  changes: {
    key: number
    value: NoteChange
    indexes: {
      'by-timestamp': number
    }
  }
}

export class OfflineStorage {
  private db: IDBPDatabase<NotesDB> | null = null
  private readonly DB_NAME = 'notes-app'
  private readonly VERSION = 1

  private async getDB() {
    if (!this.db) {
      this.db = await openDB<NotesDB>(this.DB_NAME, this.VERSION, {
        upgrade(db) {
          // Create notes store
          const notesStore = db.createObjectStore('notes', {
            keyPath: 'id',
          })
          notesStore.createIndex('by-created', 'created_at')
          notesStore.createIndex('by-sync-status', 'sync_status')

          // Create changes store
          const changesStore = db.createObjectStore('changes', {
            keyPath: 'timestamp',
          })
          changesStore.createIndex('by-timestamp', 'timestamp')
        },
      })
    }
    return this.db
  }

  async saveNote(note: Note): Promise<void> {
    const db = await this.getDB()
    await db.put('notes', {
      ...note,
      sync_status: note.sync_status || 'pending',
    })
  }

  async getLocalNotes(): Promise<Note[]> {
    const db = await this.getDB()
    return db.getAllFromIndex('notes', 'by-created')
  }

  async getPendingNotes(): Promise<Note[]> {
    const db = await this.getDB()
    return db.getAllFromIndex('notes', 'by-sync-status', 'pending')
  }

  async queueChange(change: NoteChange): Promise<void> {
    const db = await this.getDB()
    await db.add('changes', {
      ...change,
      timestamp: Date.now(),
    })
  }

  async getPendingChanges(): Promise<NoteChange[]> {
    const db = await this.getDB()
    return db.getAllFromIndex('changes', 'by-timestamp')
  }

  async clearPendingChanges(): Promise<void> {
    const db = await this.getDB()
    await db.clear('changes')
  }

  async clearStorage(): Promise<void> {
    const db = await this.getDB()
    await db.clear('notes')
    await db.clear('changes')
  }

  async updateSyncStatus(noteId: string, status: Note['sync_status']): Promise<void> {
    const db = await this.getDB()
    const note = await db.get('notes', noteId)
    if (note) {
      await db.put('notes', { ...note, sync_status: status })
    }
  }
} 