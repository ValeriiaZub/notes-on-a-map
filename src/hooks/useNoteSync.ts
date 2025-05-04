'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Note, SyncStatus } from '@/types/notes'
import { NoteManager } from '@/lib/services/NoteManager'
import { OfflineStorage } from '@/lib/services/OfflineStorage'
import { SyncManager } from '@/lib/services/SyncManager'
import { createClient } from '@/lib/utils/supabase/client'

// Initialize services
const noteManager = new NoteManager()
const offlineStorage = new OfflineStorage()
const syncManager = new SyncManager(noteManager, offlineStorage)

export function useNoteSync(isAuthenticated: boolean) { // Accept isAuthenticated as an argument
  console.log('[useNoteSync] Initializing hook, isAuthenticated:', isAuthenticated);
  const queryClient = useQueryClient()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getSyncStatus())
  const supabase = createClient()

  // Fetch notes - only enable when authenticated
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    enabled: isAuthenticated, // Only run the query if the user is authenticated
    queryFn: async () => {
      console.log('[useNoteSync] Fetching notes, isAuthenticated:', isAuthenticated);
      // Since the query is only enabled when authenticated, noteManager.getNotes() should succeed
      // unless there's a network error or other issue.
      // The try/catch for auth errors is less critical here, but can be kept for network errors.
      try {
        // Get notes from Supabase
        console.log('[useNoteSync] Calling noteManager.getNotes()');
        const notes = await noteManager.getNotes()
        
        // Store notes locally
        console.log('[useNoteSync] Saving notes to local storage');
        await Promise.all(notes.map(note => offlineStorage.saveNote(note)))
        return notes
        // Unreachable code below - removing duplicate block
      } catch (fetchError) {
        // Handle potential network errors or other issues during fetch
        console.warn('[useNoteSync] Failed to fetch notes from server, trying local:', fetchError)
        // Fallback to local notes if server fetch fails despite being authenticated (e.g., offline)
        console.log('[useNoteSync] Falling back to local notes');
        const localNotes = await offlineStorage.getLocalNotes();
        console.log(`[useNoteSync] Retrieved ${localNotes.length} local notes`);
        return localNotes;
      }
    },
    // Add staleTime to prevent frequent refetching
    staleTime: 10000, // 10 seconds
    // Add refetchInterval to periodically check for updates
    // refetchInterval: 5000, // 5 seconds
    // Add retry to handle transient failures
    retry: 3,
    // Add refetchOnWindowFocus to update when the user returns to the app
    refetchOnWindowFocus: true,
  })

  // Create note mutation
  const createNote = useMutation({
    mutationFn: async (note: Omit<Note, 'id'>) => {
      console.log('[useNoteSync] Creating new note:', {
        content: note.content,
        lat: note.latitude,
        lng: note.longitude
      });
      try {
        // Try to create note in Supabase
        console.log('[useNoteSync] Attempting to create note in Supabase');
        const newNote = await noteManager.createNote(note)
        console.log('[useNoteSync] Note created successfully in Supabase:', {
          id: newNote.id,
          lat: newNote.latitude,
          lng: newNote.longitude
        });
        // Store note locally
        await offlineStorage.saveNote(newNote)
        return newNote
      } catch (createError) {
        console.warn('[useNoteSync] Failed to create note in Supabase:', createError);
        // If offline, store locally and queue for sync
        console.log('[useNoteSync] Creating offline note with coordinates:', {
          lat: note.latitude,
          lng: note.longitude
        });
        // Ensure lat/lng are explicitly included in the temporary offline note
        const tempNote: Note = {
          content: note.content,
          latitude: note.latitude, // Explicitly include latitude
          longitude: note.longitude, // Explicitly include longitude
          accuracy: note.accuracy, // Include accuracy if available
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(), // Add updated_at for consistency
          sync_status: 'pending' as const,
        };
        console.log('[useNoteSync] Created temporary note with ID:', tempNote.id);
        await offlineStorage.saveNote(tempNote)
        await syncManager.queueChange({
          type: 'create',
          note: tempNote
        })
        return tempNote
      }
    },
    onSuccess: (newNote) => {
      console.log('[useNoteSync] Note creation successful, invalidating queries');
      console.log('[useNoteSync] New note details:', {
        id: newNote.id,
        lat: newNote.latitude,
        lng: newNote.longitude
      });
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  // Update note mutation
  const updateNote = useMutation({
    mutationFn: async (note: Note) => {
      console.log('[useNoteSync] Updating note:', {
        id: note.id,
        content: note.content,
        lat: note.latitude,
        lng: note.longitude
      });
      try {
        // Try to update note in Supabase
        console.log('[useNoteSync] Attempting to update note in Supabase');
        const updatedNote = await noteManager.updateNote(note)
        console.log('[useNoteSync] Note updated successfully in Supabase:', {
          id: updatedNote.id,
          lat: updatedNote.latitude,
          lng: updatedNote.longitude
        });
        // Update note locally
        console.log('[useNoteSync] Saving updated note to local storage');
        await offlineStorage.saveNote(updatedNote)
        return updatedNote
      } catch (error) {
        console.warn('[useNoteSync] Failed to update note in Supabase:', error);
        // If offline, update locally and queue for sync
        console.log('[useNoteSync] Creating pending note for offline update');
        const pendingNote = {
          ...note,
          sync_status: 'pending' as const,
          updated_at: new Date().toISOString(),
        }
        console.log('[useNoteSync] Saving pending note to local storage');
        await offlineStorage.saveNote(pendingNote)
        console.log('[useNoteSync] Queueing note update for when back online');
        await syncManager.queueChange({
          type: 'update',
          note: pendingNote,
        })
        return pendingNote
      }
    },
    onSuccess: (updatedNote) => {
      console.log('[useNoteSync] Note update successful, invalidating queries');
      console.log('[useNoteSync] Updated note details:', {
        id: updatedNote.id,
        lat: updatedNote.latitude,
        lng: updatedNote.longitude
      });
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  // Delete note mutation
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      console.log('[useNoteSync] Deleting note with ID:', noteId);
      try {
        // Try to delete note from Supabase
        console.log('[useNoteSync] Attempting to delete note from Supabase');
        await noteManager.deleteNote(noteId)
        console.log('[useNoteSync] Note deleted from Supabase successfully');
        
        // Remove note locally - using the proper method now
        console.log('[useNoteSync] Deleting note from local storage');
        await offlineStorage.deleteNote(noteId);
      } catch (error) {
        console.warn('[useNoteSync] Failed to delete note from Supabase:', error);
        // If offline, queue for deletion
        console.log('[useNoteSync] Queueing note for deletion when back online');
        const note = notes.find(n => n.id === noteId)
        if (note) {
          await syncManager.queueChange({
            type: 'delete',
            note,
          })
          // Still delete locally even if we're offline
          await offlineStorage.deleteNote(noteId);
        } else {
          console.warn('[useNoteSync] Could not find note with ID:', noteId);
        }
      }
    },
    onSuccess: () => {
      console.log('[useNoteSync] Note deletion successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  // Function to add a temporary note for immediate UI feedback
  const addTemporaryNote = useCallback((latitude: number, longitude: number) => {
    console.log('[useNoteSync] Adding temporary note at:', { latitude, longitude });
    const tempId = `temp-${crypto.randomUUID()}`; // Use a prefix for clarity
    const now = new Date().toISOString();
    const tempNote: Note = {
      id: tempId,
      content: '', // Start with empty content
      latitude,
      longitude,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
      startInEditMode: true, // Set the flag
    };

    console.log('[useNoteSync] Created temporary note object:', tempNote);

    // Optimistically update the local cache
    queryClient.setQueryData<Note[]>(['notes'], (oldNotes = []) => {
      console.log('[useNoteSync] Optimistically adding temporary note to cache');
      return [...oldNotes, tempNote];
    });

    // Optionally, you could return the tempId or tempNote if needed
    return tempNote;

  }, [queryClient]);


  // // Sync function
  // const sync = useCallback(async () => {
  //   try {
  //     await syncManager.sync()
  //     setSyncStatus(syncManager.getSyncStatus())
  //     // Refresh notes after sync
  //     queryClient.invalidateQueries({ queryKey: ['notes'] })
  //   } catch (error) {
  //     console.error('Sync failed:', error)
  //     setSyncStatus(syncManager.getSyncStatus())
  //   }
  // }, [queryClient])

  // // Auto-sync when online
  // useEffect(() => {
  //   const handleOnline = () => {
  //     sync()
  //   }

  //   window.addEventListener('online', handleOnline)
  //   return () => {
  //     window.removeEventListener('online', handleOnline)
  //   }
  // }, [sync])

  return {
    notes,
    isLoading,
    syncStatus,
    createNote: createNote.mutateAsync,
    updateNote: updateNote.mutateAsync,
    deleteNote: deleteNote.mutateAsync,
    addTemporaryNote, // Expose the new function
    // sync,
  }
}