'use client'

import type { Note, NoteChange, ConflictStrategy, SyncStatus } from '@/types/notes'
import { NoteManager } from './NoteManager'
import { OfflineStorage } from './OfflineStorage'

export class SyncManager {
  private status: SyncStatus = {
    status: 'idle',
    pendingChanges: 0,
  }

  constructor(
    private noteManager: NoteManager,
    private offlineStorage: OfflineStorage
  ) {}

  private async handleConflict(
    localNote: Note,
    serverNote: Note,
    strategy: ConflictStrategy
  ): Promise<Note> {
    switch (strategy) {
      case 'client':
        return localNote
      case 'server':
        return serverNote
      case 'manual':
        // For now, default to server version
        // TODO: Implement UI for manual conflict resolution
        return serverNote
      default:
        return serverNote
    }
  }

  async sync(): Promise<void> {
    try {
      this.status = {
        status: 'syncing',
        lastSynced: new Date(),
        pendingChanges: 0,
      }

      // Get all pending changes
      const changes = await this.offlineStorage.getPendingChanges()
      this.status.pendingChanges = changes.length

      // Process each change
      for (const change of changes) {
        try {
          switch (change.type) {
            case 'create':
              await this.noteManager.createNote(change.note)
              break

            case 'update':
              // Check for conflicts
              const serverNote = await this.noteManager.getNotes()
                .then(notes => notes.find(n => n.id === change.note.id))

              if (serverNote && serverNote.version! > change.note.version!) {
                // Handle conflict
                const resolvedNote = await this.handleConflict(
                  change.note,
                  serverNote,
                  'server'
                )
                await this.noteManager.updateNote(resolvedNote)
              } else {
                await this.noteManager.updateNote(change.note)
              }
              break

            case 'delete':
              if (change.note.id) {
                await this.noteManager.deleteNote(change.note.id)
              }
              break
          }

          // Update local note status
          if (change.note.id) {
            await this.offlineStorage.updateSyncStatus(change.note.id, 'synced')
          }
        } catch (error) {
          console.error(`Failed to sync change:`, error)
          if (change.note.id) {
            await this.offlineStorage.updateSyncStatus(change.note.id, 'conflict')
          }
        }
      }

      // Clear processed changes
      await this.offlineStorage.clearPendingChanges()

      this.status = {
        status: 'idle',
        lastSynced: new Date(),
        pendingChanges: 0,
      }
    } catch (error) {
      this.status = {
        status: 'error',
        lastSynced: this.status.lastSynced,
        pendingChanges: this.status.pendingChanges,
        error: error instanceof Error ? error.message : 'Unknown error during sync',
      }
      throw error
    }
  }

  async queueChange(change: Omit<NoteChange, 'timestamp'>): Promise<void> {
    await this.offlineStorage.queueChange({
      ...change,
      timestamp: Date.now(),
    })
    
    // Update status
    const pendingChanges = await this.offlineStorage.getPendingChanges()
    this.status.pendingChanges = pendingChanges.length
  }

  getSyncStatus(): SyncStatus {
    return this.status
  }

  async resolveConflict(note: Note, strategy: ConflictStrategy): Promise<Note> {
    const serverNote = await this.noteManager.getNotes()
      .then(notes => notes.find(n => n.id === note.id))

    if (!serverNote) {
      throw new Error('Server note not found')
    }

    const resolvedNote = await this.handleConflict(note, serverNote, strategy)
    await this.noteManager.updateNote(resolvedNote)
    
    if (note.id) {
      await this.offlineStorage.updateSyncStatus(note.id, 'synced')
    }

    return resolvedNote
  }
} 