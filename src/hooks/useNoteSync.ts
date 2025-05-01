'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Note, SyncStatus } from '@/types/notes'
import { NoteManager } from '@/lib/services/NoteManager'
import { OfflineStorage } from '@/lib/services/OfflineStorage'
import { SyncManager } from '@/lib/services/SyncManager'

// Initialize services
const noteManager = new NoteManager()
const offlineStorage = new OfflineStorage()
const syncManager = new SyncManager(noteManager, offlineStorage)

export function useNoteSync() {
  const queryClient = useQueryClient()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getSyncStatus())

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      try {
        // Try to get notes from Supabase
        const notes = await noteManager.getNotes()
        // Store notes locally
        await Promise.all(notes.map(note => offlineStorage.saveNote(note)))
        return notes
      } catch (fetchError) {
        // If offline, get notes from local storage
        console.warn('Failed to fetch from server, using local notes:', fetchError)
        return offlineStorage.getLocalNotes()
      }
    },
  })

  // Create note mutation
  const createNote = useMutation({
    mutationFn: async (note: Omit<Note, 'id'>) => {
      try {
        // Try to create note in Supabase
        const newNote = await noteManager.createNote(note)
        // Store note locally
        await offlineStorage.saveNote(newNote)
        return newNote
      } catch (createError) {
        // If offline, store locally and queue for sync
        const tempNote = {
          ...note,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          sync_status: 'pending' as const,
        }
        await offlineStorage.saveNote(tempNote)
        await syncManager.queueChange({
          type: 'create',
          note: tempNote
        })
        return tempNote
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  // Update note mutation
  const updateNote = useMutation({
    mutationFn: async (note: Note) => {
      try {
        // Try to update note in Supabase
        const updatedNote = await noteManager.updateNote(note)
        // Update note locally
        await offlineStorage.saveNote(updatedNote)
        return updatedNote
      } catch (error) {
        // If offline, update locally and queue for sync
        const pendingNote = {
          ...note,
          sync_status: 'pending' as const,
          updated_at: new Date().toISOString(),
        }
        await offlineStorage.saveNote(pendingNote)
        await syncManager.queueChange({
          type: 'update',
          note: pendingNote,
        })
        return pendingNote
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  // Delete note mutation
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      try {
        // Try to delete note from Supabase
        await noteManager.deleteNote(noteId)
        // Remove note locally
        await offlineStorage.clearStorage()
      } catch (error) {
        // If offline, queue for deletion
        const note = notes.find(n => n.id === noteId)
        if (note) {
          await syncManager.queueChange({
            type: 'delete',
            note,
          })
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = noteManager.subscribeToNotes((updatedNotes) => {
      queryClient.setQueryData(['notes'], updatedNotes)
    })

    return () => {
      unsubscribe()
    }
  }, [queryClient])

  // Sync function
  const sync = useCallback(async () => {
    try {
      await syncManager.sync()
      setSyncStatus(syncManager.getSyncStatus())
      // Refresh notes after sync
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncStatus(syncManager.getSyncStatus())
    }
  }, [queryClient])

  // Auto-sync when online
  useEffect(() => {
    const handleOnline = () => {
      sync()
    }

    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [sync])

  return {
    notes,
    isLoading,
    syncStatus,
    createNote: createNote.mutateAsync,
    updateNote: updateNote.mutateAsync,
    deleteNote: deleteNote.mutateAsync,
    sync,
  }
} 